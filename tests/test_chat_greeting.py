import json
import sys
import time
from pathlib import Path
from typing import Any, Dict

import httpx
import pytest
from fastapi.testclient import TestClient

# Ensure project root is on sys.path so that `import service` works
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from service.deps import get_http_client, get_redis  # noqa: E402
from service.models import LogicalModel, ModelCapability, PhysicalModel, ProviderConfig  # noqa: E402
from service.routes import create_app  # noqa: E402
from service.storage.redis_service import LOGICAL_MODEL_KEY_TEMPLATE  # noqa: E402


class FakeRedis:
    """
    Minimal async Redis replacement used for tests.
    Supports the subset of commands used by the app.
    """

    def __init__(self) -> None:
        self._data: Dict[str, Any] = {}

    async def get(self, key: str):
        return self._data.get(key)

    async def set(self, key: str, value: str, ex: int | None = None):
        self._data[key] = value

    async def lpush(self, key: str, value: str):
        lst = self._data.setdefault(key, [])
        if not isinstance(lst, list):
            lst = []
        lst.insert(0, value)
        self._data[key] = lst

    async def ltrim(self, key: str, start: int, end: int):
        lst = self._data.get(key, [])
        if not isinstance(lst, list):
            return
        if end == -1:
            slice_end = None
        else:
            slice_end = end + 1
        self._data[key] = lst[start:slice_end]

    async def lrange(self, key: str, start: int, end: int):
        lst = self._data.get(key, [])
        if not isinstance(lst, list):
            return []
        if end == -1:
            slice_end = None
        else:
            slice_end = end + 1
        return lst[start:slice_end]


fake_redis = FakeRedis()


def _seed_named_logical_model(
    logical_id: str,
    *,
    endpoint_path: str = "/v1/chat/completions",
) -> None:
    logical = LogicalModel(
        logical_id=logical_id,
        display_name=f"{logical_id} Display",
        description=f"Logical model for {logical_id}",
        capabilities=[ModelCapability.CHAT],
        upstreams=[
            PhysicalModel(
                provider_id="mock",
                model_id=logical_id,
                endpoint=f"https://mock.local{endpoint_path}",
                base_weight=1.0,
                region="global",
                max_qps=50,
                meta_hash=None,
                updated_at=time.time(),
            )
        ],
        enabled=True,
        updated_at=time.time(),
    )
    key = LOGICAL_MODEL_KEY_TEMPLATE.format(logical_model=logical.logical_id)
    fake_redis._data[key] = json.dumps(logical.model_dump(), ensure_ascii=False)


def _mock_send(request: httpx.Request) -> httpx.Response:
    """
    Mock transport handler that emulates an upstream LLM API for tests.
    """
    path = request.url.path

    if path.endswith("/v1/models") and request.method == "GET":
        # Return a simple OpenAI-style model list that includes "test-model".
        data = {
            "object": "list",
            "data": [
                {"id": "test-model", "object": "model"},
            ],
        }
        return httpx.Response(200, json=data)

    if path.endswith("/v1/chat/completions") and request.method == "POST":
        body = json.loads(request.content.decode("utf-8"))
        user_messages = [
            m["content"]
            for m in body.get("messages", [])
            if isinstance(m, dict) and m.get("role") == "user"
        ]
        # A simple echo-style response for testing.
        reply = f"你好！你刚才说: {user_messages[-1]}" if user_messages else "你好！"

        data = {
            "id": "cmpl-test",
            "object": "chat.completion",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": reply},
                    "finish_reason": "stop",
                }
            ],
        }
        return httpx.Response(200, json=data)

    if path.endswith("/v1/responses") and request.method == "POST":
        body = json.loads(request.content.decode("utf-8"))
        instructions = body.get("instructions") or ""
        input_value = body.get("input")
        user_text = ""
        if isinstance(input_value, list):
            segments: list[str] = []
            for item in input_value:
                if not isinstance(item, dict):
                    continue
                content = item.get("content")
                if isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and isinstance(part.get("text"), str):
                            segments.append(part["text"])
                elif isinstance(content, str):
                    segments.append(content)
            user_text = "".join(segments)
        elif isinstance(input_value, str):
            user_text = input_value
        reply = f"你好！{instructions} - {user_text}".strip(" -")
        response_payload = {
            "id": "resp-test",
            "object": "response",
            "created": int(time.time()),
            "model": body.get("model"),
            "status": "completed",
            "output": [
                {
                    "type": "message",
                    "id": "resp-test-msg-0",
                    "role": "assistant",
                    "content": [{"type": "text", "text": reply}],
                }
            ],
            "output_text": reply,
            "usage": {
                "input_tokens": 10,
                "output_tokens": 8,
                "total_tokens": 18,
            },
            "metadata": body.get("metadata") or {},
        }
        return httpx.Response(200, json=response_payload)

    # Default: return 404 to highlight unexpected calls.
    return httpx.Response(404, json={"error": "unexpected mock path", "path": path})


def _mock_send_responses_stream(request: httpx.Request) -> httpx.Response:
    path = request.url.path

    if path.endswith("/v1/responses") and request.method == "POST":
        response_id = "resp-stream"
        created_chunk = {
            "id": response_id,
            "type": "response.created",
            "response": {
                "id": response_id,
                "object": "response",
                "created": 1,
                "model": "test-model",
                "status": "in_progress",
                "output": [],
                "metadata": {},
            },
        }
        delta_chunk = {
            "id": response_id,
            "type": "response.output_text.delta",
            "response_id": response_id,
            "output_index": 0,
            "delta": "Responses 测试",
        }
        output_done_chunk = {
            "id": response_id,
            "type": "response.output_text.done",
            "response_id": response_id,
            "output_index": 0,
        }
        done_chunk = {
            "id": response_id,
            "type": "response.completed",
            "response": {
                "id": response_id,
                "object": "response",
                "created": 1,
                "model": "test-model",
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "id": f"{response_id}-msg-0",
                        "role": "assistant",
                        "content": [{"type": "text", "text": "Responses 测试"}],
                    }
                ],
                "output_text": "Responses 测试",
                "usage": {
                    "input_tokens": 5,
                    "output_tokens": 5,
                    "total_tokens": 10,
                },
                "metadata": {},
            },
        }
        body = "".join(
            f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            for chunk in (created_chunk, delta_chunk, output_done_chunk, done_chunk)
        )
        body += "data: [DONE]\n\n"
        return httpx.Response(
            200,
            content=body.encode("utf-8"),
            headers={"content-type": "text/event-stream"},
        )

    return httpx.Response(404, json={"error": "unexpected mock path", "path": path})


async def override_get_redis():
    return fake_redis


async def override_get_http_client():
    """
    Provide an AsyncClient whose requests are handled by _mock_send.
    """
    transport = httpx.MockTransport(_mock_send)
    async with httpx.AsyncClient(transport=transport, timeout=30.0) as client:
        yield client


async def _override_get_http_client_responses_stream():
    transport = httpx.MockTransport(_mock_send_responses_stream)
    async with httpx.AsyncClient(transport=transport, timeout=30.0) as client:
        yield client


def _seed_logical_model() -> None:
    """
    Store a simple LogicalModel for 'test-model' into the fake Redis so
    that /v1/chat/completions can route via the multi-provider layer.
    """
    _seed_named_logical_model("test-model")


def _prepare_basic_app(monkeypatch):
    # Provide a single mock provider configuration so that the routing
    # layer can build headers for the selected upstream.
    cfg = ProviderConfig(
        id="mock",
        name="Mock Provider",
        base_url="https://mock.local",
        api_key="sk-test",  # pragma: allowlist secret
    )

    def _load_provider_configs():
        return [cfg]

    def _get_provider_config(provider_id: str):
        if provider_id == "mock":
            return cfg
        return None

    monkeypatch.setattr(
        "service.provider.config.load_provider_configs", _load_provider_configs
    )
    monkeypatch.setattr(
        "service.provider.config.get_provider_config", _get_provider_config
    )

    # Seed logical model into fake Redis.
    fake_redis._data.clear()
    _seed_logical_model()

    app = create_app()

    # Override Redis and HTTP client dependencies.
    app.dependency_overrides[get_redis] = override_get_redis
    app.dependency_overrides[get_http_client] = override_get_http_client

    return app


def test_models_v1_alias(monkeypatch):
    """
    /v1/models 应该作为 /models 的别名返回相同结构。
    """
    app = _prepare_basic_app(monkeypatch)

    with TestClient(app=app, base_url="http://test") as client:
        headers = {
            "Authorization": "Bearer dGltZWxpbmU=",
        }
        resp = client.get("/v1/models", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data.get("data"), list) and data["data"]
        assert any(item.get("id") == "test-model" for item in data["data"])


def test_chat_greeting_returns_reply(monkeypatch):
    """
    发起一个问候，看是否能拿到正确的回复结构。
    不依赖真实的 Redis 和 A4F，仅测试网关逻辑是否通畅。
    """
    app = _prepare_basic_app(monkeypatch)

    # Use TestClient in an async test by running it in a threadpool.
    with TestClient(app=app, base_url="http://test") as client:
        payload = {
            "model": "test-model",
            "messages": [
                {"role": "user", "content": "你好"},
            ],
            "stream": False,
        }
        headers = {
            # base64("timeline") -> dGltZWxpbmU=
            "Authorization": "Bearer dGltZWxpbmU=",
        }

        resp = client.post("/v1/chat/completions", json=payload, headers=headers)

        assert resp.status_code == 200
        data = resp.json()

        # Basic OpenAI-style response structure checks.
        assert data.get("object") == "chat.completion"
        assert isinstance(data.get("choices"), list)
        assert data["choices"], "choices should not be empty"

        message = data["choices"][0].get("message", {})
        assert message.get("role") == "assistant"
        assert "你好" in message.get("content", "")


def test_responses_endpoint_adapts_payload(monkeypatch):
    """
    /v1/responses 应兼容 Responses API 风格的 instructions/input 字段，
    并将请求透传到上游 /v1/responses。
    """
    app = _prepare_basic_app(monkeypatch)
    _seed_named_logical_model("test-model", endpoint_path="/v1/responses")

    with TestClient(app=app, base_url="http://test") as client:
        payload = {
            "model": "test-model",
            "instructions": "你是一个友好的测试助手",
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "你好，Responses API"},
                    ],
                }
            ],
            "stream": False,
        }
        headers = {
            "Authorization": "Bearer dGltZWxpbmU=",
        }

        resp = client.post("/v1/responses", json=payload, headers=headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("object") == "response"
        assert data.get("status") == "completed"
        assert isinstance(data.get("output"), list) and data["output"]
        first_block = data["output"][0]
        assert first_block["role"] == "assistant"
        text_segments = first_block["content"]
        assert text_segments and text_segments[0]["text"].startswith("你好")
        assert "Responses API" in data.get("output_text", "")


def _seed_failover_logical_model() -> None:
    """
    Logical model with two upstreams so that we can exercise cross-provider
    failover behaviour.
    """
    logical = LogicalModel(
        logical_id="test-model",
        display_name="Test Model",
        description="Test logical model for failover",
        capabilities=[ModelCapability.CHAT],
        upstreams=[
            PhysicalModel(
                provider_id="fail",
                model_id="test-model",
                endpoint="https://fail.local/v1/chat/completions",
                base_weight=1.0,
                region="global",
                max_qps=50,
                meta_hash=None,
                updated_at=time.time(),
            ),
            PhysicalModel(
                provider_id="ok",
                model_id="test-model",
                endpoint="https://ok.local/v1/chat/completions",
                base_weight=1.0,
                region="global",
                max_qps=50,
                meta_hash=None,
                updated_at=time.time(),
            ),
        ],
        enabled=True,
        updated_at=time.time(),
    )
    key = LOGICAL_MODEL_KEY_TEMPLATE.format(logical_model=logical.logical_id)
    fake_redis._data[key] = json.dumps(logical.model_dump(), ensure_ascii=False)


def _mock_send_failover(request: httpx.Request) -> httpx.Response:
    """
    Transport that makes the first provider return an error and the
    second provider return a valid response so that the gateway must
    fail over.
    """
    host = request.url.host
    path = request.url.path

    if path.endswith("/v1/chat/completions") and request.method == "POST":
        if host == "fail.local":
            return httpx.Response(500, json={"error": "fail-provider"})

        if host == "ok.local":
            body = json.loads(request.content.decode("utf-8"))
            user_messages = [
                m["content"]
                for m in body.get("messages", [])
                if isinstance(m, dict) and m.get("role") == "user"
            ]
            reply = (
                f"来自 ok 提供商的回复: {user_messages[-1]}"
                if user_messages
                else "来自 ok 提供商的回复"
            )
            data = {
                "id": "cmpl-ok",
                "object": "chat.completion",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": reply},
                        "finish_reason": "stop",
                    }
                ],
            }
            return httpx.Response(200, json=data)

    return httpx.Response(
        404, json={"error": "unexpected mock path", "host": host, "path": path}
    )


async def _override_get_http_client_failover():
    transport = httpx.MockTransport(_mock_send_failover)
    async with httpx.AsyncClient(transport=transport, timeout=30.0) as client:
        yield client


def test_chat_failover_non_stream(monkeypatch):
    """
    当第一个厂商返回 5xx 时，应自动切换到下一个可用厂商并返回正常结果。
    """
    from service.routing.scheduler import CandidateScore  # lazy import for tests

    # Two provider configs so that _build_provider_headers can resolve keys.
    cfg_fail = ProviderConfig(
        id="fail",
        name="Fail Provider",
        base_url="https://fail.local",
        api_key="sk-fail",  # pragma: allowlist secret
    )
    cfg_ok = ProviderConfig(
        id="ok",
        name="OK Provider",
        base_url="https://ok.local",
        api_key="sk-ok",  # pragma: allowlist secret
    )

    def _load_provider_configs():
        return [cfg_fail, cfg_ok]

    def _get_provider_config(provider_id: str):
        if provider_id == "fail":
            return cfg_fail
        if provider_id == "ok":
            return cfg_ok
        return None

    # Force the scheduler to pick the failing provider first so that the
    # failover path is deterministically exercised.
    def _choose_upstream(logical_model, upstreams, metrics_by_provider, strategy, session=None):
        scored = [
            CandidateScore(upstream=up, metrics=None, score=1.0) for up in upstreams
        ]
        selected = next(c for c in scored if c.upstream.provider_id == "fail")
        return selected, scored

    monkeypatch.setattr(
        "service.provider.config.load_provider_configs", _load_provider_configs
    )
    monkeypatch.setattr(
        "service.provider.config.get_provider_config", _get_provider_config
    )
    monkeypatch.setattr("service.routes.choose_upstream", _choose_upstream)

    # Seed logical model with two upstreams into fake Redis.
    fake_redis._data.clear()
    _seed_failover_logical_model()

    app = create_app()
    app.dependency_overrides[get_redis] = override_get_redis
    app.dependency_overrides[get_http_client] = _override_get_http_client_failover

    with TestClient(app=app, base_url="http://test") as client:
        payload = {
            "model": "test-model",
            "messages": [
                {"role": "user", "content": "你好，测试 failover"},
            ],
            "stream": False,
        }
        headers = {
            "Authorization": "Bearer dGltZWxpbmU=",
        }

        resp = client.post("/v1/chat/completions", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        message = data["choices"][0]["message"]["content"]
        # 应该拿到来自 OK 提供商的回复，说明发生了跨厂商兜底。
        assert "来自 ok 提供商的回复" in message


def test_chat_failover_streaming(monkeypatch):
    """
    流式模式下，当第一个厂商在尚未输出任何内容前返回 5xx，
    应自动切换到下一个厂商并继续以流式输出结果。
    """
    from service.routing.scheduler import CandidateScore  # lazy import for tests

    cfg_fail = ProviderConfig(
        id="fail",
        name="Fail Provider",
        base_url="https://fail.local",
        api_key="sk-fail",  # pragma: allowlist secret
    )
    cfg_ok = ProviderConfig(
        id="ok",
        name="OK Provider",
        base_url="https://ok.local",
        api_key="sk-ok",  # pragma: allowlist secret
    )

    def _load_provider_configs():
        return [cfg_fail, cfg_ok]

    def _get_provider_config(provider_id: str):
        if provider_id == "fail":
            return cfg_fail
        if provider_id == "ok":
            return cfg_ok
        return None

    def _choose_upstream(logical_model, upstreams, metrics_by_provider, strategy, session=None):
        scored = [
            CandidateScore(upstream=up, metrics=None, score=1.0) for up in upstreams
        ]
        selected = next(c for c in scored if c.upstream.provider_id == "fail")
        return selected, scored

    monkeypatch.setattr(
        "service.provider.config.load_provider_configs", _load_provider_configs
    )
    monkeypatch.setattr(
        "service.provider.config.get_provider_config", _get_provider_config
    )
    monkeypatch.setattr("service.routes.choose_upstream", _choose_upstream)

    fake_redis._data.clear()
    _seed_failover_logical_model()

    app = create_app()
    app.dependency_overrides[get_redis] = override_get_redis
    app.dependency_overrides[get_http_client] = _override_get_http_client_failover

    with TestClient(app=app, base_url="http://test") as client:
        payload = {
            "model": "test-model",
            "messages": [
                {"role": "user", "content": "你好，测试流式 failover"},
            ],
            "stream": True,
        }
        headers = {
            "Authorization": "Bearer dGltZWxpbmU=",
            "Accept": "text/event-stream",
        }

        with client.stream(
            "POST", "/v1/chat/completions", json=payload, headers=headers
        ) as resp:
            assert resp.status_code == 200
            body = b"".join(resp.iter_bytes())
            text = body.decode("utf-8", errors="ignore")
            # 流式响应内容应该来自 OK 提供商，而不是 fail 提供商的错误。
            assert "来自 ok 提供商的回复" in text
            assert "fail-provider" not in text


def test_responses_streaming_rewrites_sse(monkeypatch):
    app = _prepare_basic_app(monkeypatch)
    app.dependency_overrides[get_http_client] = _override_get_http_client_responses_stream
    _seed_named_logical_model("test-model", endpoint_path="/v1/responses")

    with TestClient(app=app, base_url="http://test") as client:
        payload = {
            "model": "test-model",
            "instructions": "你是一个 SSE 测试助手",
            "input": "流式 Responses",
            "stream": True,
        }
        headers = {
            "Authorization": "Bearer dGltZWxpbmU=",
            "Accept": "text/event-stream",
        }

        with client.stream("POST", "/v1/responses", json=payload, headers=headers) as resp:
            assert resp.status_code == 200
            body = b"".join(resp.iter_bytes()).decode("utf-8")
            assert "response.created" in body
            assert "response.output_text.delta" in body
            assert "response.output_text.done" in body
            assert "response.completed" in body
            assert '"response_id":' in body
            assert '"output_index":' in body
            assert "Responses 测试" in body
            assert "data: [DONE]" in body


def test_responses_sync_request_for_gpt_codex(monkeypatch):
    """
    使用 gpt-5.1-codex 模型调用 /v1/responses，验证非流式回归。
    """
    app = _prepare_basic_app(monkeypatch)
    _seed_named_logical_model("gpt-5.1-codex", endpoint_path="/v1/responses")

    with TestClient(app=app, base_url="http://test") as client:
        payload = {
            "model": "gpt-5.1-codex",
            "instructions": "你是一名回归测试助手",
            "input": "回归测试请求",
            "stream": False,
        }
        headers = {
            "Authorization": "Bearer dGltZWxpbmU=",
        }

        resp = client.post("/v1/responses", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "completed"
        assert "output_text" in data
        assert "回归测试请求" in data["output_text"]
        assert "你是一名回归测试助手" in data["output_text"]
        output = data.get("output") or []
        assert output and isinstance(output[0].get("content"), list)
        assert (
            "你是一名回归测试助手" in output[0]["content"][0].get("text", "")
        )

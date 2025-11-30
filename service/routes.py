from typing import Any, AsyncIterator, Dict, Optional

import json
import re
import time
import httpx
from fastapi import Body, Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .auth import require_api_key
from .context_store import save_context
from .deps import get_http_client, get_redis
from .logging_config import logger
from .model_cache import get_models_from_cache, set_models_cache
from .provider_routes import router as provider_router
from .logical_model_routes import router as logical_model_router
from .routing_routes import router as routing_router
from .session_routes import router as session_router
from .settings import build_upstream_headers, settings
from .upstream import UpstreamStreamError, detect_request_format, stream_upstream
from service.models import (
    LogicalModel,
    ModelCapability,
    PhysicalModel,
    ProviderConfig,
    RoutingMetrics,
    SchedulingStrategy,
    Session,
)
from service.provider.config import get_provider_config, load_provider_configs
from service.provider.discovery import ensure_provider_models_cached
from service.routing.mapper import select_candidate_upstreams
from service.routing.scheduler import CandidateScore, choose_upstream
from service.routing.session_manager import bind_session, get_session
from service.storage.redis_service import get_logical_model, get_routing_metrics


class HealthResponse(BaseModel):
    status: str = "ok"


class ModelInfo(BaseModel):
    id: str
    object: Optional[str] = None
    created: Optional[int] = None
    owned_by: Optional[str] = None


class ModelsResponse(BaseModel):
    object: str = "list"
    data: list[ModelInfo] = Field(default_factory=list)


def _build_provider_headers(provider_id: str) -> Dict[str, str]:
    """
    Build headers for calling a concrete provider upstream.

    This reuses the browser-mimic settings (User-Agent / Origin / Referer)
    but replaces the Authorization header with the provider-specific API key.
    """
    cfg = get_provider_config(provider_id)
    if cfg is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Provider '{provider_id}' is not configured",
        )

    headers: Dict[str, str] = {
        "Authorization": f"Bearer {cfg.api_key}",
        "Accept": "application/json",
    }

    # Optional browser-mimic behaviour.
    if settings.mask_as_browser:
        headers["User-Agent"] = settings.mask_user_agent
        if settings.mask_origin:
            headers["Origin"] = settings.mask_origin
        if settings.mask_referer:
            headers["Referer"] = settings.mask_referer

    # Provider-specific extra headers take precedence.
    if cfg.custom_headers:
        headers.update(cfg.custom_headers)

    return headers


async def _load_metrics_for_candidates(
    redis,
    logical_model_id: str,
    upstreams: list[PhysicalModel],
) -> Dict[str, RoutingMetrics]:
    """
    Load RoutingMetrics for each provider used by the candidate upstreams.
    """
    seen_providers: Dict[str, RoutingMetrics] = {}
    for up in upstreams:
        if up.provider_id in seen_providers:
            continue
        metrics = await get_routing_metrics(redis, logical_model_id, up.provider_id)
        if metrics is not None:
            seen_providers[up.provider_id] = metrics
    return seen_providers


async def _get_or_fetch_models(
    client: httpx.AsyncClient,
    redis,
) -> ModelsResponse:
    """
    Fetch aggregated model list from all configured providers and return
    a normalized OpenAI-style ModelsResponse.
    """
    # Try cache first
    cached = await get_models_from_cache(redis)
    if cached:
        return ModelsResponse(**cached)

    providers = load_provider_configs()
    models: list[ModelInfo] = []

    for cfg in providers:
        try:
            items = await ensure_provider_models_cached(client, redis, cfg)
        except httpx.HTTPError as exc:
            # Skip providers whose /models endpoint is currently failing.
            logger.warning(
                "Skipping provider %s while aggregating /models: %s",
                cfg.id,
                exc,
            )
            continue

        for m in items:
            model_id: Optional[str] = None
            if isinstance(m, dict):
                # Prefer explicit id, fall back to model_id.
                mid = m.get("id") or m.get("model_id")
                if isinstance(mid, str):
                    model_id = mid
            elif isinstance(m, str):
                model_id = m

            if model_id:
                models.append(ModelInfo(id=model_id))

    models_response = ModelsResponse(data=models)

    # Store normalized payload in cache
    await set_models_cache(redis, models_response.model_dump())

    return models_response


def _build_ordered_candidates(
    selected: CandidateScore,
    scored: list[CandidateScore],
) -> list[CandidateScore]:
    """
    Build an ordered list of candidates, putting the selected one (which
    may come from a sticky session) first, followed by the remaining
    scored candidates in descending score order.
    """
    ordered: list[CandidateScore] = [selected]
    for cand in scored:
        if (
            cand.upstream.provider_id == selected.upstream.provider_id
            and cand.upstream.model_id == selected.upstream.model_id
        ):
            continue
        ordered.append(cand)
    return ordered


def _is_retryable_upstream_status(
    provider_id: str,
    status_code: Optional[int],
) -> bool:
    """
    Decide whether an upstream HTTP status code is worth retrying on a
    different provider.

    Behaviour:
    - Transport-level errors (status_code is None) are always retryable.
    - When a ProviderConfig has explicit `retryable_status_codes`, we use
      that list (typically configured per provider, e.g. OpenAI / Gemini /
      Claude).
    - Otherwise we fall back to a generic rule: 5xx and 429 are retryable.
    """
    if status_code is None:
        return True
    cfg = get_provider_config(provider_id)
    if cfg and cfg.retryable_status_codes:
        return status_code in cfg.retryable_status_codes
    if status_code == 429:
        return True
    if 500 <= status_code <= 599:
        return True
    return False


_GEMINI_MODEL_REGEX = re.compile("gemini", re.IGNORECASE)


def _strip_model_group_prefix(model_value: Any) -> Optional[str]:
    """
    Some upstreams or client SDKs use grouped model ids like
    "provider-2/gemini-3-pro-preview". For routing / logical-model
    lookup purposes we only care about the trailing part (the actual
    model id) but we still forward the full id to upstream.
    """
    if not isinstance(model_value, str):
        return None
    if "/" not in model_value:
        return model_value
    # Example: "provider-2/gemini-3-pro-preview" -> "gemini-3-pro-preview"
    return model_value.split("/", 1)[1]


async def _build_dynamic_logical_model_for_group(
    *,
    client: httpx.AsyncClient,
    redis,
    requested_model: Any,
    lookup_model_id: Optional[str],
    api_style: str,
) -> Optional[LogicalModel]:
    """
    Build a transient LogicalModel for cases where no static logical
    model is configured for the requested id.

    Behaviour:
    - Discover all providers whose /models list includes either the
      exact requested model id or a model whose stripped suffix matches
      the requested id (to account for grouped ids like "provider-2/xxx").
    - When multiple providers advertise the same underlying model, we
      treat them as a single logical model group and let the scheduler
      perform cross-provider load-balancing with session stickiness.
    - When no provider claims the model, we return None so that the
      caller can reject the request at the gateway.
    """
    if not isinstance(lookup_model_id, str):
        return None

    providers = load_provider_configs()
    if not providers:
        return None

    target_model_str = str(requested_model) if isinstance(requested_model, str) else None
    target_base = _strip_model_group_prefix(target_model_str) if target_model_str else None

    # Discover all providers that advertise this model.
    candidate_upstreams: list[PhysicalModel] = []
    now = time.time()

    # Precompute common upstream path for chat based on API style.
    if api_style == "claude":
        upstream_path = "/v1/messages"
    elif api_style == "responses":
        upstream_path = "/v1/responses"
    else:
        upstream_path = "/v1/chat/completions"

    for cfg in providers:
        try:
            items = await ensure_provider_models_cached(client, redis, cfg)
        except httpx.HTTPError as exc:
            # Skip providers whose /models endpoint is currently failing
            # for this request; other providers may still be usable.
            logger.warning(
                "Failed to refresh models for provider %s while building "
                "dynamic logical model for %s: %s",
                cfg.id,
                lookup_model_id,
                exc,
            )
            continue

        matched_full_id: Optional[str] = None

        for item in items:
            mid: Optional[str] = None
            if isinstance(item, dict):
                mid_val = item.get("id") or item.get("model_id")
                if isinstance(mid_val, str):
                    mid = mid_val
            elif isinstance(item, str):
                mid = item
            if mid is None:
                continue

            base_id = _strip_model_group_prefix(mid) or mid

            if not target_model_str:
                continue

            if (
                target_model_str == mid
                or (target_base is not None and target_base == mid)
                or (target_base is not None and target_base == base_id)
            ):
                matched_full_id = mid
                break

        if matched_full_id is None:
            continue

        endpoint = f"{str(cfg.base_url).rstrip('/')}{upstream_path}"
        base_weight = getattr(cfg, "weight", 1.0) or 1.0

        candidate_upstreams.append(
            PhysicalModel(
                provider_id=cfg.id,
                model_id=matched_full_id,
                endpoint=endpoint,
                base_weight=base_weight,
                region=getattr(cfg, "region", None),
                max_qps=getattr(cfg, "max_qps", None),
                meta_hash=None,
                updated_at=now,
            )
        )

    if not candidate_upstreams:
        return None

    return LogicalModel(
        logical_id=lookup_model_id,
        display_name=lookup_model_id,
        description=f"Dynamic logical model for '{lookup_model_id}'",
        capabilities=[ModelCapability.CHAT],
        upstreams=candidate_upstreams,
        enabled=True,
        updated_at=now,
    )


def _normalize_gemini_input_to_messages(input_value: Any) -> list[Dict[str, str]]:
    """
    Convert a Gemini-style `input` list into OpenAI-style `messages`.
    This is a best-effort adapter so that clients that speak Gemini
    can still go through the OpenAI-compatible /v1/chat/completions
    upstream endpoint.
    """
    if not isinstance(input_value, list):
        return []

    messages: list[Dict[str, str]] = []

    for item in input_value:
        if not isinstance(item, dict):
            continue

        role = item.get("role") or "user"
        content = item.get("content", "")

        # Gemini-style content might be:
        # - a plain string
        # - a list of segments like {"type": "input_text", "text": "..."}
        text: str
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            parts: list[str] = []
            for part in content:
                if not isinstance(part, dict):
                    continue
                if isinstance(part.get("text"), str):
                    parts.append(part["text"])
                elif part.get("type") == "input_text" and isinstance(
                    part.get("text"), str
                ):
                    parts.append(part["text"])
            text = "".join(parts)
        else:
            text = str(content)

        messages.append({"role": role, "content": text})

    return messages


def _normalize_payload_by_model(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inspect payload.model + structure, and normalize provider-specific
    formats (e.g. Gemini) into the OpenAI-style shape expected by the
    upstream chat APIs.
    """
    model = payload.get("model")
    model_str = str(model or "")

    # Gemini-style: caller sends `input=[{role, content: [...]}, ...]`
    # instead of OpenAI `messages=[{role, content: "..."}, ...]`.
    if (
        "input" in payload
        and "messages" not in payload
        and _GEMINI_MODEL_REGEX.search(model_str)
    ):
        logger.info(
            "Normalizing Gemini-style payload for model %s into OpenAI messages",
            model_str,
        )
        messages = _normalize_gemini_input_to_messages(payload.get("input"))
        if messages:
            new_payload = dict(payload)
            new_payload["messages"] = messages
            new_payload.pop("input", None)
            return new_payload

    # Default: return as-is
    return payload


def _flatten_responses_content(content: Any) -> Optional[str]:
    """
    Best-effort extraction of plain text from OpenAI Responses-style content
    blocks. These blocks may be strings or a list of dict segments
    containing text fields.
    """
    if content is None:
        return None
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
                elif isinstance(part.get("content"), str):
                    parts.append(part["content"])
        if parts:
            return "".join(parts)
        return None
    if isinstance(content, dict):
        text = content.get("text")
        if isinstance(text, str):
            return text
    return str(content)


def _convert_responses_messages(
    input_value: Any, instructions: Optional[str]
) -> list[Dict[str, str]]:
    """
    Convert Responses API `input` + optional `instructions` into
    OpenAI-style chat messages.
    """
    messages: list[Dict[str, str]] = []

    if isinstance(instructions, str) and instructions.strip():
        messages.append({"role": "system", "content": instructions.strip()})

    if isinstance(input_value, list):
        for item in input_value:
            if not isinstance(item, dict):
                continue
            role = item.get("role") or "user"
            text = _flatten_responses_content(item.get("content"))
            if text:
                messages.append({"role": role, "content": text})
    elif isinstance(input_value, str):
        messages.append({"role": "user", "content": input_value})
    elif input_value is not None:
        messages.append({"role": "user", "content": str(input_value)})

    return messages


def _adapt_responses_payload(raw_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adapt a Responses API payload into the chat-completions-friendly shape.
    This primarily maps `instructions` + `input` into `messages`.
    """
    payload = dict(raw_payload)

    if "messages" in payload:
        return payload

    instructions = payload.pop("instructions", None)
    input_value = payload.pop("input", None)
    messages = _convert_responses_messages(input_value, instructions)

    if messages:
        payload["messages"] = messages
    else:
        # Put the original fields back if we failed to convert, so the caller
        # still receives a meaningful error downstream.
        if instructions is not None:
            payload["instructions"] = instructions
        if input_value is not None:
            payload["input"] = input_value

    return payload


def _ensure_response_id(response_id: Optional[str]) -> str:
    return response_id or f"resp-{int(time.time() * 1000)}"


def _build_output_blocks_from_text_map(
    response_id: str,
    index_to_text: Dict[int, str],
) -> list[Dict[str, Any]]:
    if not index_to_text:
        return [
            {
                "id": f"{response_id}-msg-0",
                "type": "message",
                "role": "assistant",
                "content": [],
            }
        ]

    blocks: list[Dict[str, Any]] = []
    for idx in sorted(index_to_text):
        text = index_to_text[idx]
        blocks.append(
            {
                "id": f"{response_id}-msg-{idx}",
                "type": "message",
                "role": "assistant",
                "content": [{"type": "text", "text": text}],
            }
        )
    return blocks


def _text_map_from_choices(choices: Any) -> Dict[int, str]:
    text_map: Dict[int, str] = {}
    if not isinstance(choices, list):
        return text_map
    for idx, choice in enumerate(choices):
        if not isinstance(choice, dict):
            continue
        message = choice.get("message") or {}
        content = message.get("content")
        text = _flatten_responses_content(content) or ""
        text_map[idx] = text
    return text_map


def _chat_to_responses_payload(chat_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a chat-completions JSON payload into Responses API shape.
    """
    response_id = _ensure_response_id(chat_payload.get("id"))
    created = chat_payload.get("created") or int(time.time())
    text_map = _text_map_from_choices(chat_payload.get("choices"))
    output_blocks = _build_output_blocks_from_text_map(response_id, text_map)
    output_text = "\n".join(text_map[idx] for idx in sorted(text_map) if text_map[idx])
    payload = {
        "id": response_id,
        "object": "response",
        "created": created,
        "model": chat_payload.get("model"),
        "usage": chat_payload.get("usage"),
        "status": "completed",
        "output": output_blocks,
        "output_text": output_text,
        "metadata": chat_payload.get("metadata") or {},
    }
    return payload


def _encode_sse_payload(payload: Dict[str, Any]) -> bytes:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8")


def _build_completed_event_payload(
    response_id: Optional[str],
    model: Optional[str],
    created: Optional[int],
    index_to_text: Dict[int, str],
    usage: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    rid = _ensure_response_id(response_id)
    created_ts = created or int(time.time())
    outputs = _build_output_blocks_from_text_map(rid, index_to_text)
    aggregated_text = "\n".join(
        index_to_text[idx] for idx in sorted(index_to_text) if index_to_text[idx]
    )
    response_body = {
        "id": rid,
        "object": "response",
        "created": created_ts,
        "model": model,
        "status": "completed",
        "output": outputs,
        "output_text": aggregated_text,
        "usage": usage,
        "metadata": {},
    }
    return {
        "id": rid,
        "type": "response.completed",
        "response": response_body,
    }


def _build_created_event_payload(
    response_id: Optional[str],
    model: Optional[str],
    created: Optional[int],
) -> Dict[str, Any]:
    rid = _ensure_response_id(response_id)
    created_ts = created or int(time.time())
    response_body = {
        "id": rid,
        "object": "response",
        "created": created_ts,
        "model": model,
        "status": "in_progress",
        "output": [],
        "metadata": {},
    }
    return {
        "id": rid,
        "type": "response.created",
        "response": response_body,
    }


def _build_output_done_event_payload(
    response_id: Optional[str],
    output_index: int,
) -> Dict[str, Any]:
    rid = _ensure_response_id(response_id)
    return {
        "id": rid,
        "type": "response.output_text.done",
        "response_id": rid,
        "output_index": output_index,
    }


def _wrap_chat_stream_response(chat_response: StreamingResponse) -> StreamingResponse:
    """
    Consume the original chat completion SSE stream and emit responses-style events.
    """

    async def _iterator() -> AsyncIterator[bytes]:
        buffer = ""
        index_to_text: Dict[int, str] = {}
        response_id: Optional[str] = None
        model: Optional[str] = None
        created: Optional[int] = None
        usage: Optional[Dict[str, Any]] = None
        created_emitted = False
        completed_emitted = False
        done_indices: set[int] = set()

        def _get_or_create_response_id() -> str:
            nonlocal response_id
            rid = _ensure_response_id(response_id)
            response_id = rid
            return rid

        def _maybe_emit_created_event() -> Optional[bytes]:
            nonlocal created_emitted
            if created_emitted:
                return None
            rid = _get_or_create_response_id()
            created_payload = _build_created_event_payload(
                rid,
                model,
                created,
            )
            created_emitted = True
            return _encode_sse_payload(created_payload)

        def _emit_output_done(idx: int) -> Optional[bytes]:
            if idx in done_indices:
                return None
            rid = _get_or_create_response_id()
            done_indices.add(idx)
            return _encode_sse_payload(
                _build_output_done_event_payload(rid, idx)
            )

        def _flush_all_output_done_events() -> list[bytes]:
            payloads: list[bytes] = []
            for idx in sorted(index_to_text):
                payload = _emit_output_done(idx)
                if payload:
                    payloads.append(payload)
            return payloads

        async for chunk in chat_response.body_iterator:
            try:
                decoded = chunk.decode("utf-8")
            except UnicodeDecodeError:
                continue
            buffer += decoded

            while "\n\n" in buffer:
                raw_event, buffer = buffer.split("\n\n", 1)
                raw_event = raw_event.strip()
                if not raw_event.startswith("data:"):
                    continue
                payload_str = raw_event[len("data:") :].strip()
                if not payload_str:
                    continue

                if payload_str == "[DONE]":
                    if not created_emitted:
                        created_payload = _maybe_emit_created_event()
                        if created_payload:
                            yield created_payload
                    for payload in _flush_all_output_done_events():
                        yield payload
                    if not completed_emitted:
                        completed = _build_completed_event_payload(
                            response_id,
                            model,
                            created,
                            index_to_text,
                            usage,
                        )
                        yield _encode_sse_payload(completed)
                        completed_emitted = True
                    yield b"data: [DONE]\n\n"
                    return

                try:
                    data = json.loads(payload_str)
                except json.JSONDecodeError:
                    continue

                if data.get("object") != "chat.completion.chunk":
                    continue

                if isinstance(data.get("id"), str):
                    response_id = response_id or data["id"]
                model = model or data.get("model")
                created = created or data.get("created")
                if data.get("usage"):
                    usage = data["usage"]

                for choice in data.get("choices", []):
                    if not isinstance(choice, dict):
                        continue
                    idx = choice.get("index", 0)
                    delta = choice.get("delta") or {}
                    delta_content = delta.get("content")
                    text_delta = _flatten_responses_content(delta_content)
                    if text_delta:
                        existing = index_to_text.get(idx, "")
                        index_to_text[idx] = existing + text_delta
                        created_payload = _maybe_emit_created_event()
                        if created_payload:
                            yield created_payload
                        rid = _get_or_create_response_id()
                        yield _encode_sse_payload(
                            {
                                "id": rid,
                                "type": "response.output_text.delta",
                                "response_id": rid,
                                "output_index": idx,
                                "delta": text_delta,
                            }
                        )

                    if choice.get("finish_reason"):
                        done_payload = _emit_output_done(idx)
                        if done_payload:
                            yield done_payload
                    if choice.get("finish_reason") and not completed_emitted:
                        if not created_emitted:
                            created_payload = _maybe_emit_created_event()
                            if created_payload:
                                yield created_payload
                        completed = _build_completed_event_payload(
                            response_id,
                            model,
                            created,
                            index_to_text,
                            usage,
                        )
                        yield _encode_sse_payload(completed)
                        completed_emitted = True

        # Safety net: emit completion even if upstream stream ended abruptly.
        if not completed_emitted:
            if not created_emitted:
                created_payload = _maybe_emit_created_event()
                if created_payload:
                    yield created_payload
            for payload in _flush_all_output_done_events():
                yield payload
            completed = _build_completed_event_payload(
                response_id,
                model,
                created,
                index_to_text,
                usage,
            )
            yield _encode_sse_payload(completed)
            yield b"data: [DONE]\n\n"

    headers = dict(chat_response.headers)
    headers.pop("content-length", None)
    return StreamingResponse(
        _iterator(),
        media_type="text/event-stream",
        headers=headers,
        status_code=chat_response.status_code,
        background=chat_response.background,
    )


def create_app() -> FastAPI:
    app = FastAPI(title="AI Gateway", version="0.1.0")

    # Provider-management API (multi-provider routing feature).
    app.include_router(provider_router)
    # Logical model mapping API (User Story 2).
    app.include_router(logical_model_router)
    # Routing decision and session APIs (User Story 3).
    app.include_router(routing_router)
    app.include_router(session_router)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """
        Basic request/response logging middleware.
        Also logs all request headers so we can inspect how different
        clients are passing session-related information.
        """
        client_host = request.client.host if request.client else "-"
        # Copy headers into a plain dict; redact Authorization by default.
        headers_for_log = {}
        for k, v in request.headers.items():
            if k.lower() == "authorization":
                headers_for_log[k] = "***REDACTED***"
            else:
                headers_for_log[k] = v

        logger.info(
            "HTTP %s %s from %s, headers=%s",
            request.method,
            request.url.path,
            client_host,
            headers_for_log,
        )
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "Unhandled error while processing %s %s",
                request.method,
                request.url.path,
            )
            raise
        logger.info(
            "HTTP %s %s -> %s", request.method, request.url.path, response.status_code
        )
        return response

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse()

    @app.get(
        "/models",
        response_model=ModelsResponse,
        dependencies=[Depends(require_api_key)],
    )
    async def list_models(
        client: httpx.AsyncClient = Depends(get_http_client),
        redis=Depends(get_redis),
    ) -> ModelsResponse:
        models_response = await _get_or_fetch_models(client, redis)
        return models_response

    @app.get(
        "/v1/models",
        response_model=ModelsResponse,
        dependencies=[Depends(require_api_key)],
    )
    async def list_models_v1(
        client: httpx.AsyncClient = Depends(get_http_client),
        redis=Depends(get_redis),
    ) -> ModelsResponse:
        """
        向后兼容的别名：某些 SDK 默认请求 /v1/models。
        """
        return await list_models(client=client, redis=redis)

    @app.post(
        "/v1/chat/completions",
        dependencies=[Depends(require_api_key)],
    )
    async def chat_completions(
        request: Request,
        client: httpx.AsyncClient = Depends(get_http_client),
        redis=Depends(get_redis),
        x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id"),
        raw_body: Dict[str, Any] = Body(...),
    ):
        """
        Gateway endpoint that accepts both OpenAI-style and Claude-style payloads.
        It auto-detects the format and whether the client expects a
        streaming response.

        When a logical model with the same name as `payload.model`
        exists in Redis, this endpoint routes via the multi-provider
        scheduler and performs weighted load balancing across upstream
        providers.
        """
        # Log a concise summary of the raw payload instead of the full body to reduce log noise.
        logger.info(
            "chat_completions: incoming_raw_body summary model=%r stream=%r keys=%s",
            raw_body.get("model"),
            raw_body.get("stream"),
            list(raw_body.keys()),
        )

        payload = dict(raw_body)  # shallow copy
        api_style_override = payload.pop("_apiproxy_api_style", None)
        skip_normalization = bool(payload.pop("_apiproxy_skip_normalize", False))

        # First normalize payload based on model/provider conventions
        # (e.g. Gemini-style `input` -> OpenAI-style `messages`).
        if not skip_normalization:
            payload = _normalize_payload_by_model(payload)

        # 自动感应是否需要流式：
        # 1. 显式 payload.stream = True
        # 2. Accept 头包含 text/event-stream
        accept_header = request.headers.get("accept", "")
        wants_event_stream = "text/event-stream" in accept_header.lower()
        payload_stream_raw = payload.get("stream", None)

        if payload_stream_raw is False:
            # 客户端显式关闭流式
            stream = False
        else:
            stream = bool(payload_stream_raw) or wants_event_stream

        # 如果通过 Accept 头推断为流式，而 payload 里没带 stream 字段，则自动补上
        if stream and payload_stream_raw is None:
            payload["stream"] = True

        api_style = api_style_override or detect_request_format(payload)
        requested_model = payload.get("model")
        normalized_model = _strip_model_group_prefix(requested_model)
        lookup_model_id = normalized_model or requested_model

        logger.info(
            "chat_completions: resolved api_style=%s lookup_model_id=%r "
            "stream=%s x_session_id=%r",
            api_style,
            lookup_model_id,
            stream,
            x_session_id,
        )

        # Try multi-provider logical-model routing first. When a LogicalModel
        # named `lookup_model_id` exists in Redis, we use the routing
        # scheduler to pick a concrete upstream provider+model.
        logical_model: Optional[LogicalModel] = None
        if isinstance(lookup_model_id, str):
            try:
                logical_model = await get_logical_model(redis, lookup_model_id)
                if logical_model is not None:
                    logger.info(
                        "chat_completions: using static logical_model=%s "
                        "from Redis with %d upstreams",
                        logical_model.logical_id,
                        len(logical_model.upstreams),
                    )
            except Exception:
                # Log and fall back to dynamic mapping; do not fail the request.
                logger.exception(
                    "Failed to load logical model '%s' for routing", lookup_model_id
                )
                logical_model = None

        if logical_model is None:
            # Build a transient logical model based on provider /models
            # catalogues. This allows us to:
            # - verify the requested model exists in at least one provider;
            # - group providers that expose the same underlying model (e.g.
            #   "provider-2/xxx" and "provider-3/xxx") into a single logical
            #   model for cross-provider load-balancing; and
            # - reuse the scheduler + session stickiness logic without
            #   requiring manual LogicalModel configuration for every model id.
            logical_model = await _build_dynamic_logical_model_for_group(
                client=client,
                redis=redis,
                requested_model=requested_model,
                lookup_model_id=lookup_model_id,
                api_style=api_style,
            )

            if logical_model is not None:
                logger.info(
                    "chat_completions: built dynamic logical_model=%s "
                    "with %d upstreams",
                    logical_model.logical_id,
                    len(logical_model.upstreams),
                )

        if logical_model is None:
            # Either no providers are configured or none of them advertise
            # this model in their /models list; reject at the gateway.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": (
                        f"Requested model '{requested_model}' is not available "
                        "in any configured provider"
                    )
                },
            )

        if logical_model is not None:
            # 1) Select candidate upstreams for this logical model.
            candidates: list[PhysicalModel] = select_candidate_upstreams(
                logical_model,
                preferred_region=None,
                exclude_providers=[],
            )
            if not candidates:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        f"No upstreams available for logical model "
                        f"'{logical_model.logical_id}'"
                    ),
                )

            # 2) Optional session stickiness using X-Session-Id as conversation id.
            session_obj: Optional[Session] = None
            if x_session_id:
                session_obj = await get_session(redis, x_session_id)

            # 3) Load routing metrics and choose an upstream via the scheduler.
            metrics_by_provider: Dict[str, RoutingMetrics] = (
                await _load_metrics_for_candidates(
                    redis,
                    logical_model.logical_id,
                    candidates,
                )
            )
            strategy = SchedulingStrategy(
                name="balanced", description="Default chat routing strategy"
            )
            try:
                selected: CandidateScore
                selected, scored_candidates = choose_upstream(
                    logical_model,
                    candidates,
                    metrics_by_provider,
                    strategy,
                    session=session_obj,
                )
            except RuntimeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=str(exc),
                )

            ordered_candidates = _build_ordered_candidates(selected, scored_candidates)

            logger.info(
                "chat_completions: selected upstream provider=%s model=%s "
                "for logical_model=%s; candidates=%s",
                selected.upstream.provider_id,
                selected.upstream.model_id,
                logical_model.logical_id,
                [
                    (
                        c.upstream.provider_id,
                        c.upstream.model_id,
                        round(c.score, 3),
                    )
                    for c in scored_candidates
                ],
            )

            async def _bind_session_for_upstream(
                provider_id: str,
                model_id: str,
            ) -> None:
                """
                Bind the conversation to the chosen upstream when stickiness
                is enabled. For non-streaming calls this is invoked after we
                have a final response; for streaming we call it on the first
                successfully yielded chunk.
                """
                if x_session_id and strategy.enable_stickiness:
                    await bind_session(
                        redis,
                        conversation_id=x_session_id,
                        logical_model=logical_model.logical_id,
                        provider_id=provider_id,
                        model_id=model_id,
                    )

            if not stream:
                # Non-streaming mode: try candidates in order, falling back
                # to the next provider when we see a retryable upstream error.
                last_status: Optional[int] = None
                last_error_text: Optional[str] = None

                for cand in ordered_candidates:
                    url = cand.upstream.endpoint
                    provider_id = cand.upstream.provider_id
                    model_id = cand.upstream.model_id
                    headers = _build_provider_headers(provider_id)

                    logger.info(
                        "chat_completions: sending non-streaming request to "
                        "provider=%s model=%s url=%s",
                        provider_id,
                        model_id,
                        url,
                    )

                    try:
                        # Use a provider-specific model id when forwarding
                        # upstream so that grouped ids like "provider-2/xxx"
                        # are translated correctly for each vendor.
                        upstream_payload = dict(payload)
                        upstream_payload["model"] = model_id

                        r = await client.post(url, headers=headers, json=upstream_payload)
                    except httpx.HTTPError as exc:
                        logger.warning(
                            "Upstream non-streaming request error for %s "
                            "(provider=%s, model=%s): %s; trying next candidate",
                            url,
                            provider_id,
                            model_id,
                            exc,
                        )
                        last_status = None
                        last_error_text = str(exc)
                        continue

                    text = r.text
                    status_code = r.status_code

                    logger.info(
                        "chat_completions: upstream non-streaming response "
                        "status=%s provider=%s model=%s body_length=%d",
                        status_code,
                        provider_id,
                        model_id,
                        len(text or ""),
                    )

                    if status_code >= 400 and _is_retryable_upstream_status(
                        provider_id, status_code
                    ):
                        logger.warning(
                            "Upstream non-streaming retryable error %s for %s "
                            "(provider=%s, model=%s); payload=%r; response=%s",
                            status_code,
                            url,
                            provider_id,
                            model_id,
                            payload,
                            text,
                        )
                        last_status = status_code
                        last_error_text = text
                        # Try next candidate.
                        continue

                    # At this point we either have a successful response
                    # (<400) or a non-retryable 4xx.
                    await _bind_session_for_upstream(provider_id, model_id)
                    await save_context(redis, x_session_id, payload, text)

                    if status_code >= 400:
                        logger.warning(
                            "Upstream non-streaming non-retryable error %s for %s "
                            "(provider=%s, model=%s); payload=%r; response=%s",
                            status_code,
                            url,
                            provider_id,
                            model_id,
                            payload,
                            text,
                        )
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Upstream error {status_code}: {text}",
                        )

                    return JSONResponse(
                        content=r.json(),
                        status_code=status_code,
                    )

                # All candidates failed with retryable errors.
                message = (
                    f"All upstream providers failed for logical model "
                    f"'{logical_model.logical_id}'"
                )
                details: list[str] = []
                if last_status is not None:
                    details.append(f"last_status={last_status}")
                if last_error_text:
                    details.append(f"last_error={last_error_text}")
                detail_text = message
                if details:
                    detail_text = f"{message}; " + ", ".join(details)

                logger.error(detail_text)
                await save_context(redis, x_session_id, payload, detail_text)

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=detail_text,
                )

            # Streaming mode via candidate providers.
            async def routed_iterator() -> AsyncIterator[bytes]:
                last_status: Optional[int] = None
                last_error_text: Optional[str] = None

                for idx, cand in enumerate(ordered_candidates):
                    url = cand.upstream.endpoint
                    provider_id = cand.upstream.provider_id
                    model_id = cand.upstream.model_id
                    headers = _build_provider_headers(provider_id)
                    is_last = idx == len(ordered_candidates) - 1

                    logger.info(
                        "chat_completions: starting streaming request to "
                        "provider=%s model=%s url=%s (candidate %d/%d)",
                        provider_id,
                        model_id,
                        url,
                        idx + 1,
                        len(ordered_candidates),
                    )

                    try:
                        first_chunk = True
                        upstream_payload = dict(payload)
                        upstream_payload["model"] = model_id

                        async for chunk in stream_upstream(
                            client=client,
                            method="POST",
                            url=url,
                            headers=headers,
                            json_body=upstream_payload,
                            redis=redis,
                            session_id=x_session_id,
                        ):
                            if first_chunk:
                                first_chunk = False
                                await _bind_session_for_upstream(
                                    provider_id, model_id
                                )
                                logger.info(
                                    "chat_completions: received first streaming "
                                    "chunk from provider=%s model=%s",
                                    provider_id,
                                    model_id,
                                )
                            yield chunk

                        # Stream finished successfully, stop iterating.
                        logger.info(
                            "chat_completions: streaming finished successfully "
                            "for provider=%s model=%s",
                            provider_id,
                            model_id,
                        )
                        return
                    except UpstreamStreamError as err:
                        last_status = err.status_code
                        last_error_text = err.text
                        retryable = _is_retryable_upstream_status(
                            provider_id, err.status_code
                        )

                        logger.warning(
                            "Upstream streaming error for %s "
                            "(provider=%s, model=%s, status=%s); retryable=%s",
                            url,
                            provider_id,
                            model_id,
                            err.status_code,
                            retryable,
                        )

                        if retryable and not is_last:
                            # Try next candidate without sending anything
                            # downstream yet.
                            continue

                        # Either not retryable or no more candidates: emit a
                        # final SSE-style error frame and stop.
                        try:
                            payload_json = json.loads(err.text)
                        except json.JSONDecodeError:
                            payload_json = {
                                "error": {
                                    "type": "upstream_error",
                                    "status": err.status_code,
                                    "message": err.text,
                                }
                            }

                        error_chunk = (
                            f"data: {json.dumps(payload_json, ensure_ascii=False)}\n\n"
                        ).encode("utf-8")

                        # Save error into context for debugging.
                        await save_context(
                            redis,
                            x_session_id,
                            payload,
                            error_chunk.decode("utf-8", errors="ignore"),
                        )

                        yield error_chunk
                        return

                # Safety net: if the loop exits unexpectedly, emit a generic error.
                generic_payload = {
                    "error": {
                        "type": "upstream_error",
                        "status": last_status,
                        "message": last_error_text
                        or "All upstream providers failed during streaming",
                    }
                }
                error_chunk = (
                    f"data: {json.dumps(generic_payload, ensure_ascii=False)}\n\n"
                ).encode("utf-8")

                await save_context(
                    redis,
                    x_session_id,
                    payload,
                    error_chunk.decode("utf-8", errors="ignore"),
                )

                yield error_chunk

            return StreamingResponse(
                routed_iterator(), media_type="text/event-stream"
            )

    @app.post(
        "/v1/responses",
        dependencies=[Depends(require_api_key)],
    )
    async def responses_endpoint(
        request: Request,
        client: httpx.AsyncClient = Depends(get_http_client),
        redis=Depends(get_redis),
        x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id"),
        raw_body: Dict[str, Any] = Body(...),
    ):
        """
        OpenAI Responses API 兼容端点，默认以 Responses 形态透传到上游。
        """
        passthrough_payload = dict(raw_body)
        passthrough_payload["_apiproxy_api_style"] = "responses"
        passthrough_payload["_apiproxy_skip_normalize"] = True
        passthrough = True
        forward_body = (
            passthrough_payload if passthrough else _adapt_responses_payload(raw_body)
        )

        base_response = await chat_completions(
            request=request,
            client=client,
            redis=redis,
            x_session_id=x_session_id,
            raw_body=forward_body,
        )
        if isinstance(base_response, StreamingResponse):
            if passthrough:
                return base_response
            return _wrap_chat_stream_response(base_response)

        if isinstance(base_response, JSONResponse):
            if passthrough:
                return base_response
            try:
                payload_bytes = base_response.body
                chat_payload = json.loads(payload_bytes.decode("utf-8"))
            except (json.JSONDecodeError, AttributeError, UnicodeDecodeError):
                return base_response

            responses_payload = _chat_to_responses_payload(chat_payload)
            headers = dict(base_response.headers)
            headers.pop("content-length", None)
            return JSONResponse(
                content=responses_payload,
                status_code=base_response.status_code,
                headers=headers,
            )
        return base_response

    @app.get(
        "/context/{session_id}",
        dependencies=[Depends(require_api_key)],
    )
    async def get_context(
        session_id: str,
        redis=Depends(get_redis),
    ):
        """
        Simple endpoint to inspect stored conversation context for a session.
        """
        key = f"session:{session_id}:history"
        items = await redis.lrange(key, 0, -1)
        return {"session_id": session_id, "history": items}

    return app

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

        # First normalize payload based on model/provider conventions
        # (e.g. Gemini-style `input` -> OpenAI-style `messages`).
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

        api_style = detect_request_format(payload)
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

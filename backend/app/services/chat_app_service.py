from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover
    Redis = object  # type: ignore

from app.auth import AuthenticatedAPIKey
from app.errors import bad_request, not_found
from app.jwt_auth import AuthenticatedUser
from app.models import APIKey
from app.services.chat_history_service import (
    create_assistant_message_after_user,
    create_user_message,
    get_assistant,
    get_conversation,
)
from app.services.chat_run_service import build_openai_request_payload, create_run_record, execute_run_non_stream
from app.services.credit_service import InsufficientCreditsError, ensure_account_usable
from app.services.bandit_policy_service import recommend_challengers
from app.services.context_features_service import build_rule_context_features
from app.services.project_eval_config_service import (
    DEFAULT_PROVIDER_SCOPES,
    get_effective_provider_ids_for_user,
    get_or_default_project_eval_config,
    resolve_project_context,
)
from app.services.project_chat_settings_service import DEFAULT_PROJECT_CHAT_MODEL
from app.api.v1.chat.provider_selector import ProviderSelector
from app.api.v1.chat.request_handler import RequestHandler


PROJECT_INHERIT_SENTINEL = "__project__"


def _to_authenticated_api_key(
    *,
    api_key: APIKey,
    current_user: AuthenticatedUser,
) -> AuthenticatedAPIKey:
    return AuthenticatedAPIKey(
        id=UUID(str(api_key.id)),
        user_id=UUID(str(api_key.user_id)),
        user_username=current_user.username,
        is_superuser=bool(current_user.is_superuser),
        name=api_key.name,
        is_active=bool(api_key.is_active),
        disabled_reason=api_key.disabled_reason,
        has_provider_restrictions=bool(api_key.has_provider_restrictions),
        allowed_provider_ids=list(api_key.allowed_provider_ids),
    )

def _sanitize_conversation_title(value: str) -> str:
    title = (value or "").strip()
    if not title:
        return ""

    # Remove common wrapping quotes
    if len(title) >= 2 and title[0] == title[-1] and title[0] in {"'", '"', "“", "”", "‘", "’", "《", "》"}:
        title = title[1:-1].strip()

    # Collapse whitespace
    title = " ".join(title.split())

    # Conservative max length (DB: 255)
    if len(title) > 60:
        title = title[:60].rstrip()
    return title


def _extract_first_choice_text(payload: dict[str, Any] | None) -> str | None:
    if not isinstance(payload, dict):
        return None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    first = choices[0]
    if not isinstance(first, dict):
        return None
    message = first.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content
    content = first.get("text")
    if isinstance(content, str) and content.strip():
        return content
    return None


def _truncate_title_input(value: str, *, max_len: int = 1000) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip()


async def _maybe_auto_title_conversation(
    db: Session,
    *,
    redis: Redis,
    client: Any,
    current_user: AuthenticatedUser,
    conv: Any,
    assistant: Any,
    effective_provider_ids: set[str],
    user_text: str,
    user_sequence: int,
    requested_model_for_title_fallback: str,
) -> None:
    """
    在首条 user 消息发送后，若会话尚无 title，则尝试用“标题模型”自动生成标题（尽力而为）。
    """
    if (conv.title or "").strip():
        return

    # Only auto-title on first user message (sequence=1)
    if int(user_sequence or 0) != 1:
        return

    try:
        # Optional second check: avoid going negative right after baseline if credit check is enabled.
        ensure_account_usable(db, user_id=UUID(str(current_user.id)))
    except InsufficientCreditsError:
        return
    except Exception:
        # Credit check failures should never block message sending.
        return

    # Use the same project context for billing/provider access.
    ctx = resolve_project_context(db, project_id=UUID(str(conv.api_key_id)), current_user=current_user)

    title_model_raw = (getattr(assistant, "title_logical_model", None) or "").strip()
    if not title_model_raw:
        return

    if title_model_raw == PROJECT_INHERIT_SENTINEL:
        title_model_raw = (getattr(ctx.api_key, "chat_title_logical_model", None) or "").strip()
        if not title_model_raw:
            return

    title_model = requested_model_for_title_fallback if title_model_raw == "auto" else title_model_raw
    if not title_model:
        return

    system_prompt = (
        "You are a conversation title generator.\n"
        "Task: Generate a short title for the conversation based on the user's FIRST message.\n"
        "Language: The title MUST be in the same language as the user's message (match script/locale). "
        "If the user's message is mixed-language, use the dominant language.\n"
        "Rules:\n"
        "- Output ONLY the title.\n"
        "- No quotes, no markdown, no emojis, no extra punctuation at the end.\n"
        "- Single line.\n"
        "- Length: <= 20 CJK characters OR <= 8 English words; for other languages keep it short (<= 10 words).\n"
    )

    user_text = _truncate_title_input(user_text, max_len=1000)
    if not user_text:
        return

    payload: dict[str, Any] = {
        "model": title_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
        "temperature": 0.2,
        "max_tokens": 48,
    }

    auth_key = _to_authenticated_api_key(api_key=ctx.api_key, current_user=current_user)

    handler = RequestHandler(api_key=auth_key, db=db, redis=redis, client=client)
    resp = await handler.handle(
        payload=payload,
        requested_model=title_model,
        lookup_model_id=title_model,
        api_style="openai",
        effective_provider_ids=effective_provider_ids,
        session_id=str(conv.id),
        assistant_id=UUID(str(getattr(assistant, "id", None))) if getattr(assistant, "id", None) else None,
        billing_reason="conversation_title",
    )

    if int(getattr(resp, "status_code", 500)) >= 400:
        return

    response_payload: dict[str, Any] | None = None
    try:
        raw = resp.body.decode("utf-8", errors="ignore")
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            response_payload = parsed
    except Exception:
        response_payload = None

    raw_title = _extract_first_choice_text(response_payload)
    title = _sanitize_conversation_title(raw_title or "")
    if not title:
        return

    conv.title = title
    db.add(conv)
    db.commit()
    db.refresh(conv)


async def send_message_and_run_baseline(
    db: Session,
    *,
    redis: Redis,
    client: Any,
    current_user: AuthenticatedUser,
    conversation_id: UUID,
    content: str,
    override_logical_model: str | None = None,
    model_preset: dict | None = None,
) -> tuple[UUID, UUID]:
    """
    创建 user message 并同步执行 baseline run，随后写入 assistant message（用于历史上下文）。

    Returns:
        (message_id, baseline_run_id)
    """
    conv = get_conversation(db, conversation_id=conversation_id, user_id=UUID(str(current_user.id)))
    ctx = resolve_project_context(db, project_id=UUID(str(conv.api_key_id)), current_user=current_user)

    # 余额校验（沿用网关规则）
    try:
        ensure_account_usable(db, user_id=UUID(str(current_user.id)))
    except InsufficientCreditsError as exc:
        raise bad_request(
            "积分不足",
            details={"code": "CREDIT_NOT_ENOUGH", "balance": exc.balance},
        )

    assistant = get_assistant(db, assistant_id=UUID(str(conv.assistant_id)), user_id=UUID(str(current_user.id)))
    requested_model = override_logical_model or assistant.default_logical_model
    if requested_model == PROJECT_INHERIT_SENTINEL:
        requested_model = (getattr(ctx.api_key, "chat_default_logical_model", None) or "").strip() or DEFAULT_PROJECT_CHAT_MODEL
    if not requested_model:
        raise bad_request("未指定模型")

    cfg = get_or_default_project_eval_config(db, project_id=ctx.project_id)
    
    effective_provider_ids = get_effective_provider_ids_for_user(
        db,
        user_id=UUID(str(current_user.id)),
        api_key=ctx.api_key,
        provider_scopes=list(getattr(cfg, "provider_scopes", None) or DEFAULT_PROVIDER_SCOPES),
    )

    if requested_model == "auto":
        candidates = list(cfg.candidate_logical_models or [])
        if not candidates:
            raise bad_request(
                "当前助手默认模型为 auto，但项目未配置 candidate_logical_models",
                details={"project_id": str(ctx.project_id)},
            )

        # 用 assistant preset（+override）构造一个“能力/预算判定用”的轻量 payload：
        # - 只需要 tools / max_tokens 等字段即可用于候选池过滤；
        # - messages 依赖实际历史上下文，这里不强依赖。
        preset_payload: dict[str, Any] = {}
        if isinstance(assistant.model_preset, dict):
            preset_payload.update(assistant.model_preset)
        if isinstance(model_preset, dict):
            preset_payload.update(model_preset)

        # 过滤不可用/无权限/故障的模型
        selector = ProviderSelector(client=client, redis=redis, db=db)
        candidates = await selector.check_candidate_availability(
            candidate_logical_models=candidates,
            effective_provider_ids=effective_provider_ids,
            api_style="openai",  # 默认聊天场景
            user_id=UUID(str(current_user.id)),
            is_superuser=current_user.is_superuser,
            request_payload=preset_payload or None,
            budget_credits=cfg.budget_per_eval_credits,
        )

        if not candidates:
             raise bad_request(
                "auto 模式下无可用的候选模型（均被禁用或无健康上游）",
                details={"project_id": str(ctx.project_id)},
            )

        rec = recommend_challengers(
            db,
            project_id=ctx.project_id,
            assistant_id=UUID(str(assistant.id)),
            baseline_logical_model="auto",
            user_text=content,
            context_features=build_rule_context_features(user_text=content, request_payload=None),
            candidate_logical_models=candidates,
            k=1,
            policy_version="ts-v1",
        )
        if not rec.candidates:
            raise bad_request(
                "auto 模式下无法选择候选模型",
                details={"project_id": str(ctx.project_id)},
            )
        requested_model = rec.candidates[0].logical_model

    user_message = create_user_message(db, conversation=conv, content_text=content)
    payload = build_openai_request_payload(
        db,
        conversation=conv,
        assistant=assistant,
        user_message=user_message,
        requested_logical_model=requested_model,
        model_preset_override=model_preset,
    )

    run = create_run_record(
        db,
        user_id=UUID(str(current_user.id)),
        api_key_id=ctx.project_id,
        message_id=UUID(str(user_message.id)),
        requested_logical_model=requested_model,
        request_payload=payload,
    )

    auth_key = _to_authenticated_api_key(api_key=ctx.api_key, current_user=current_user)
    run = await execute_run_non_stream(
        db,
        redis=redis,
        client=client,
        api_key=auth_key,
        effective_provider_ids=effective_provider_ids,
        conversation=conv,
        assistant=assistant,
        user_message=user_message,
        run=run,
        requested_logical_model=requested_model,
        model_preset_override=model_preset,
    )

    # baseline 成功时写入 assistant message，作为后续上下文
    if run.status == "succeeded" and run.output_text:
        create_assistant_message_after_user(
            db,
            conversation_id=UUID(str(conv.id)),
            user_sequence=int(user_message.sequence or 0),
            content_text=run.output_text,
        )

    # Auto-title conversation based on the first user question (best-effort)
    try:
        if int(user_message.sequence or 0) == 1 and not (conv.title or "").strip():
            await _maybe_auto_title_conversation(
                db,
                redis=redis,
                client=client,
                current_user=current_user,
                conv=conv,
                assistant=assistant,
                effective_provider_ids=effective_provider_ids,
                user_text=content,
                user_sequence=int(user_message.sequence or 0),
                requested_model_for_title_fallback=requested_model,
            )
    except Exception:  # pragma: no cover - best-effort only
        # Never break the main chat flow for title generation.
        pass

    return UUID(str(user_message.id)), UUID(str(run.id))


__all__ = ["send_message_and_run_baseline"]

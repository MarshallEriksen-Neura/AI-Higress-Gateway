from __future__ import annotations

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
from app.services.project_eval_config_service import (
    DEFAULT_PROVIDER_SCOPES,
    get_effective_provider_ids_for_user,
    get_or_default_project_eval_config,
    resolve_project_context,
)


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
    if not requested_model:
        raise bad_request("未指定模型")

    cfg = get_or_default_project_eval_config(db, project_id=ctx.project_id)
    if requested_model == "auto":
        candidates = list(cfg.candidate_logical_models or [])
        if not candidates:
            raise bad_request(
                "当前助手默认模型为 auto，但项目未配置 candidate_logical_models",
                details={"project_id": str(ctx.project_id)},
            )
        rec = recommend_challengers(
            db,
            project_id=ctx.project_id,
            assistant_id=UUID(str(assistant.id)),
            baseline_logical_model="auto",
            user_text=content,
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

    effective_provider_ids = get_effective_provider_ids_for_user(
        db,
        user_id=UUID(str(current_user.id)),
        api_key=ctx.api_key,
        provider_scopes=list(getattr(cfg, "provider_scopes", None) or DEFAULT_PROVIDER_SCOPES),
    )

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

    return UUID(str(user_message.id)), UUID(str(run.id))


__all__ = ["send_message_and_run_baseline"]

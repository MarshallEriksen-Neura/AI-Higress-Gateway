from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session as DbSession

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover
    Redis = object  # type: ignore[misc,assignment]

from app.api.v1.chat.request_handler import RequestHandler
from app.auth import AuthenticatedAPIKey
from app.utils.response_utils import extract_first_choice_text, parse_json_response_body


_SYSTEM_PROMPT = (
    "你是一个“用户长期记忆提取器”。\n"
    "目标：从一段最近的对话中提取“对未来有用、且相对稳定”的用户信息。\n"
    "只输出记忆内容本身，不要解释，不要 Markdown。\n"
    "若没有新的、值得保存的长期记忆，请输出空字符串。\n"
    "严禁输出任何密钥/密码/token/API key 等敏感信息（即使对话中出现）。\n"
)


def _build_user_prompt(transcript: str) -> str:
    return (
        "请提取这段对话中关于用户的长期事实（如喜好、职业、计划、人际关系、长期约束）。\n"
        "如果没有新事实，返回空。\n\n"
        "对话内容：\n"
        f"{transcript}\n"
    )


async def extract_long_term_user_memory(
    db: DbSession,
    *,
    redis: Redis,
    client: Any,
    api_key: AuthenticatedAPIKey,
    effective_provider_ids: set[str],
    extractor_logical_model: str,
    transcript: str,
    idempotency_key: str,
) -> str:
    """
    Best-effort memory extraction using a cheap chat model.

    Returns extracted memory text; empty string means "no new memory".
    """
    model = str(extractor_logical_model or "").strip()
    if not model:
        return ""

    text = (transcript or "").strip()
    if not text:
        return ""

    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(text)},
        ],
        "temperature": 0.0,
        "max_tokens": 256,
    }

    handler = RequestHandler(api_key=api_key, db=db, redis=redis, client=client)
    resp = await handler.handle(
        payload=payload,
        requested_model=model,
        lookup_model_id=model,
        api_style="openai",
        effective_provider_ids=effective_provider_ids,
        idempotency_key=idempotency_key,
        billing_reason="chat_memory_extract",
    )
    response_payload = parse_json_response_body(resp)
    extracted = (extract_first_choice_text(response_payload) or "").strip()
    return extracted


__all__ = ["extract_long_term_user_memory"]


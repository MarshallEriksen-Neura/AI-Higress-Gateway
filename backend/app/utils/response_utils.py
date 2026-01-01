"""
Response 公共工具函数

提供 API 响应解析的通用功能：
- 提取 OpenAI 格式响应中的文本
- 解析 JSON 响应
"""
from __future__ import annotations

import json
from typing import Any


def extract_first_choice_text(payload: dict[str, Any] | None) -> str | None:
    """
    从 OpenAI 格式的响应中提取第一个 choice 的文本内容。

    支持的响应格式：
    - choices[0].message.content (Chat Completions)
    - choices[0].text (Completions)

    Args:
        payload: OpenAI 格式的响应字典

    Returns:
        提取的文本内容，如果不存在则返回 None

    Examples:
        >>> payload = {"choices": [{"message": {"content": "Hello"}}]}
        >>> extract_first_choice_text(payload)
        'Hello'
    """
    if not isinstance(payload, dict):
        return None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    first = choices[0]
    if not isinstance(first, dict):
        return None

    # Chat Completions 格式
    message = first.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content

    # Completions 格式
    content = first.get("text")
    if isinstance(content, str) and content.strip():
        return content

    return None


def parse_json_response_body(resp) -> dict[str, Any] | None:
    """
    从 FastAPI 响应对象解析 JSON body。

    Args:
        resp: FastAPI JSONResponse 对象

    Returns:
        解析后的字典，如果解析失败则返回 None
    """
    try:
        raw = resp.body.decode("utf-8", errors="ignore")
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return None
    return None


def safe_text_from_message_content(content: Any) -> str:
    """
    安全地从消息内容中提取文本。

    支持的格式：
    - {"type": "text", "text": "..."}
    - {"text": "..."}

    Args:
        content: 消息内容（可能是字典或其他类型）

    Returns:
        提取的文本，如果无法提取则返回空字符串
    """
    if not isinstance(content, dict):
        return ""
    if str(content.get("type") or "") == "text":
        text = content.get("text")
        if isinstance(text, str):
            return text
    text = content.get("text")
    if isinstance(text, str):
        return text
    return ""


__all__ = [
    "extract_first_choice_text",
    "parse_json_response_body",
    "safe_text_from_message_content",
]

"""
Payload 公共工具函数

提供请求/响应 payload 处理的通用功能：
- 深度合并字典
- 提取 vendor 扩展字段
- 可重试异常
"""
from __future__ import annotations

from typing import Any


class RetryableCandidateError(Exception):
    """
    表示当前候选 provider 失败但可以重试下一个候选的异常。
    用于 provider failover 循环中的流程控制。
    """

    pass


def deep_merge_dict(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """
    递归地将 override 合并到 base 中（会修改 base）。

    Args:
        base: 基础字典（会被修改）
        override: 要合并的字典

    Returns:
        合并后的 base 字典

    Examples:
        >>> base = {"a": 1, "b": {"c": 2}}
        >>> override = {"b": {"d": 3}, "e": 4}
        >>> deep_merge_dict(base, override)
        {'a': 1, 'b': {'c': 2, 'd': 3}, 'e': 4}
    """
    for key, value in override.items():
        if key in base and isinstance(base.get(key), dict) and isinstance(value, dict):
            deep_merge_dict(base[key], value)  # type: ignore[index]
            continue
        base[key] = value
    return base


def get_vendor_extra(request: Any, vendor: str) -> dict[str, Any] | None:
    """
    从请求对象的 extra_body 中提取指定 vendor 的扩展配置。

    Args:
        request: 请求对象（需要有 extra_body 属性）
        vendor: vendor 名称，如 "openai", "google", "gateway"

    Returns:
        vendor 扩展配置字典，如果不存在则返回 None

    Examples:
        >>> # request.extra_body = {"openai": {"some_field": "value"}}
        >>> get_vendor_extra(request, "openai")
        {'some_field': 'value'}
    """
    extra = getattr(request, "extra_body", None)
    if not isinstance(extra, dict):
        return None
    payload = extra.get(vendor)
    if not isinstance(payload, dict):
        return None
    return payload


def has_header(headers: dict[str, str] | None, name: str) -> bool:
    """
    检查 headers 中是否包含指定名称的 header（忽略大小写）。

    Args:
        headers: HTTP headers 字典
        name: 要检查的 header 名称

    Returns:
        如果存在则返回 True
    """
    if not headers:
        return False
    target = name.strip().lower()
    for key in headers.keys():
        if str(key).strip().lower() == target:
            return True
    return False


__all__ = [
    "RetryableCandidateError",
    "deep_merge_dict",
    "get_vendor_extra",
    "has_header",
]

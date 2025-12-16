from __future__ import annotations


def test_provider_key_export_backward_compatibility():
    """
    回归测试：历史代码可能仍会从 app.models 导入 ProviderKey。

    当前实现中 ProviderKey 为 ProviderAPIKey 的别名，用于向后兼容。
    """
    from app.models import ProviderAPIKey, ProviderKey

    assert ProviderKey is ProviderAPIKey


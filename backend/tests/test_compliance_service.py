from app.services.compliance_service import (
    apply_content_policy,
    redact_for_storage,
)


def test_block_on_sensitive_string():
    text = "my email is test@example.com and key sk-1234567890ABCDEF"
    result = apply_content_policy(text, action="block", mask_token="***", mask_output=False)
    assert result.blocked is True
    assert result.findings  # should detect at least one sensitive fragment


def test_mask_output_when_enabled():
    text = "token sk-ABCDEFGH12345678"
    result = apply_content_policy(text, action="mask", mask_token="***", mask_output=True)
    assert result.blocked is False
    assert result.redacted != text
    assert "***" in result.redacted


def test_redact_for_storage_masks_nested_payload():
    payload = {"messages": [{"content": "contact me at foo@bar.com"}]}
    redacted = redact_for_storage(payload, "***")
    assert redacted != payload
    assert "foo@bar.com" not in str(redacted)

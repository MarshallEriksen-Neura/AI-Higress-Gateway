from pydantic import BaseModel, Field


class SecretKeyGenerationRequest(BaseModel):
    length: int = Field(default=64, ge=32, le=256, description="密钥长度")


class SecretKeyResponse(BaseModel):
    secret_key: str = Field(..., description="生成的系统密钥")


class SystemAdminInitRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="管理员用户名")
    email: str = Field(..., description="管理员邮箱")
    display_name: str = Field(default="System Administrator", description="管理员显示名称")


class SystemAdminInitResponse(BaseModel):
    username: str
    email: str
    password: str
    api_key: str


class KeyValidationRequest(BaseModel):
    key: str = Field(..., description="要验证的密钥")


class KeyValidationResponse(BaseModel):
    is_valid: bool = Field(..., description="密钥是否有效")
    message: str = Field(..., description="验证结果消息")


class ProviderLimitsResponse(BaseModel):
    """系统级提供商限制配置。"""

    default_user_private_provider_limit: int
    max_user_private_provider_limit: int
    require_approval_for_shared_providers: bool


class ProviderLimitsUpdateRequest(BaseModel):
    default_user_private_provider_limit: int = Field(ge=0)
    max_user_private_provider_limit: int = Field(ge=0)
    require_approval_for_shared_providers: bool


__all__ = [
    "KeyValidationRequest",
    "KeyValidationResponse",
    "ProviderLimitsResponse",
    "ProviderLimitsUpdateRequest",
    "SecretKeyGenerationRequest",
    "SecretKeyResponse",
    "SystemAdminInitRequest",
    "SystemAdminInitResponse",
]

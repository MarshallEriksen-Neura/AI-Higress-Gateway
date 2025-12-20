from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int  # 访问令牌过期时间（秒）


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: str = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, description="密码")
    display_name: str = None


class OAuthCallbackRequest(BaseModel):
    code: str = Field(..., description="LinuxDo 授权码")
    state: str | None = Field(
        default=None,
        description="state 参数，需与授权请求生成的一致",
    )


class OAuthCallbackResponse(TokenResponse):
    user: UserResponse


__all__ = [
    "LoginRequest",
    "OAuthCallbackRequest",
    "OAuthCallbackResponse",
    "RefreshTokenRequest",
    "RegisterRequest",
    "TokenResponse",
]

from pydantic import BaseModel, ConfigDict, Field


class Session(BaseModel):
    """
    会话粘性（routing stickiness）记录。

    与 docs/api/API_Documentation.md 中的「会话管理」返回结构保持一致。
    """

    conversation_id: str = Field(..., description="Conversation id")
    logical_model: str = Field(..., description="Logical model id")
    provider_id: str = Field(..., description="Provider id")
    model_id: str = Field(..., description="Model id")
    created_at: float = Field(..., description="Created timestamp (epoch seconds)")
    # 对外输出使用 last_used_at（历史文档字段）；内部统一使用 last_accessed
    last_accessed: float = Field(
        ...,
        alias="last_used_at",
        description="Last accessed timestamp (epoch seconds)",
    )

    # 内部字段：不对外输出，但会持久化到 Redis，并用于测试断言
    message_count: int = Field(0, ge=0, exclude=True)

    model_config = ConfigDict(populate_by_name=True)


__all__ = ["Session"]

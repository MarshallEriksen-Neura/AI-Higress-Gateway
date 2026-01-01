from typing import Any, Optional, Literal

from pydantic import BaseModel, Field


class VideoGenerationRequest(BaseModel):
    """
    网关侧“视频生成”统一请求模型（面向多上游适配）。

    说明：
    - OpenAI Sora：POST /v1/videos（multipart），常用字段：prompt/model/size/seconds
    - Gemini Veo：POST ...:predictLongRunning（JSON），常用字段：instances[].prompt + parameters
    """

    prompt: str = Field(..., description="A text description of the desired video.")
    model: str = Field(..., description="The model to use for video generation.")
    size: Optional[str] = Field(default="1280x720", description="Video frame size, e.g. 1280x720.")
    seconds: Optional[int] = Field(default=8, ge=1, description="Length of the output video in seconds.")

    # Standard (optional): unified semantics across common providers.
    aspect_ratio: Optional[Literal["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]] = Field(
        default=None,
        description="Aspect ratio hint. When `size` is provided, gateway may ignore this field.",
    )
    resolution: Optional[Literal["480p", "720p", "1080p"]] = Field(
        default=None,
        description="Resolution hint. When `size` is provided, gateway may ignore this field.",
    )
    negative_prompt: Optional[str] = Field(
        default=None,
        description="Text describing what not to include in the video (if supported by upstream).",
        max_length=20000,
    )
    seed: Optional[int] = Field(
        default=None,
        ge=0,
        description="Optional random seed (if supported by upstream).",
    )
    fps: Optional[int] = Field(
        default=None,
        ge=1,
        le=120,
        description="Frames per second hint (if supported by upstream).",
    )
    num_outputs: Optional[int] = Field(
        default=None,
        ge=1,
        le=4,
        description="Number of output videos to generate (if supported by upstream).",
    )
    generate_audio: Optional[bool] = Field(
        default=None,
        description="Whether to generate accompanying audio (if supported by upstream).",
    )
    image_url: Optional[str] = Field(
        default=None,
        description="URL of the input image for image-to-video generation.",
    )
    audio_url: Optional[str] = Field(
        default=None,
        description="URL of the input audio for audio-driven generation.",
    )
    enhance_prompt: Optional[bool] = Field(
        default=None,
        description="Whether to let upstream enhance/expand prompt (if supported by upstream).",
    )

    extra_body: dict[str, Any] | None = Field(
        default=None,
        description=(
            "网关保留扩展字段：用于透传特定上游厂商的高级参数。"
            "约定结构：{ \"openai\": {...}, \"google\": {...} }。"
            "网关会在选中对应 lane 时将其合并到上游请求体中。"
        ),
    )


class VideoObject(BaseModel):
    url: Optional[str] = None
    object_key: Optional[str] = None
    revised_prompt: Optional[str] = None


class VideoGenerationResponse(BaseModel):
    created: int = Field(..., description="The Unix timestamp (in seconds) when the request was created.")
    data: list[VideoObject] = Field(..., description="List of generated videos.")

from typing import Optional, Literal

from pydantic import BaseModel, Field


class ImageGenerationRequest(BaseModel):
    """
    Request body for image generation, compatible with OpenAI API.
    """
    prompt: str = Field(..., description="A text description of the desired image(s).")
    model: str = Field(..., description="The model to use for image generation.")
    n: int = Field(default=1, description="The number of images to generate. Must be between 1 and 10.", ge=1, le=10)
    quality: Optional[Literal["standard", "hd"]] = Field(default="standard", description="The quality of the image that will be generated.")
    response_format: Optional[Literal["url", "b64_json"]] = Field(default="url", description="The format in which the generated images are returned.")
    size: Optional[str] = Field(default="1024x1024", description="The size of the generated images.")
    style: Optional[Literal["vivid", "natural"]] = Field(default="vivid", description="The style of the generated images.")
    user: Optional[str] = Field(None, description="A unique identifier representing your end-user.")


class ImageObject(BaseModel):
    url: Optional[str] = None
    b64_json: Optional[str] = None
    revised_prompt: Optional[str] = None


class ImageGenerationResponse(BaseModel):
    created: int = Field(..., description="The Unix timestamp (in seconds) of when the request was created.")
    data: list[ImageObject] = Field(..., description="List of generated images.")

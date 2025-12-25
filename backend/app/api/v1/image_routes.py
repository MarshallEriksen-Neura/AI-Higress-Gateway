from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import ValidationError

from app.schemas.image import ImageGenerationRequest, ImageGenerationResponse
from app.services.image_app_service import ImageAppService
from app.deps import get_current_api_key

router = APIRouter()

@router.post(
    "/images/generations",
    response_model=ImageGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate images from text",
    description="Creates an image given a prompt.",
)
async def generate_image(
    request: ImageGenerationRequest,
    api_key: Annotated[str, Depends(get_current_api_key)],  # 获取 Bearer Token
):
    """
    OpenAI-compatible image generation endpoint.
    Currently supports:
    - gemini-2.5-flash-image
    """
    service = ImageAppService()
    try:
        return await service.generate_image(request, api_key)
    except Exception as e:
        # 简单的错误透传，实际生产中应有更细致的错误处理
        raise HTTPException(status_code=500, detail=str(e))

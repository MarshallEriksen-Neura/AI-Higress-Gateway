import base64
import time
import uuid
from typing import List

from fastapi import HTTPException

from app.provider import google_sdk
from app.schemas.image import ImageGenerationRequest, ImageGenerationResponse, ImageObject
from app.schemas.model import Model


class ImageAppService:
    async def generate_image(self, request: ImageGenerationRequest, api_key: str) -> ImageGenerationResponse:
        """
        统一的文生图入口。根据 request.model 分发到不同的 Provider。
        """
        
        # 目前主要支持 gemini-2.5-flash-image
        if "gemini" in request.model or "flash-image" in request.model:
            return await self._generate_with_google(request, api_key)
        
        # 可以在这里扩展 OpenAI DALL-E, Stability AI 等
        if "dall-e" in request.model:
             raise HTTPException(status_code=501, detail="DALL-E support coming soon.")

        raise HTTPException(status_code=400, detail=f"Unsupported image generation model: {request.model}")

    async def _generate_with_google(self, request: ImageGenerationRequest, api_key: str) -> ImageGenerationResponse:
        """
        适配 Google Gemini 2.5 Flash Image
        """
        # 1. 构造 Google 格式的 Payload
        # Google 的 generateContent 接口接收 contents -> parts -> text
        payload = {
            "contents": [{
                "parts": [
                    {"text": request.prompt}
                ]
            }],
            # 可以根据 request.n, request.size 等参数调整 generationConfig
            # 注意: Gemini 目前对 size/aspectRatio 的支持方式可能与 OpenAI 不同，这里暂不做复杂映射
            "generationConfig": {
                "responseMimeType": "image/jpeg", # 强制要求返回图片
                "candidateCount": request.n
            }
        }

        # 2. 调用 SDK
        try:
            # 复用现有的 google_sdk.generate_content
            # 注意：我们需要确保 google_sdk 能处理返回的 binary/image 数据而不报错
            # 如果 google_sdk 内部强制解析 text，可能需要调整。
            # 先假设它返回原始 dict，我们需要从中提取 inlineData
            response_dict = await google_sdk.generate_content(
                api_key=api_key,
                model_id=request.model,
                payload=payload,
                base_url=None # 使用默认 Google URL
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Google provider error: {str(e)}")

        # 3. 解析 Response 并转换为 OpenAI 格式
        image_objects: List[ImageObject] = []
        
        candidates = response_dict.get("candidates", [])
        if not candidates:
             raise HTTPException(status_code=500, detail="No candidates returned from Google.")

        for candidate in candidates:
            parts = candidate.get("content", {}).get("parts", [])
            for part in parts:
                # 检查 inlineData (Base64)
                inline_data = part.get("inline_data") or part.get("inlineData")
                if inline_data:
                    b64_data = inline_data.get("data")
                    mime_type = inline_data.get("mime_type") or inline_data.get("mimeType")
                    
                    if request.response_format == "b64_json":
                         image_objects.append(ImageObject(b64_json=b64_data, revised_prompt=request.prompt))
                    else:
                        # 如果用户请求 URL，但 Google 返回 Base64，我们暂时只能返回 Base64
                        # 或者我们可以上传到 OSS，但这增加了复杂性。
                        # 为了演示，我们构造一个 data URI 或者直接给 b64 (虽然不完全符合 url 语义)
                        # 标准的做法是：如果是 URL 模式，应该返回一个可以访问的链接。
                        # 简化起见，我们这里假设 Gateway 不做存储，直接返回 b64_json 或者是 Data URI
                        # 严格来说 OpenAI 的 url 是 http 链接。
                        # 这里我们做一个 fallback: 如果请求 url 但我们要么存起来，要么报错。
                        # 既然是 Gateway，这里先返回 b64_json 兼容一下，或者构造 Data URI
                        data_uri = f"data:{mime_type};base64,{b64_data}"
                        image_objects.append(ImageObject(url=data_uri, revised_prompt=request.prompt))

        return ImageGenerationResponse(
            created=int(time.time()),
            data=image_objects
        )

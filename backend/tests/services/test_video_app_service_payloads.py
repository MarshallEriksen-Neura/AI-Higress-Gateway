from __future__ import annotations

from app.schemas.video import VideoGenerationRequest
from app.services.video_app_service import (
    _build_google_veo_predict_payload,
    _build_openai_videos_multipart_fields,
)


def test_build_google_veo_payload_includes_standard_fields():
    req = VideoGenerationRequest(
        model="veo-3.1-generate-preview",
        prompt="a lion",
        aspect_ratio="16:9",
        negative_prompt="cartoon, low quality",
    )
    payload = _build_google_veo_predict_payload(request=req)
    assert payload["instances"][0]["prompt"] == "a lion"
    assert payload["parameters"]["aspectRatio"] == "16:9"
    assert payload["parameters"]["negativePrompt"] == "cartoon, low quality"


def test_build_openai_videos_multipart_fields_maps_size_from_hints():
    req = VideoGenerationRequest(
        model="sora-2",
        prompt="a cat",
        size=None,
        aspect_ratio="16:9",
        resolution="720p",
        seconds=8,
    )
    fields = _build_openai_videos_multipart_fields(request=req, model_id="sora-2")
    assert fields["prompt"][1] == "a cat"
    assert fields["model"][1] == "sora-2"
    assert fields["seconds"][1] == "8"
    assert fields["size"][1] == "1280x720"


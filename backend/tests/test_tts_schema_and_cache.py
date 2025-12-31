from __future__ import annotations

import pytest

from app.schemas.audio import SpeechRequest
from tests.utils import InMemoryRedis


@pytest.mark.parametrize("fmt", ["ogg", "flac", "aiff"])
def test_speech_request_accepts_extended_response_formats(fmt: str) -> None:
    req = SpeechRequest(
        model="auto",
        input="hello",
        voice="alloy",
        response_format=fmt,
        speed=1.0,
    )
    assert req.response_format == fmt


@pytest.mark.asyncio
async def test_inmemory_redis_bytes_roundtrip() -> None:
    redis = InMemoryRedis()
    payload = b"\x00\x01hello\xff"
    await redis.set("k", payload, ex=10)
    got = await redis.get("k")
    assert got == payload

from __future__ import annotations

import asyncio
import json

import pytest

from app.services.bridge_tool_runner import wait_for_bridge_result
from app.services.sse_parser import iter_sse_events


async def _aiter(chunks: list[bytes]):
    for chunk in chunks:
        yield chunk


@pytest.mark.asyncio
async def test_iter_sse_events_parses_crlf_frame_separator():
    chunks = [
        b"event: bridge\r\n"
        b"data: {\"type\":\"RESULT\",\"req_id\":\"r1\",\"payload\":{\"ok\":true}}\r\n"
        b"\r\n"
    ]

    events: list[tuple[str, str]] = []
    async for ev in iter_sse_events(_aiter(chunks)):
        events.append((ev.event, ev.data))

    assert events == [("bridge", "{\"type\":\"RESULT\",\"req_id\":\"r1\",\"payload\":{\"ok\":true}}")]


@pytest.mark.asyncio
async def test_wait_for_bridge_result_times_out_when_stream_never_yields_data_frames():
    hang = asyncio.Event()

    class StubGateway:
        async def stream_events(self):
            yield b": keepalive\r\n\r\n"
            await hang.wait()

    result = await wait_for_bridge_result(gateway=StubGateway(), req_id="req_1", timeout_seconds=0.05)

    assert result.ok is False
    assert result.error is not None
    assert result.error.get("code") == "invoke_timeout"


@pytest.mark.asyncio
async def test_wait_for_bridge_result_returns_result_payload():
    env = {
        "type": "RESULT",
        "req_id": "req_1",
        "payload": {"ok": True, "exit_code": 0, "canceled": False, "result_json": {"hello": "world"}},
    }
    frame = f"event: bridge\r\ndata: {json.dumps(env, ensure_ascii=False)}\r\n\r\n".encode("utf-8")

    class StubGateway:
        async def stream_events(self):
            yield frame

    result = await wait_for_bridge_result(gateway=StubGateway(), req_id="req_1", timeout_seconds=1.0)

    assert result.ok is True
    assert result.exit_code == 0
    assert result.canceled is False
    assert result.result_json == {"hello": "world"}

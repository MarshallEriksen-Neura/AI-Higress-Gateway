from __future__ import annotations

from collections.abc import AsyncIterator


class SSEEvent:
    def __init__(self, *, event: str, data: str) -> None:
        self.event = event
        self.data = data


async def iter_sse_events(byte_iter: AsyncIterator[bytes]) -> AsyncIterator[SSEEvent]:
    """
    Parse a text/event-stream response body from raw bytes.

    Notes:
    - This is a minimal parser for internal use (Gateway SSE).
    - Supports multi-line `data:` fields.
    """
    buffer = ""
    async for chunk in byte_iter:
        if not chunk:
            continue
        buffer += chunk.decode("utf-8", errors="ignore")

        while True:
            lf_idx = buffer.find("\n\n")
            crlf_idx = buffer.find("\r\n\r\n")

            if lf_idx == -1 and crlf_idx == -1:
                break

            if lf_idx == -1:
                idx = crlf_idx
                sep_len = 4
            elif crlf_idx == -1:
                idx = lf_idx
                sep_len = 2
            else:
                if lf_idx < crlf_idx:
                    idx = lf_idx
                    sep_len = 2
                else:
                    idx = crlf_idx
                    sep_len = 4

            frame = buffer[:idx]
            buffer = buffer[idx + sep_len :]

            event = "message"
            data_lines: list[str] = []
            for raw_line in frame.split("\n"):
                line = raw_line.rstrip("\r")
                if not line or line.startswith(":"):
                    continue
                if line.startswith("event:"):
                    event = line[len("event:") :].strip() or "message"
                    continue
                if line.startswith("data:"):
                    data_lines.append(line[len("data:") :].lstrip())
                    continue

            if not data_lines:
                continue
            yield SSEEvent(event=event, data="\n".join(data_lines))

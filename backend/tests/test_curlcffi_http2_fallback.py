import httpx
import pytest
from curl_cffi.const import CurlECode
from curl_cffi.curl import CurlError

from app.http_client import CurlCffiClient


@pytest.mark.asyncio
async def test_curlcffi_client_retries_http2_stream_error_with_http1(monkeypatch):
    calls: list[dict] = []

    class FakeResponse:
        status_code = 200
        headers = {}
        text = "ok"

    class FakeSession:
        async def close(self):
            return None

        async def post(self, url, **kwargs):
            calls.append({"url": url, "kwargs": kwargs})
            if kwargs.get("http_version") is None:
                raise CurlError("h2 broken", CurlECode.HTTP2_STREAM)
            return FakeResponse()

    monkeypatch.setattr("app.http_client.AsyncSession", lambda: FakeSession(), raising=True)

    async with CurlCffiClient() as client:
        resp = await client.post("https://example.invalid", json={"x": 1})

    assert resp.status_code == 200
    assert len(calls) == 2
    assert calls[0]["kwargs"].get("http_version") is None
    assert calls[1]["kwargs"]["http_version"] == "1.1"


@pytest.mark.asyncio
async def test_curlcffi_client_maps_curl_errors_to_httpx_error(monkeypatch):
    class FakeSession:
        async def close(self):
            return None

        async def post(self, *_args, **_kwargs):
            raise CurlError("connect failed", CurlECode.COULDNT_CONNECT)

    monkeypatch.setattr("app.http_client.AsyncSession", lambda: FakeSession(), raising=True)

    async with CurlCffiClient() as client:
        with pytest.raises(httpx.HTTPError):
            await client.post("https://example.invalid", json={"x": 1})


@pytest.mark.asyncio
async def test_curlcffi_stream_retries_http2_stream_error_with_http1(monkeypatch):
    stream_calls: list[dict] = []

    class FakeStreamResponse:
        status_code = 200
        headers = {}

        async def aiter_content(self, chunk_size=8192):
            yield b"data: ok\n\n"

        async def acontent(self):
            return b"data: ok\n\n"

    class FakeStreamContext:
        def __init__(self, *, should_fail: bool):
            self._should_fail = should_fail

        async def __aenter__(self):
            if self._should_fail:
                raise CurlError("h2 broken", CurlECode.HTTP2_STREAM)
            return FakeStreamResponse()

        async def __aexit__(self, exc_type, exc, tb):
            return False

    class FakeSession:
        async def close(self):
            return None

        def stream(self, method, url, **kwargs):
            stream_calls.append({"method": method, "url": url, "kwargs": kwargs})
            return FakeStreamContext(should_fail=kwargs.get("http_version") is None)

    monkeypatch.setattr("app.http_client.AsyncSession", lambda: FakeSession(), raising=True)

    async with CurlCffiClient() as client:
        async with client.stream("POST", "https://example.invalid", json={"x": 1}) as resp:
            assert resp.status_code == 200
            body = await resp.aread()
            assert body == b"data: ok\n\n"

    assert len(stream_calls) == 2
    assert stream_calls[0]["kwargs"].get("http_version") is None
    assert stream_calls[1]["kwargs"]["http_version"] == "1.1"


@pytest.mark.asyncio
async def test_curlcffi_client_applies_string_proxy_as_proxy_kwarg(monkeypatch):
    calls: list[dict] = []

    class FakeResponse:
        status_code = 200
        headers = {}

    class FakeSession:
        async def close(self):
            return None

        async def post(self, url, **kwargs):
            calls.append({"url": url, "kwargs": kwargs})
            return FakeResponse()

    monkeypatch.setattr("app.http_client.AsyncSession", lambda: FakeSession(), raising=True)

    async with CurlCffiClient(proxies="http://proxy.invalid:3128") as client:
        resp = await client.post("https://example.invalid", json={"x": 1})

    assert resp.status_code == 200
    assert calls[0]["kwargs"]["proxy"] == "http://proxy.invalid:3128"
    assert "proxies" not in calls[0]["kwargs"]


@pytest.mark.asyncio
async def test_curlcffi_client_applies_dict_proxies_as_proxies_kwarg(monkeypatch):
    calls: list[dict] = []

    class FakeResponse:
        status_code = 200
        headers = {}

    class FakeSession:
        async def close(self):
            return None

        async def post(self, url, **kwargs):
            calls.append({"url": url, "kwargs": kwargs})
            return FakeResponse()

    monkeypatch.setattr("app.http_client.AsyncSession", lambda: FakeSession(), raising=True)

    async with CurlCffiClient(proxies={"all": "http://proxy.invalid:3128"}) as client:
        resp = await client.post("https://example.invalid", json={"x": 1})

    assert resp.status_code == 200
    assert calls[0]["kwargs"]["proxies"] == {"all": "http://proxy.invalid:3128"}
    assert "proxy" not in calls[0]["kwargs"]

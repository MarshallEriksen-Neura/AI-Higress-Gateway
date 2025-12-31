import datetime as dt
import uuid

from app.schemas.provider import TransportType
from app.services.metrics_buffer import BufferedMetricsRecorder, BufferedUserMetricsRecorder


def test_metrics_buffer_normalizes_enum_transport() -> None:
    recorder = BufferedMetricsRecorder(
        flush_interval_seconds=999,
        latency_sample_size=1,
        max_buffered_buckets=100,
        success_sample_rate=1.0,
    )
    window_start = dt.datetime(2025, 1, 1, 0, 0, tzinfo=dt.UTC)

    recorder.record_sample(
        provider_id="p1",
        logical_model="m1",
        transport=TransportType.HTTP,
        is_stream=False,
        user_id=None,
        api_key_id=None,
        window_start=window_start,
        bucket_seconds=60,
        success=True,
        latency_ms=10.0,
        error_kind=None,
    )

    items = recorder._drain_buffer()
    assert len(items) == 1
    key, _ = items[0]
    assert key.transport == "http"


def test_user_metrics_buffer_normalizes_transporttype_str_repr() -> None:
    recorder = BufferedUserMetricsRecorder(
        flush_interval_seconds=999,
        latency_sample_size=1,
        max_buffered_buckets=100,
        success_sample_rate=1.0,
    )
    window_start = dt.datetime(2025, 1, 1, 0, 0, tzinfo=dt.UTC)

    recorder.record_sample(
        user_id=uuid.uuid4(),
        provider_id="p1",
        logical_model="m1",
        transport="TransportType.HTTP",
        is_stream=True,
        window_start=window_start,
        bucket_seconds=60,
        success=False,
        latency_ms=10.0,
    )

    items = recorder._drain_buffer()
    assert len(items) == 1
    key, _ = items[0]
    assert key.transport == "http"


def test_metrics_buffer_truncates_overlong_transport() -> None:
    recorder = BufferedMetricsRecorder(
        flush_interval_seconds=999,
        latency_sample_size=1,
        max_buffered_buckets=100,
        success_sample_rate=1.0,
    )
    window_start = dt.datetime(2025, 1, 1, 0, 0, tzinfo=dt.UTC)
    long_value = "x" * 17

    recorder.record_sample(
        provider_id="p1",
        logical_model="m1",
        transport=long_value,
        is_stream=False,
        user_id=None,
        api_key_id=None,
        window_start=window_start,
        bucket_seconds=60,
        success=True,
        latency_ms=10.0,
        error_kind=None,
    )

    items = recorder._drain_buffer()
    assert len(items) == 1
    key, _ = items[0]
    assert key.transport == ("x" * 16)


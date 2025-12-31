from __future__ import annotations

from app.services import metrics_service


def test_metrics_buffers_can_start_and_shutdown() -> None:
    original_enabled = metrics_service.settings.metrics_buffer_enabled
    try:
        metrics_service.settings.metrics_buffer_enabled = True

        metrics_service.shutdown_metrics_buffers(flush=False)
        assert metrics_service.metrics_buffers_running() == {"provider": False, "user": False}

        metrics_service.ensure_metrics_buffers_started()
        status = metrics_service.metrics_buffers_running()
        assert status["provider"] is True
        assert status["user"] is True

        metrics_service.shutdown_metrics_buffers(flush=False)
        assert metrics_service.metrics_buffers_running() == {"provider": False, "user": False}
    finally:
        metrics_service.settings.metrics_buffer_enabled = original_enabled
        metrics_service.shutdown_metrics_buffers(flush=False)


def test_metrics_buffers_noop_when_disabled() -> None:
    original_enabled = metrics_service.settings.metrics_buffer_enabled
    try:
        metrics_service.settings.metrics_buffer_enabled = False

        metrics_service.shutdown_metrics_buffers(flush=False)
        metrics_service.ensure_metrics_buffers_started()
        assert metrics_service.metrics_buffers_running() == {"provider": False, "user": False}
    finally:
        metrics_service.settings.metrics_buffer_enabled = original_enabled
        metrics_service.shutdown_metrics_buffers(flush=False)


from __future__ import annotations

"""
Celery 集成相关的基础测试。

这些测试只验证配置和任务注册情况，不会真正连接 Redis 或启动 Celery worker。
"""

from app.celery_app import celery_app
from app.settings import settings


def test_celery_app_uses_settings() -> None:
    """Celery 实例应当从 Settings 中读取核心配置。"""

    assert celery_app.conf.broker_url == settings.celery_broker_url
    assert celery_app.conf.result_backend == settings.celery_result_backend
    assert celery_app.conf.timezone == settings.celery_timezone
    assert celery_app.conf.task_default_queue == settings.celery_task_default_queue


def test_celery_tasks_registered() -> None:
    """基础任务应当已经在 Celery 应用中完成注册。"""

    # debug_ping 任务可以直接通过 .run() 调用测试其行为。
    assert "tasks.debug_ping" in celery_app.tasks
    ping_task = celery_app.tasks["tasks.debug_ping"]
    assert ping_task.run() == "pong"

    # 逻辑模型同步任务目前只验证是否成功注册，避免在测试中访问真实 Redis/DB。
    assert "tasks.sync_logical_models" in celery_app.tasks

    # 聊天计费相关任务：只验证注册，避免在测试里触发真实 DB 写入。
    assert "tasks.credits.record_chat_completion_usage" in celery_app.tasks
    assert "tasks.credits.record_streaming_request" in celery_app.tasks


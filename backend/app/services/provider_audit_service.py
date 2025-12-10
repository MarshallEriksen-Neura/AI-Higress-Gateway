from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

import anyio
import httpx
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.logging_config import logger
from app.provider.config import get_provider_config
from app.provider.health import check_provider_health
from app.redis_client import get_redis_client
from app.services.provider_health_service import persist_provider_health
from app.settings import settings
from app.models import (
    Provider,
    ProviderAuditLog,
    ProviderTestRecord,
)

AUDIT_STATES = {"pending", "testing", "approved", "rejected", "approved_limited"}
OPERATION_STATES = {"active", "paused", "offline"}


class ProviderAuditError(RuntimeError):
    """基础审核错误。"""


class ProviderNotFoundError(ProviderAuditError):
    """未找到 Provider。"""


def _get_provider(session: Session, provider_id: str) -> Provider:
    stmt: Select[tuple[Provider]] = select(Provider).where(Provider.provider_id == provider_id)
    provider = session.execute(stmt).scalars().first()
    if provider is None:
        raise ProviderNotFoundError(f"Provider {provider_id} not found")
    return provider


def _record_audit_log(
    session: Session,
    provider: Provider,
    action: str,
    *,
    operator_id: UUID | None,
    remark: str | None = None,
    from_status: str | None = None,
    to_status: str | None = None,
    operation_from_status: str | None = None,
    operation_to_status: str | None = None,
    test_record: ProviderTestRecord | None = None,
) -> ProviderAuditLog:
    log = ProviderAuditLog(
        provider_uuid=provider.id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        operation_from_status=operation_from_status,
        operation_to_status=operation_to_status,
        operator_id=operator_id,
        remark=remark,
        test_record_uuid=test_record.id if test_record else None,
    )
    session.add(log)
    return log


def trigger_provider_test(
    session: Session,
    provider_id: str,
    operator_id: UUID | None,
    *,
    mode: Literal["auto", "custom", "cron"] = "auto",
    remark: str | None = None,
    custom_input: str | None = None,
) -> ProviderTestRecord:
    """触发一次受控探针测试并写入测试记录。

    当前实现复用健康检查逻辑：调用上游 /models 或健康探针，并落库/缓存。
    """

    provider = _get_provider(session, provider_id)
    previous_status = provider.audit_status
    provider.audit_status = "testing"

    started_at = datetime.now(timezone.utc)
    probe_status = None
    latency_ms: int | None = None
    error_code: str | None = None
    probe_model = provider.probe_model
    effective_prompt = custom_input or settings.probe_prompt

    cfg = get_provider_config(provider_id, session=session)
    if cfg is None:
        # 无法构建可用配置（通常是缺少 API Key 或配置不完整），返回一条失败的测试记录避免 404。
        logger.warning("Provider %s config missing; skipping real probe", provider_id)
        finished_at = datetime.now(timezone.utc)
        record = ProviderTestRecord(
            provider_uuid=provider.id,
            mode=mode,
            success=False,
            summary="provider config missing",
            probe_results=[
                {
                    "case": "health_check",
                    "mode": mode,
                    "model": probe_model,
                    "input": effective_prompt,
                    "status": "config_missing",
                    "latency_ms": None,
                    "timestamp": finished_at.isoformat(),
                }
            ],
            latency_ms=None,
            error_code="config_missing",
            cost=0.0,
            started_at=started_at,
            finished_at=finished_at,
        )
        session.add(record)
        _record_audit_log(
            session,
            provider,
            "test",
            operator_id=operator_id,
            remark=remark,
            from_status=previous_status,
            to_status=provider.audit_status,
            test_record=record,
        )
        session.commit()
        session.refresh(record)
        session.refresh(provider)
        return record

    redis = get_redis_client()

    async def _run_probe():
        async with httpx.AsyncClient(timeout=settings.upstream_timeout) as client:
            status = await check_provider_health(client, cfg, redis)
            await persist_provider_health(
                redis,
                session,
                provider,
                status,
                cache_ttl_seconds=settings.provider_health_cache_ttl_seconds,
            )
            return status

    try:
        probe_status = anyio.run(_run_probe)
        latency_ms = probe_status.response_time_ms or None
        if probe_status.status.value == "healthy":
            error_code = None
        else:
            error_code = probe_status.error_message or probe_status.status.value
    except Exception as exc:  # pragma: no cover - 网络/上游异常
        logger.exception("Provider %s test failed: %s", provider_id, exc)
        probe_status = None
        latency_ms = None
        error_code = "probe_failed"
        provider.audit_status = "testing"

    finished_at = datetime.now(timezone.utc)
    record = ProviderTestRecord(
        provider_uuid=provider.id,
        mode=mode,
        success=error_code is None,
        summary=remark or (probe_status.status.value if probe_status else "probe failed"),
        probe_results=[
            {
                "case": "health_check",
                "mode": mode,
                "model": probe_model,
                "input": effective_prompt,
                "status": probe_status.status.value if probe_status else "error",
                "latency_ms": latency_ms,
                "timestamp": finished_at.isoformat(),
            }
        ],
        latency_ms=latency_ms,
        error_code=error_code,
        cost=0.0,
        started_at=started_at,
        finished_at=finished_at,
    )
    session.add(record)
    _record_audit_log(
        session,
        provider,
        "test",
        operator_id=operator_id,
        remark=remark,
        from_status=previous_status,
        to_status=provider.audit_status,
        test_record=record,
    )
    session.commit()
    session.refresh(record)
    session.refresh(provider)
    logger.info("Provider %s test recorded (mode=%s)", provider_id, mode)
    return record


def approve_provider(
    session: Session,
    provider_id: str,
    operator_id: UUID | None,
    *,
    remark: str | None = None,
    limited: bool = False,
    limit_qps: int | None = None,
) -> Provider:
    provider = _get_provider(session, provider_id)
    previous_status = provider.audit_status
    provider.audit_status = "approved_limited" if limited else "approved"
    provider.operation_status = "active"
    if limited and limit_qps:
        provider.max_qps = limit_qps

    _record_audit_log(
        session,
        provider,
        "approve_limited" if limited else "approve",
        operator_id=operator_id,
        remark=remark,
        from_status=previous_status,
        to_status=provider.audit_status,
    )
    session.commit()
    session.refresh(provider)
    return provider


def reject_provider(
    session: Session,
    provider_id: str,
    operator_id: UUID | None,
    *,
    remark: str | None = None,
) -> Provider:
    provider = _get_provider(session, provider_id)
    previous_status = provider.audit_status
    provider.audit_status = "rejected"
    provider.operation_status = "offline"
    _record_audit_log(
        session,
        provider,
        "reject",
        operator_id=operator_id,
        remark=remark,
        from_status=previous_status,
        to_status=provider.audit_status,
    )
    session.commit()
    session.refresh(provider)
    return provider


def update_operation_status(
    session: Session,
    provider_id: str,
    operator_id: UUID | None,
    new_status: Literal["active", "paused", "offline"],
    *,
    remark: str | None = None,
) -> Provider:
    if new_status not in OPERATION_STATES:
        raise ProviderAuditError(f"Invalid operation status: {new_status}")

    provider = _get_provider(session, provider_id)
    previous_status = provider.operation_status
    provider.operation_status = new_status
    _record_audit_log(
        session,
        provider,
        f"operation_{new_status}",
        operator_id=operator_id,
        remark=remark,
        operation_from_status=previous_status,
        operation_to_status=new_status,
    )
    session.commit()
    session.refresh(provider)
    return provider


def get_latest_test_record(
    session: Session, provider_uuid: UUID
) -> ProviderTestRecord | None:
    stmt: Select[tuple[ProviderTestRecord]] = (
        select(ProviderTestRecord)
        .where(ProviderTestRecord.provider_uuid == provider_uuid)
        .order_by(ProviderTestRecord.created_at.desc())
    )
    return session.execute(stmt).scalars().first()


def list_test_records(
    session: Session, provider_id: str, limit: int = 20
) -> list[ProviderTestRecord]:
    provider = _get_provider(session, provider_id)
    stmt: Select[tuple[ProviderTestRecord]] = (
        select(ProviderTestRecord)
        .where(ProviderTestRecord.provider_uuid == provider.id)
        .order_by(ProviderTestRecord.created_at.desc())
        .limit(limit)
    )
    return list(session.execute(stmt).scalars().all())


def list_audit_logs(
    session: Session, provider_id: str, limit: int = 50
) -> list[ProviderAuditLog]:
    provider = _get_provider(session, provider_id)
    stmt: Select[tuple[ProviderAuditLog]] = (
        select(ProviderAuditLog)
        .where(ProviderAuditLog.provider_uuid == provider.id)
        .order_by(ProviderAuditLog.created_at.desc())
        .limit(limit)
    )
    return list(session.execute(stmt).scalars().all())


__all__ = [
    "approve_provider",
    "get_latest_test_record",
    "ProviderAuditError",
    "ProviderNotFoundError",
    "reject_provider",
    "trigger_provider_test",
    "update_operation_status",
]

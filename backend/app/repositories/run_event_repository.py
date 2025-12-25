from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import RunEvent


def append_run_event(
    db: Session,
    *,
    run_id: UUID,
    event_type: str,
    payload: dict[str, Any] | None,
) -> RunEvent:
    """
    追加一条 RunEvent（append-only）。

    注意：当前实现通过 `max(seq)+1` 分配序号，适用于“单执行者”或低并发场景（例如请求内兼容模式）。
    当后续迁移到多 worker 并发写同一 run 时，需要引入更严格的序列分配（例如 advisory lock 或
    独立的计数器表/Redis INCR）以避免 seq 冲突。
    """
    next_seq = db.execute(
        select(func.max(RunEvent.seq)).where(RunEvent.run_id == run_id)
    ).scalar_one()
    seq = int(next_seq or 0) + 1

    row = RunEvent(
        run_id=run_id,
        seq=seq,
        event_type=str(event_type or "").strip() or "event",
        payload=payload or {},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_run_events(
    db: Session,
    *,
    run_id: UUID,
    after_seq: int | None = None,
    limit: int = 200,
) -> list[RunEvent]:
    limit = max(1, min(int(limit or 200), 1000))
    stmt = select(RunEvent).where(RunEvent.run_id == run_id)
    if after_seq is not None:
        stmt = stmt.where(RunEvent.seq > int(after_seq))
    stmt = stmt.order_by(RunEvent.seq.asc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


__all__ = ["append_run_event", "list_run_events"]

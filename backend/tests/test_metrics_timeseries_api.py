from __future__ import annotations

import datetime as dt
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db_session
from app.deps import get_db, get_redis
from app.models import Base, ProviderRoutingMetricsHistory
from app.routes import create_app
from app.services.api_key_cache import CachedAPIKey
from tests.utils import InMemoryRedis, auth_headers, seed_user_and_key


def _insert_sample_metrics(db: Session, *, provider_id: str, logical_model: str) -> None:
    now = dt.datetime.now(dt.timezone.utc).replace(minute=0, second=0, microsecond=0)
    for i in range(3):
        bucket_start = now - dt.timedelta(minutes=i)
        db.add(
            ProviderRoutingMetricsHistory(
                id=uuid4(),
                provider_id=provider_id,
                logical_model=logical_model,
                transport="http",
                is_stream=False,
                window_start=bucket_start,
                window_duration=60,
                total_requests_1m=10 + i,
                success_requests=9 + i,
                error_requests=1,
                latency_avg_ms=100.0 + i,
                latency_p95_ms=150.0 + i,
                latency_p99_ms=180.0 + i,
                error_rate=0.1,
                success_qps_1m=(9 + i) / 60.0,
                status="healthy",
            )
        )
    db.commit()


def _insert_user_metrics(
    db: Session,
    *,
    user_id: UUID,
    provider_id: str,
    logical_model: str,
) -> None:
    now = dt.datetime.now(dt.timezone.utc).replace(minute=0, second=0, microsecond=0)
    for i in range(3):
        bucket_start = now - dt.timedelta(minutes=i)
        db.add(
            ProviderRoutingMetricsHistory(
                id=uuid4(),
                provider_id=provider_id,
                logical_model=logical_model,
                transport="http",
                is_stream=False,
                user_id=user_id,
                api_key_id=None,
                window_start=bucket_start,
                window_duration=60,
                total_requests_1m=10 + i,
                success_requests=9 + i,
                error_requests=1,
                latency_avg_ms=100.0 + i,
                latency_p95_ms=150.0 + i,
                latency_p99_ms=180.0 + i,
                error_rate=0.1,
                success_qps_1m=(9 + i) / 60.0,
                status="healthy",
            )
        )
    db.commit()


def _insert_api_key_metrics(
    db: Session,
    *,
    api_key_id: UUID,
    provider_id: str,
    logical_model: str,
) -> None:
    now = dt.datetime.now(dt.timezone.utc).replace(minute=0, second=0, microsecond=0)
    for i in range(3):
        bucket_start = now - dt.timedelta(minutes=i)
        db.add(
            ProviderRoutingMetricsHistory(
                id=uuid4(),
                provider_id=provider_id,
                logical_model=logical_model,
                transport="http",
                is_stream=False,
                user_id=None,
                api_key_id=api_key_id,
                window_start=bucket_start,
                window_duration=60,
                total_requests_1m=10 + i,
                success_requests=9 + i,
                error_requests=1,
                latency_avg_ms=100.0 + i,
                latency_p95_ms=150.0 + i,
                latency_p99_ms=180.0 + i,
                error_rate=0.1,
                success_qps_1m=(9 + i) / 60.0,
                status="healthy",
            )
        )
    db.commit()


@pytest.fixture()
def client_with_db():
    """Create test client with in-memory database."""
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    def override_get_db_session():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    fake_redis = InMemoryRedis()

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_db] = override_get_db_session

    async def override_get_redis():
        return fake_redis

    app.dependency_overrides[get_redis] = override_get_redis

    with TestingSessionLocal() as session:
        seed_user_and_key(session, token_plain="timeline")

    with TestClient(app, base_url="http://test") as client:
        yield client, TestingSessionLocal

    Base.metadata.drop_all(bind=engine)


@patch("app.auth.get_cached_api_key")
@pytest.mark.asyncio
async def test_metrics_timeseries_api(mock_get_cached_api_key, client_with_db):
    client, session_factory = client_with_db
    
    # Mock Redis cache to avoid connection timeout
    test_user_id = uuid4()
    mock_get_cached_api_key.return_value = CachedAPIKey(
        id=str(uuid4()),
        user_id=str(test_user_id),
        user_username="test_user",
        user_is_active=True,
        user_is_superuser=False,
        name="test_key",
        expires_at=None,
        has_provider_restrictions=False,
        allowed_provider_ids=[],
    )

    provider_id = "openai"
    logical_model = "gpt-4"
    
    with session_factory() as session:
        _insert_sample_metrics(session, provider_id=provider_id, logical_model=logical_model)

    resp = client.get(
        "/metrics/providers/timeseries",
        params={
            "provider_id": provider_id,
            "logical_model": logical_model,
            "time_range": "all",
        },
        headers=auth_headers("timeline"),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["provider_id"] == provider_id
    assert data["logical_model"] == logical_model
    assert data["time_range"] == "all"
    assert data["bucket"] == "minute"
    assert len(data["points"]) >= 3


@patch("app.auth.get_cached_api_key")
@pytest.mark.asyncio
async def test_metrics_summary_api(mock_get_cached_api_key, client_with_db):
    client, session_factory = client_with_db
    
    # Mock Redis cache to avoid connection timeout
    test_user_id = uuid4()
    mock_get_cached_api_key.return_value = CachedAPIKey(
        id=str(uuid4()),
        user_id=str(test_user_id),
        user_username="test_user",
        user_is_active=True,
        user_is_superuser=False,
        name="test_key",
        expires_at=None,
        has_provider_restrictions=False,
        allowed_provider_ids=[],
    )

    provider_id = "openai-summary"
    logical_model = "gpt-4"
    
    with session_factory() as session:
        _insert_sample_metrics(session, provider_id=provider_id, logical_model=logical_model)

    resp = client.get(
        "/metrics/providers/summary",
        params={
            "provider_id": provider_id,
            "logical_model": logical_model,
            "time_range": "all",
        },
        headers=auth_headers("timeline"),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["provider_id"] == provider_id
    assert data["logical_model"] == logical_model
    assert data["time_range"] == "all"
    # 样本中 total_requests_1m = 10,11,12 -> 总和 33
    assert data["total_requests"] == 33


@patch("app.auth.get_cached_api_key")
@pytest.mark.asyncio
async def test_user_metrics_summary_api(mock_get_cached_api_key, client_with_db):
    client, session_factory = client_with_db
    
    # Mock Redis cache to avoid connection timeout
    test_user_id = uuid4()
    mock_get_cached_api_key.return_value = CachedAPIKey(
        id=str(uuid4()),
        user_id=str(test_user_id),
        user_username="test_user",
        user_is_active=True,
        user_is_superuser=False,
        name="test_key",
        expires_at=None,
        has_provider_restrictions=False,
        allowed_provider_ids=[],
    )

    provider_id = "openai-user"
    logical_model = "gpt-4"
    user_id = uuid4()  # Use UUID object instead of string
    
    with session_factory() as session:
        _insert_user_metrics(
            session,
            user_id=user_id,
            provider_id=provider_id,
            logical_model=logical_model,
        )

    resp = client.get(
        "/metrics/users/summary",
        params={
            "user_id": str(user_id),  # Convert to string for API call
            "time_range": "all",
        },
        headers=auth_headers("timeline"),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == str(user_id)
    assert data["time_range"] == "all"
    # 样本中 total_requests_1m = 10,11,12 -> 总和 33
    assert data["total_requests"] == 33


@patch("app.auth.get_cached_api_key")
@pytest.mark.asyncio
async def test_api_key_metrics_summary_api(mock_get_cached_api_key, client_with_db):
    client, session_factory = client_with_db
    
    # Mock Redis cache to avoid connection timeout
    test_user_id = uuid4()
    mock_get_cached_api_key.return_value = CachedAPIKey(
        id=str(uuid4()),
        user_id=str(test_user_id),
        user_username="test_user",
        user_is_active=True,
        user_is_superuser=False,
        name="test_key",
        expires_at=None,
        has_provider_restrictions=False,
        allowed_provider_ids=[],
    )

    provider_id = "openai-apikey"
    logical_model = "gpt-4"
    api_key_id = uuid4()  # Use UUID object instead of string
    
    with session_factory() as session:
        _insert_api_key_metrics(
            session,
            api_key_id=api_key_id,
            provider_id=provider_id,
            logical_model=logical_model,
        )

    resp = client.get(
        "/metrics/api-keys/summary",
        params={
            "api_key_id": str(api_key_id),  # Convert to string for API call
            "time_range": "all",
        },
        headers=auth_headers("timeline"),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["api_key_id"] == str(api_key_id)
    assert data["time_range"] == "all"
    # 样本中 total_requests_1m = 10,11,12 -> 总和 33
    assert data["total_requests"] == 33

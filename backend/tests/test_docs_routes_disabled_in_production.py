from __future__ import annotations

from fastapi import FastAPI

from app.routes import create_app
from app.settings import settings


def _has_route_path(app: FastAPI, path: str) -> bool:
    return any(getattr(route, "path", None) == path for route in app.router.routes)


def test_docs_routes_disabled_in_production_by_default(monkeypatch) -> None:
    monkeypatch.setattr(settings, "environment", "production", raising=False)
    monkeypatch.setattr(settings, "api_docs_override", None, raising=False)

    app = create_app()

    assert app.docs_url is None
    assert app.redoc_url is None
    assert app.openapi_url is None

    assert not _has_route_path(app, "/docs")
    assert not _has_route_path(app, "/redoc")
    assert not _has_route_path(app, "/openapi.json")


def test_docs_routes_can_be_enabled_via_override(monkeypatch) -> None:
    monkeypatch.setattr(settings, "environment", "production", raising=False)
    monkeypatch.setattr(settings, "api_docs_override", True, raising=False)

    app = create_app()

    assert app.docs_url == "/docs"
    assert app.redoc_url == "/redoc"
    assert app.openapi_url == "/openapi.json"

    assert _has_route_path(app, "/docs")
    assert _has_route_path(app, "/redoc")
    assert _has_route_path(app, "/openapi.json")


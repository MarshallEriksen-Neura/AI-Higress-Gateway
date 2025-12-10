# APIProxy - AI Gateway

[Chinese README](README.zh.md)

APIProxy is a FastAPI-based AI gateway that exposes a single, OpenAI-compatible HTTP API on top of multiple upstream model providers. It adds routing, caching, session management, request-format adapters and cross-provider failover so your clients can talk to many LLMs through one stable endpoint.

---

## 📁 Project Structure

This project uses a **Monorepo** architecture with clear separation between backend and frontend:

```
ai-higress/
├── backend/              # FastAPI backend (AI Gateway)
│   ├── app/             # Application code
│   ├── tests/           # Backend tests
│   ├── alembic/         # Database migrations
│   ├── scripts/         # Utility scripts
│   ├── main.py          # Entry point
│   ├── Dockerfile       # Backend container
│   └── .env.example     # Backend environment template
│
├── frontend/            # Next.js frontend (Management UI)
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   ├── http/           # API client
│   ├── lib/            # Utilities
│   ├── Dockerfile      # Production container
│   └── Dockerfile.dev  # Development container
│
├── .github/            # CI/CD workflows
│   └── workflows/
│       ├── backend.yml      # Backend CI
│       ├── frontend.yml     # Frontend CI
│       └── integration.yml  # E2E tests
│
├── docs/               # Project documentation
│   ├── monorepo-optimization-plan.md
│   └── migration-remaining-tasks.md
│
├── docker-compose.yml  # Development environment
└── README.md          # This file
```

For detailed information about the Monorepo setup, see:
- [Monorepo Optimization Plan](docs/monorepo-optimization-plan.md)
- [Development Guide](docs/migration-remaining-tasks.md)

---

## Features

- **OpenAI-compatible API**  
  Exposes `/v1/chat/completions`, `/v1/responses`, and `/models` so you can reuse existing OpenAI SDKs and tools.

- **Dynamic Multi-provider Routing**  
  - **Logical Models**: Map multiple physical provider models to a single logical model (e.g., "fast-model" -> OpenAI's `gpt-3.5-turbo`, Gemini's `gemini-pro`).
  - **Zero-Configuration Model Routing**: If a requested model is not explicitly mapped, the gateway automatically discovers which providers support it and creates a dynamic routing group on the fly.
  - **Weighted & Metrics-based Scheduling**: Distributes traffic based on configured weights and runtime performance metrics.

- **Cross-provider Failover**  
  Automatically retries requests on a different provider upon retryable errors (e.g., 429, 5xx) for both streaming and non-streaming requests.

- **Request Format Adapters**  
  - Automatically converts different request formats into a unified OpenAI-style `messages` structure.
  - Supports Gemini-style `input`, Claude-style requests, and the OpenAI Responses API (`/v1/responses`).
  - When clients call `/v1/responses`, the payload now stays in native Responses shape end-to-end: the router forwards traffic to upstream `/v1/responses` endpoints so models that have dropped `/v1/chat/completions` (e.g. `gpt-5.1-codex`) continue to work without extra adapters.
  - Handles prefixed model names (e.g., `my-provider/some-model`) for simpler routing logic.

- **Session Stickiness**  
  Binds a conversation (via `X-Session-Id` header) to the first-chosen provider to maintain context in multi-message conversations.

- **Model List Aggregation & Caching**  
  Fetches model lists from all configured providers, normalises them into an OpenAI-style `/models` response and caches them in Redis.

- **Streaming and Non-streaming Support**  
  Detects `stream` in the payload and `Accept: text/event-stream` to support both SSE streaming and plain JSON responses.

- **Session Context Storage**  
  Uses the `X-Session-Id` header to persist request/response snippets into Redis so you can inspect simple conversation history via an HTTP endpoint.

- **Flexible Configuration**  
  Upstream addresses, API keys, Redis URL, provider weights and failover behaviour are all controlled through environment variables.

- **Docker-friendly**  
  Includes a `docker-compose.yml` that starts the API gateway and Redis with a single command.

---

## Tech Stack

- Web framework: FastAPI  
- ASGI server: Uvicorn  
- HTTP client: HTTPX  
- Cache / storage: Redis  
- Config management: Pydantic Settings  
- Dependency management: uv / pip
---


## Database Migrations

- The backend now auto-runs `alembic upgrade head` during process startup so that
  new columns (e.g., `providers.probe_enabled`) exist before Celery/HTTP workers
  touch the database.
- This behaviour can be disabled by setting `AUTO_APPLY_DB_MIGRATIONS=0` and running
  migrations manually via `alembic upgrade head` when you need full control (e.g., CI).
- Auto migration is skipped for SQLite/ephemeral databases that are only used in tests.


## Testing

The project uses `pytest` and `pytest-asyncio` for testing.

Run the full test suite:

```bash
pytest
```

Or run a specific file:

```bash
pytest tests/test_chat_greeting.py
```

---

## Contributing

Contributions are welcome. Before opening a PR:

- Add or update tests for any new endpoints, routing behaviour, or context handling;  
- Run `pytest` and ensure the suite passes locally;  
- Keep commits focused and follow the existing short, descriptive commit message style (Chinese or English is fine, e.g. `添加跨厂商故障转移` or `Add cross-provider failover`).

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.

#!/bin/sh
set -eu

log() {
  # ISO 8601 timestamp (UTC) + message
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

log "Entrypoint started (argv: $*)"

if ! command -v alembic >/dev/null 2>&1; then
  log "ERROR: alembic command not found in image"
  exit 127
fi

# Run database migrations (only for API server process).
if [ "${1:-}" = "celery" ]; then
  log "Skip database migrations for celery process."
else
  log "Running database migrations: alembic upgrade head"
  # Print current revision before/after to make upgrades visible in logs.
  log "Alembic current (before):"
  alembic current 2>&1 || true
  if alembic upgrade head 2>&1; then
    log "Database migrations finished."
  else
    log "ERROR: Database migrations failed."
    exit 1
  fi
  log "Alembic current (after):"
  alembic current 2>&1 || true
fi

# Then exec the container's main process (what's been passed as CMD)
exec "$@"

#!/usr/bin/env bash

set -euo pipefail

# 切换到 backend 目录（脚本位于 backend/scripts/ 下）
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${BACKEND_DIR}"

CELERY_APP="app.celery_app.celery_app"
LOG_LEVEL="${CELERY_LOG_LEVEL:-info}"

echo "[run_celery] backend dir: ${BACKEND_DIR}"
echo "[run_celery] celery app : ${CELERY_APP}"
echo "[run_celery] log level  : ${LOG_LEVEL}"

echo "[run_celery] 启动 Celery worker ..."
celery -A "${CELERY_APP}" worker -l "${LOG_LEVEL}" &
WORKER_PID=$!

echo "[run_celery] 启动 Celery beat ..."
celery -A "${CELERY_APP}" beat -l "${LOG_LEVEL}" &
BEAT_PID=$!

cleanup() {
  echo "[run_celery] 收到退出信号，停止 Celery 进程 ..."
  kill "${WORKER_PID}" "${BEAT_PID}" 2>/dev/null || true
  wait "${WORKER_PID}" "${BEAT_PID}" 2>/dev/null || true
}

trap cleanup INT TERM

wait "${WORKER_PID}" "${BEAT_PID}"


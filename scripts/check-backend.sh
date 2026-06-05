#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"
echo "==> backend python compile"
python3 -m compileall backend/src

if [ "${RUN_LIVE_API_SMOKE:-0}" = "1" ]; then
  echo "==> backend live api smoke"
  sh backend/test_api.sh
else
  echo "==> skip backend live api smoke (set RUN_LIVE_API_SMOKE=1 to enable)"
fi

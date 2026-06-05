#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR/frontend"
echo "==> frontend type-check"
npm run type-check
echo "==> frontend lint"
npm run lint

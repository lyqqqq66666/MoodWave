#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

echo "==> phase review: frontend"
sh "$ROOT_DIR/scripts/check-frontend.sh"

echo "==> phase review: backend"
sh "$ROOT_DIR/scripts/check-backend.sh"

cat <<'EOF'
==> manual review checklist
- verify landing, login, dashboard, mood, companion on desktop and mobile widths
- verify companion streaming only shows dialogue and soft status copy
- verify mood step 1 defaults to today and supports choosing another date
- verify dashboard first screen has one clear main action and no crowded metrics
- verify no unrelated files are staged before commit
EOF

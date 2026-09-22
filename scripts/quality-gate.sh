#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f package.json ]]; then
  echo "package.json is required for this repository quality gate." >&2
  exit 2
fi

npm ci --legacy-peer-deps
npm run typecheck
npm test
npm run build
npm run lint

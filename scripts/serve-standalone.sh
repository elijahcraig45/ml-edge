#!/usr/bin/env bash
# Boots the same standalone server the Dockerfile runs, so e2e tests exercise
# the production artifact rather than `next start`.
set -euo pipefail
PORT="${1:-3111}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
rm -rf .next/standalone/public .next/standalone/.next/static
cp -R public .next/standalone/public
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
cd .next/standalone
PORT="$PORT" exec node server.js

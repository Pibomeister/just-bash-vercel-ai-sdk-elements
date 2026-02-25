#!/usr/bin/env bash

set -uo pipefail

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$project_dir"

if pnpm validate:changed; then
  exit 0
fi

printf '%s\n' '{"reason":"Task completion blocked: pnpm validate:changed failed. Fix Biome, ESLint, or TypeScript errors and retry."}'
exit 2

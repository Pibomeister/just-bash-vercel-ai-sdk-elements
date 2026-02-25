#!/usr/bin/env bash
# Quick page checks using agent-browser with automatic server management.
#
# Usage:
#   bash examples/agent-browser/quick-checks.sh
#
# This example starts the dev server, runs agent-browser checks, and cleans up.
# Customize the server command, port, and checks for your project.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_CMD="pnpm dev"
PORT=3000
BASE_URL="http://localhost:${PORT}"

# Start server, run checks, then auto-cleanup
python "${SCRIPT_DIR}/scripts/with_server.py" \
  --server "${SERVER_CMD}" \
  --port "${PORT}" \
  -- bash -c "
    echo '=== Homepage Check ==='
    agent-browser open ${BASE_URL}
    agent-browser wait --load networkidle
    agent-browser snapshot -i
    agent-browser screenshot /tmp/homepage.png
    echo 'Homepage screenshot saved to /tmp/homepage.png'

    echo ''
    echo '=== Navigation Check ==='
    agent-browser get title
    agent-browser get url

    echo ''
    echo '=== Cleanup ==='
    agent-browser close
    echo 'All checks passed.'
  "

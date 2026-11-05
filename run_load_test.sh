#!/bin/bash
# =============================================================================
# Mario Career Quest - Multi-Stage Load Test Runner (500 -> 1000 -> 1500 Players)
# Usage:
#   bash run_load_test.sh                              # Runs against localhost:3001
#   bash run_load_test.sh --target https://mario.budcc.tech
#   bash run_load_test.sh --stages 500,1000,1500 --batch-size 50
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/server"

# Increase file descriptor limit if possible on Linux
if [ "$(uname)" = "Linux" ]; then
  ulimit -n 65535 2>/dev/null || true
fi

echo "======================================================"
echo " MARIO CAREER QUEST — LOAD TEST RUNNER"
echo "======================================================"

npx tsx src/loadTestStages.ts "$@"

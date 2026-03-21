#!/usr/bin/env bash
set -euo pipefail
set +H

# Usage:
#   ./scripts/manual-hint-pause-sequence.sh [host] [port] [topic]
# Defaults:
#   host=agent22.local port=1883 topic=paradox/agent22/clock/commands

HOST="${1:-agent22.local}"
PORT="${2:-1883}"
TOPIC="${3:-paradox/agent22/clock/commands}"
HINT1_TEXT="${HINT1_TEXT:-Hello world!}"
HINT2_TEXT="${HINT2_TEXT:-Pause test...}"
LOCK_FILE="/tmp/pxc-manual-hint-pause-sequence.lock"

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "[$(date '+%H:%M:%S')] Another manual sequence is already running."
  echo "[$(date '+%H:%M:%S')] If this is stale, remove ${LOCK_FILE} and retry."
  exit 1
fi

stamp() {
  date '+%H:%M:%S'
}

send() {
  local payload="$1"
  echo "[$(stamp)] SEND ${payload}"
  mosquitto_pub -h "$HOST" -p "$PORT" -t "$TOPIC" -m "$payload"
}

echo "[$(stamp)] Manual sequence start host=${HOST} port=${PORT} topic=${TOPIC}"

# 1) Set the clock to 1:00 (60 seconds)
send '{"command":"setSeconds","seconds":60}'

# 2) Wait 5 seconds, then start countdown
sleep 5
send '{"command":"start"}'

# 3) Wait 5 seconds, then send hint for 10 seconds
sleep 5
send "{\"command\":\"hint\",\"text\":\"${HINT1_TEXT}\",\"duration\":10}"

# 4) Wait 25 seconds, then send second hint for 10 seconds
sleep 25
send "{\"command\":\"hint\",\"text\":\"${HINT2_TEXT}\",\"duration\":10}"

# 5) Wait 5 seconds, then pause
sleep 5
send '{"command":"pause"}'

# 6) Wait 5 seconds, then resume
sleep 5
send '{"command":"resume"}'

echo "[$(stamp)] Manual sequence complete"

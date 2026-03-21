#!/usr/bin/env bash
set -euo pipefail
set +H

# Usage:
#   ./scripts/manual-color-cycle-sequence.sh [host] [port] [topic]
# Defaults:
#   host=agent22.local port=1883 topic=paradox/agent22/clock/commands

HOST="${1:-agent22.local}"
PORT="${2:-1883}"
TOPIC="${3:-paradox/agent22/clock/commands}"
LOCK_FILE="/tmp/pxc-manual-color-cycle-sequence.lock"

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "[$(date '+%H:%M:%S')] Another color cycle sequence is already running."
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

echo "[$(stamp)] Color cycle sequence start host=${HOST} port=${PORT} topic=${TOPIC}"

# Ensure countdown is visible while testing colors.
# Total test timeline after start: 10s (colors) + 8s (alpha ramp) + 5s (fade out/in) = 23s
send '{"command":"setSeconds","seconds":23}'
sleep 1
send '{"command":"start"}'
sleep 1

# First 10 seconds: color changes with alpha fixed at 1.0.
send '{"command":"setDisplayColors","backgroundColor":"navy","textColor":"yellow","textAlpha":1}'
sleep 2
send '{"command":"setDisplayColors","backgroundColor":"#102A43","textColor":"#FEE440","textAlpha":1}'
sleep 2
send '{"command":"setDisplayColors","backgroundColor":"orange","textColor":"blue","textAlpha":1}'
sleep 2
send '{"command":"setDisplayColors","backgroundColor":"#4B006E","textColor":"#00FFFF","textAlpha":1}'
sleep 2
send '{"command":"setDisplayColors","backgroundColor":"teal","textColor":"white","textAlpha":1}'
sleep 2

# Next 8 seconds: keep black text on white background, alpha 0 -> 1 in 10 steps.
alpha_steps=(0 0.11 0.22 0.33 0.44 0.56 0.67 0.78 0.89 1)
for a in "${alpha_steps[@]}"; do
  send "{\"command\":\"setDisplayColors\",\"backgroundColor\":\"white\",\"textColor\":\"black\",\"textAlpha\":${a}}"
  sleep 0.8
done

# Last 5 seconds:
#   1) Fade out text only over 3 seconds (keep current colors)
#   2) Fade in over 2 seconds while transitioning to background black + text navy
send '{"command":"setDisplayColors","backgroundColor":"white","textColor":"black","textAlpha":0,"fadeTime":3}'
sleep 3
send '{"command":"setDisplayColors","backgroundColor":"black","textColor":"navy","textAlpha":1,"fadeTime":2}'
sleep 2

# Restore defaults.
send '{"command":"resetDisplayColors"}'

echo "[$(stamp)] Color cycle sequence complete"

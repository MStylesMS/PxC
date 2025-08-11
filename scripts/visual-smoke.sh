#!/usr/bin/env bash
set -euo pipefail

# Simple visual smoke test for the Houdini Clock UI via MQTT
# Requirements: mosquitto_pub in PATH
# Usage: scripts/visual-smoke.sh [host] [port] [topic]
# Defaults: host=localhost, port=1884, topic=Paradox/Houdini/Mirror/Clock/Commands

HOST="${1:-localhost}"
# mosquitto_pub defaults to TCP; most brokers use 1883 for TCP
PORT="${2:-1883}"
TOPIC="${3:-Paradox/Houdini/Mirror/Clock/Commands}"

publish() {
  local payload="$1"
  echo "→ Publish: ${payload}"
  mosquitto_pub -h "$HOST" -p "$PORT" -t "$TOPIC" -m "$payload"
}

# Sequence
echo "Target -> host=$HOST port=$PORT topic=$TOPIC"

publish '{"command":"fadein","duration":500}'
sleep 1
publish '{"time":"02:00"}'
sleep 0.5
publish '{"command":"start"}'
sleep 3
publish '{"hint":"Find the hidden key!","duration":5}'
sleep 6
publish '{"command":"pause","duration":1000}'
sleep 1.2
publish '{"command":"fadeout","duration":1000}'

echo "✓ Visual smoke sequence sent. Observe the UI reactions."

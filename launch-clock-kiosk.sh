#!/usr/bin/env bash
# Usage: ./launch-clock-kiosk.sh [DISPLAY] [URL]
# Example: ./launch-clock-kiosk.sh :0 http://localhost:3000

DISPLAY="${1:-:0}"
URL="${2:-http://localhost:3000}"

echo "Launching Chromium on display $DISPLAY with URL $URL"

# Export the display so Chromium knows where to open
export DISPLAY=$DISPLAY

# Optional: Wait for X to be ready (useful if running from boot scripts)
# xset -display $DISPLAY q

# Launch Chromium in kiosk mode, no error dialogs, no toolbars
chromium-browser --noerrdialogs --disable-infobars --kiosk "$URL" &
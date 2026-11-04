# MQTT API Reference for Paradox Clock (PxC)

## Overview
This document provides a complete reference for all MQTT commands supported by Paradox Clock (PxC) applications. These commands allow real-time control of clock display, timing modes (countdown, clock, stopwatch), and hint system.

The MQTT interface is **optional** — clocks can operate standalone in any mode without MQTT. When MQTT is configured in the `.ini` file, the clock will connect and respond to commands on the configured topic.

## Connection Details

### MQTT Configuration
MQTT settings are defined in the clock's `.ini` configuration file under the `[mqtt]` section:

```ini
[mqtt]
host = localhost
port = 1884
topic = paradox/clock/instance-name
reconnect_interval = 5000
keep_alive = 60
```

- **Base Topic**: Defined in `[mqtt] topic` (e.g., `paradox/clock/my-clock`)
- **Commands Topic**: `{base}/commands` (receives commands)
- **State Topic**: `{base}/state` (publishes heartbeat/lifecycle)
- **Events Topic**: `{base}/events` (publishes command acknowledgments)
- **Warnings Topic**: `{base}/warnings` (publishes error/warning messages)
- **Protocol**: WebSocket MQTT (for browser compatibility) or standard MQTT
- **Default Ports**: 1883 (standard MQTT), 1884 (WebSocket)
- **Message Format**: JSON

### Mosquitto Example Config
```conf
listener 1883 0.0.0.0
protocol mqtt

listener 1884
protocol websockets
```

Restart Mosquitto after editing:
```bash
sudo systemctl restart mosquitto
```

## MQTT Topics

### Commands (Input) - `{base}/commands`
The clock subscribes to this topic to receive control commands. All commands are JSON objects with a `command` field.

### State (Output) - `{base}/state`
The clock publishes state messages periodically (~10-15s) and immediately on key changes (mode transitions, time updates, start/pause/resume, fade transitions, hint updates).

Example state payload:
```json
{
  "mode": "countdown",
  "state": "running",
  "time": "05:30",
  "visible": true,
  "kiosk": true
}
```

Fields:
- `mode`: Current timing mode (`countdown`, `clock`, or `stopwatch`)
- `state`: Timer state (`running`, `paused`, `stopped`)
- `time`: Current time display (format depends on mode)
  - countdown: `MM:SS` (remaining time)
  - clock: `HH:MM:SS` or `HH:MM` (current time)
  - stopwatch: `MM:SS` or `HH:MM:SS` (elapsed time)
- `visible`: `true` after fadeIn completes, `false` when faded out
- `kiosk`: `true` if running in kiosk/fullscreen mode
- `mediaId`: Catalog pack id (integer) **only when a pack has been set**. Omit the field entirely when unset.

### Events (Output) - `{base}/events`
The clock publishes acknowledgment events when commands are received:
```json
{
  "event": "command_received",
  "t": 1698012345678,
  "message": {"command": "start", "time": "05:00"}
}
```

Event types:
- `command_received`: Command was accepted and processed
- `command_rejected`: Command was invalid or rejected (includes `reason` field)
- `mediaSwitched`: Media pack id was applied (`mediaId`, `refresh`, `refreshed`)

### Warnings (Output) - `{base}/warnings`
The clock publishes warning messages for errors or invalid commands:
```json
{
  "warning": "Invalid JSON received",
  "t": 1698012345678,
  "details": {"payload": "...", "error": "..."}
}
```

## Command Categories

## 1. Mode Control Commands

### Switch Mode
Change the clock's operating mode. Some clock styles may not support all modes.

```json
{"command": "setMode", "mode": "countdown|clock|stopwatch"}
```

**Examples**:
```json
{"command": "setMode", "mode": "countdown"}
{"command": "setMode", "mode": "clock"}
{"command": "setMode", "mode": "stopwatch"}
```

**Behavior**:
- Switches to specified mode if supported by the clock style
- Resets timer state (clears countdown/stopwatch time)
- Clock mode shows current system time
- Unsupported modes return `command_rejected` event

**Availability**: Only available if the clock style was configured with multiple mode support in its `.ini` file.

## 2. Timer Control Commands

### Start/Resume
Begins or resumes the timer (countdown or stopwatch).

```json
{"command": "start"}
```
or
```json
{"command": "resume"}
```
or (optional pack, suite contract)
```json
{"command": "start", "mediaId": 2, "refresh": false}
```

**Behavior**:
- **Countdown mode**: Starts counting down from current time
- **Stopwatch mode**: Starts counting up from current time
- **Clock mode**: No effect (clock always shows current time)
- Optional `mediaId` / `refresh` on `start` run `switchMedia` first (see Media pack). When omitted, start does not change the retained pack.

### Pause
Stops the timer without changing the display.

```json
{"command": "pause"}
```

**Behavior**:
- **Countdown/Stopwatch**: Timer stops, time remains displayed
- **Clock mode**: No effect

### Stop/Reset
Stops the timer and resets to initial state.

```json
{"command": "stop"}
```

**Behavior**:
- **Countdown mode**: Stops and resets to initial countdown value (if configured)
- **Stopwatch mode**: Stops and resets to 00:00
- **Clock mode**: No effect

## 3. Time Setting Commands

### Set Time (Countdown Mode)
Sets the countdown time and updates the display.

```json
{"command": "setTime", "time": "MM:SS"}
```

**Examples**:
```json
{"command": "setTime", "time": "60:00"}  // 60 minutes
{"command": "setTime", "time": "05:30"}  // 5 minutes 30 seconds
{"command": "setTime", "time": "00:45"}  // 45 seconds
```

**Format**:
- `MM:SS` where MM = minutes (00-99), SS = seconds (00-59)
- Leading zeros required
- Valid only in `countdown` mode

**Behavior**:
- Updates countdown display to specified time
- Does not start/resume countdown (use `start` or combined command)
- Invalid formats return `command_rejected` event

### Combined Set Time and Start
Sets the countdown time and immediately starts the timer.

```json
{"command": "start", "time": "MM:SS"}
```

**Examples**:
```json
{"command": "start", "time": "30:00"}     // Set 30 minutes and start
{"command": "resume", "time": "10:00"}    // Set 10 minutes and resume
```

**Behavior**:
- Sets time to specified value
- Immediately activates countdown
- Combines setTime + start in one atomic operation

### Set Stopwatch Time
Sets the stopwatch elapsed time (useful for resuming from a saved state).

```json
{"command": "setTime", "time": "MM:SS"}
```

**Behavior**:
- Valid only in `stopwatch` mode
- Sets elapsed time display
- Does not start stopwatch (use `start`)

## 4. Display Control Commands

### Show (Instant)
Makes the clock visible instantly.

```json
{"command": "show"}
```

**Behavior**:
- Equivalent to `fadeIn` with a fade time of `0` seconds
- Publishes normal `command_received` acknowledgment

### Hide (Instant)
Hides the clock instantly.

```json
{"command": "hide"}
```

**Behavior**:
- Equivalent to `fadeOut` with a fade time of `0` seconds
- Publishes normal `command_received` acknowledgment

### Fade In
Makes the clock display visible with a smooth fade-in effect.

```json
{"command": "fadeIn", "duration": 2}
```

**Parameters**:
- `duration` (optional): Fade duration in seconds
- `fadeTime` (optional): Alias for `duration` in seconds
- If both are missing or invalid, fallback uses `.ini` `fade_duration_ms` (default `2000ms`, i.e. 2 seconds)

**Examples**:
```json
{"command": "fadeIn"}                    // Use default duration
{"command": "fadeIn", "duration": 0.5}   // Quick 0.5 second fade
{"command": "fadeIn", "duration": 3}     // Slow 3 second fade
```

### Fade Out
Hides the clock display with a smooth fade-out effect.

```json
{"command": "fadeOut", "duration": 2}
```

**Parameters**:
- `duration` (optional): Fade duration in seconds
- `fadeTime` (optional): Alias for `duration` in seconds
- If both are missing or invalid, fallback uses `.ini` `fade_duration_ms` (default `2000ms`, i.e. 2 seconds)

**Examples**:
```json
{"command": "fadeOut"}                     // Use default duration
{"command": "fadeOut", "duration": 1}      // 1 second fade out
{"command": "fadeOut", "duration": 0.25}   // Quick fade
```

### Get State
Request an immediate state publish.

```json
{"command": "getState"}
```

**Behavior**:
- Publishes current state to `{base}/state` topic immediately
- Rate-limited to one request per 900ms
- Exceeding rate limit returns `command_rejected` with `reason: "rate_limited"`

## 5. Hint System Commands

### Display Hint
Shows a text hint overlay on the clock display.

Two equivalent formats are accepted:

```json
{"command": "hint", "text": "Your hint text here", "duration": 10}
```
```json
{"hint": "Your hint text here", "duration": 10}
```

**Parameters**:
- `text` / `hint`: Text to display (required)
- `duration`: Display duration in seconds (optional, default from `.ini` `hint_duration_default`). Supports large values (e.g. `3600` for one hour).

**Examples**:
```json
{"command": "hint", "text": "Check the manual", "duration": 8}
{"command": "hint", "text": "Time is running out!"}  
{"hint": "Look behind you", "duration": 5}
```

**Behavior**:
- Text appears as overlay (position/style defined in `.ini`)
- Automatically removed after `duration` seconds
- Sending a new hint while one is displayed replaces it immediately and resets the timer
- `clearHint` (see below) removes it early; `hide` and `clear` also remove it as a side-effect
- Available in all modes

### Clear Hint
Immediately removes the current hint overlay without affecting the clock display or timer state.

```json
{"command": "clearHint"}
```

**Behavior**:
- Cancels the expiry timer for the current hint
- Has no effect if no hint is currently displayed
- Publishes a `command_received` event with `{"command": "clearHint"}`
- Does **not** hide the clock or affect the countdown

## 6. Display Color Commands

### Set Display Colors
Updates LED clock background and text color at runtime.

```json
{
  "command": "setDisplayColors",
  "backgroundColor": "navy",
  "textColor": "#ffcc00",
  "textAlpha": 0.6,
  "fadeTime": 1.5
}
```

**Parameters**:
- `backgroundColor` (optional): Named color or hex (`#RGB`/`#RRGGBB`)
- `textColor` (optional): Named color or hex (`#RGB`/`#RRGGBB`)
- `textAlpha` (optional): Text opacity from `0.0` (fully transparent) to `1.0` (fully opaque)
- `fadeTime` (optional): Transition time in seconds (supports fractional values like `1.5`). If omitted, change is instant.

Named colors currently accepted:
`black`, `white`, `red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `orange`, `purple`, `pink`, `gray`, `silver`, `navy`, `teal`, `lime`

**Examples**:
```json
{"command":"setDisplayColors","backgroundColor":"teal","textColor":"white","textAlpha":1}
{"command":"setDisplayColors","backgroundColor":"#102A43","textColor":"#FEE440","textAlpha":0.25}
{"command":"setDisplayColors","textColor":"cyan","textAlpha":0}
{"command":"setDisplayColors","backgroundColor":"#0f0","textColor":"black"}
{"command":"setDisplayColors","backgroundColor":"white","textColor":"black","textAlpha":0,"fadeTime":1}
```

**Behavior**:
- Applies to LED/digit styles at runtime
- `fadeTime` controls transition for background color, text color, and text alpha
- When `fadeTime` is set, the renderer performs smooth interpolation updates (20Hz) across the interval
- Publishes `display_colors_updated` event with effective values
- Invalid fields are ignored and publish warnings; valid fields still apply

### Reset Display Colors
Restores runtime display colors to built-in defaults.

```json
{"command": "resetDisplayColors"}
```

**Behavior**:
- Restores background to `white`
- Restores text color to `black`
- Resets text alpha to `1.0` (opaque)
- Publishes `display_colors_updated` with `reset: true`

## 7. Layouts

Present only when the clock INI has `[layout.*]` sections. On a clock without layouts these commands are rejected with `layouts_not_configured`, and state payloads stay as they are today.

`show`, `hide`, `fadeIn`, and `fadeOut` move a full-screen veil. `show` and `hide` use duration 0. `fadeIn` and `fadeOut` use `duration` or `fadeTime` in seconds. Optional `color` sets the veil (`#RGB`, `#RRGGBB`, `#RRGGBBAA`, or a named color). Optional `field` fades that text field and leaves the veil alone. A page `hide` or `fadeOut` clears the hint when the transition finishes. Time and other text fields stay.

### setLayout

```json
{"command":"setLayout","layout":"normal_clock"}
{"command":"setLayout","layout":"win_screen","win_message":"You did it!","volume":80}
```

Shows that layout and loads its defaults. Extra keys that name a text field on the layout override that field. `volume` is 0–200 (100 = unity) when the layout has a video. Does not start, stop, or re-sync the timer. Event `layout_changed` includes `previous`.

### setMessage

```json
{"command":"setMessage","win_message":"You did it!","fadeTime":0.3}
{"command":"setMessage","win_message":null}
```

Sets named fields on the current layout. `""` blanks a field. `null` restores the layout default. `time` and `hint` are not set here. Event `message_changed`.

### setImage

```json
{"command":"setImage","file":"lose.png"}
```

Replaces the background still of the layout that is showing and pauses its video. `file` is relative to `[layouts] assets_dir` and must be one of the images from that directory. The next `setLayout`, including the same layout, restores the layout's own image and video. Event `image_changed`.

### setVolume

```json
{"command":"setVolume","volume":80}
```

Sets the playing layout video's volume on the PFx scale, 0–200, without restarting it. 100 is unity. Above 100 is a gain up to 2.0 at 200. No video on the current layout rejects with `no_video`.

### Hint

`hint` still uses `duration` as how long the text stays up. `fadeTime` is the opacity fade, in seconds. A layout with no `hint` field rejects the command.

### State

When layouts are configured, state adds `layout`, `fields` (text on the shown layout only), and `volume` when that layout has a video. A field whose opacity is not 1 is `{ "text", "opacity" }`.

## 8. Media pack (`switchMedia`)

Suite contract: PxH `docs/standards/MQTT-CONTRACT.md` § Media pack. PxC does **not**
prefix a PFx-style `media_dir`. A pack is a **prebuilt React bundle** (or URL). Rooms
must **build one site per pack** and point the clock at that URL. Optional later catalog
`pxcUrl` is not required here.

Loading a new bundle **may flash**. This build does not preload the next pack.

### Switch media pack

```json
{"command": "switchMedia", "mediaId": 2, "refresh": false}
```

| Field | Required | Default | Meaning |
|-------|----------|---------|---------|
| `mediaId` | yes | — | Catalog Version ID. JSON number or decimal string matching `^[1-9][0-9]{0,8}$`. Reject `0`, leading zeros, `/`, `..`, empty slugs like `v1`. On reject: ignore the command, publish `warnings`, keep the previous pack. Send `mediaId: null` (on `switchMedia` only) to clear. |
| `refresh` | no | `false` | If `true`, navigate/reload the pack URL even if already on that id. If `false` and already on that pack, do not navigate. |

Unknown extra fields are ignored. Do not invent additional MQTT fields on this command.

**Optional INI map** (config, not an MQTT field):

```ini
[media]
url = /clock/

[media.1]
url = /clock/en/

[media.2]
url = /clock/es/
```

`[media] url` is the cleared / default bundle. `[media.<id>] url` is the prebuilt site
for that pack. Operators can also put the same `media` object in runtime `config.json`.

**Behavior**:
- Accepts the command, stores `mediaId`, publishes retained `{base}/state` (omit `mediaId` entirely when unset) and a non-retained `{base}/events` `mediaSwitched` receipt.
- If a URL is configured for that id: navigate the kiosk to it (`refresh: true` reloads when already on that pack). The new page may flash.
- If no URL is configured: still accept, set state `mediaId`, and publish a warning that rooms must build one site per pack / configure `[media.N] url`. Do not crash. Do not invent a `media_dir` prefix.
- `start` may include the same optional `mediaId` / `refresh`. When present (and not `null`), it is equivalent to `switchMedia` immediately before the rest of start. If that switch navigates to another bundle, the remainder of start is not replayed on the new page — send `start` again after the new clock reconnects.

`mediaSwitched` example:

```json
{
  "event": "mediaSwitched",
  "mediaId": 2,
  "refresh": false,
  "refreshed": []
}
```

`refreshed` is `["bundle"]` only when `refresh` is true and a navigation/reload actually happens; otherwise `[]`.

Unknown commands already return `command_rejected` with `reason: "unknown_command"` and do **not** tear down the process.

## Mode-Specific Behaviors

### Countdown Mode
- Timer counts down from set time to 00:00
- Supports `start`, `pause`, `resume`, `stop`, `setTime`
- Visual representation depends on clock style (analog hands, digits, etc.)
- Can trigger events at 00:00 (implementation-specific)

### Clock Mode (Real-time)
- Displays current system time
- Timer control commands have no effect
- Continuously updates display
- May support 12-hour or 24-hour format (style-specific)

### Stopwatch Mode
- Timer counts up from 00:00
- Supports `start`, `pause`, `resume`, `stop`, `setTime`
- Can start from a preset elapsed time via `setTime`
- Visual representation depends on clock style

## Error Handling

### Invalid Commands
Commands that cannot be processed return a `command_rejected` event:

```json
{
  "event": "command_rejected",
  "t": 1698012345678,
  "message": {"command": "invalid"},
  "reason": "unknown_command"
}
```

Common rejection reasons:
- `unknown_command`: Command not recognized
- `invalid_format`: JSON structure invalid
- `invalid_time_format`: Time string doesn't match MM:SS
- `mode_not_supported`: Clock style doesn't support requested mode
- `rate_limited`: Request rate exceeded
- `invalid_parameter`: Parameter value out of range

### Connection Loss
If MQTT connection is lost:
- Clock continues operating in current mode
- Timer continues running (if started)
- Upon reconnection, clock publishes current state
- Buffered commands are not replayed (send new commands after reconnection)

## Configuration Reference

Relevant `.ini` settings for MQTT behavior:

```ini
[mqtt]
host = localhost
port = 1884
topic = paradox/clock/my-clock
reconnect_interval = 5000
keep_alive = 60

[display]
fade_duration_ms = 2000

[type]
mode = countdown    # Default mode; can be changed via MQTT if supported
```

## Testing Commands

Use `mosquitto_pub` to test commands:

```bash
# Set countdown time
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"setTime","time":"05:00"}'

# Start countdown
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"start"}'

# Switch to clock mode
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"setMode","mode":"clock"}'

# Display hint
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"hint","text":"Test hint message","duration":5}'

# Clear hint immediately
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"clearHint"}'

# Set display colors (named + hex + alpha)
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"setDisplayColors","backgroundColor":"navy","textColor":"#ffcc00","textAlpha":0.6}'

# Fade text to transparent over 1.5 seconds
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"setDisplayColors","backgroundColor":"white","textColor":"black","textAlpha":0,"fadeTime":1.5}'

# Fade to black background and navy text over 2 seconds while text fades in
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"setDisplayColors","backgroundColor":"black","textColor":"navy","textAlpha":1,"fadeTime":2}'

# Reset display colors to config defaults
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"resetDisplayColors"}'

# Switch to media pack 2 (loads [media.2] url if configured; may flash)
mosquitto_pub -h localhost -p 1883 -t "paradox/clock/test/commands" \
  -m '{"command":"switchMedia","mediaId":2,"refresh":false}'
```

Manual sequence script:
```bash
./scripts/manual-color-cycle-sequence.sh agent22.local 1883 paradox/agent22/clock/commands
```

Current script profile: 23 seconds total (10s opaque color steps, 8s alpha ramp, then 3s fade-out + 2s fade-in).

Monitor state:
```bash
mosquitto_sub -h localhost -p 1883 -t "paradox/clock/test/state" -v
```

## Version Compatibility

This API is versioned independently of clock implementations:
- **API Version**: 1.0
- Clock implementations may support a subset of commands depending on their configured style and features
- Unsupported commands return `command_rejected` rather than warnings
- Additional fields in state messages should be tolerated by consumers (forward compatibility)

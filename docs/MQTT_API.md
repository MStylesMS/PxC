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
- **State Topic**: `{base}/state` (publishes heartbeat/status)
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

**Behavior**:
- **Countdown mode**: Starts counting down from current time
- **Stopwatch mode**: Starts counting up from current time
- **Clock mode**: No effect (clock always shows current time)

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

### Fade In
Makes the clock display visible with a smooth fade-in effect.

```json
{"command": "fadeIn", "duration": 2}
```

**Parameters**:
- `duration` (optional): Fade duration in seconds (default from `.ini` `fade_duration_ms`)

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
- `duration` (optional): Fade duration in seconds (default from `.ini`)

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
```

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

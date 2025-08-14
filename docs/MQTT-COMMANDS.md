# MQTT Commands Reference for Houdini Escape Room Clock

## Overview
This document provides a complete reference for all MQTT commands supported by the Houdini escape room clock application. These commands allow real-time control of the clock display, timing, and hint system.

## Connection Details

### MQTT Configuration
- **Base Topic**: `paradox/houdini/clock`
- **Commands Topic**: `paradox/houdini/clock/commands` (receives commands)
- **State Topic**: `paradox/houdini/clock/state` (publishes heartbeat/status)
- **Events Topic**: `paradox/houdini/clock/events` (publishes command acknowledgments)
- **Warnings Topic**: `paradox/houdini/clock/warnings` (publishes error/warning messages)
- **Protocol**: WebSocket MQTT (for browser compatibility)
- **Default Ports**: 1883 (standard MQTT, CLI/tools), 1884 (WebSocket, browser)
- **Message Format**: JSON

#### Configuration File
The clock reads its configuration from `config/clock.ini`:
```ini
[mqtt]
host = localhost
port = 1884
topic = paradox/houdini/clock
reconnect_interval = 5000
keep_alive = 60

[display]
fade_duration_default = 2000
hint_duration_default = 25
clock_orientation = -90

# Second hand tick animation style
# alternate (default): alternate between two irregular ticks
# tick1 or tick2: fixed tick pattern
# off: disable tick keyframe motion (still counts visually)
seconds_tick_style = alternate

enable_console_logging = true
```

#### Mosquitto Example Config
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

### Commands (Input) - `paradox/houdini/clock/commands`
The clock subscribes to this topic to receive control commands.

### State (Output) - `paradox/houdini/clock/state`
The clock publishes heartbeat messages to this topic every 15 seconds:
```
active
```

### Events (Output) - `paradox/houdini/clock/events`
The clock publishes acknowledgment events when commands are received:
```json
{
  "event": "command_received",
  "t": 1692012345678,
  "message": {"command": "start", "time": "02:00"}
}
```

### Warnings (Output) - `paradox/houdini/clock/warnings`
The clock publishes warning messages for errors or invalid commands:
```json
{
  "warning": "Invalid JSON received",
  "t": 1692012345678,
  "details": {"payload": "invalid json", "error": "Unexpected token"}
}
```

## Command Categories

## 1. Clock Control Commands

### Start/Resume Countdown
Begins or resumes the countdown timer.
```json
{"command": "start"}
```
or
```json
{"command": "resume"}
```
**Effect**: Clock starts counting down from current time
**Use Case**: Begin or resume the escape room challenge timer

### Pause Countdown  
Stops the countdown timer without changing the display.
```json
{"command": "pause"}
```
**Effect**: Clock stops counting down, time remains displayed
**Use Case**: Pause game for interruptions, safety briefings

## 2. Time Setting Commands

### Set Countdown Time
Sets the countdown time and updates the display.
```json
{"time": "MM:SS"}
```

**Examples**:
```json
{"time": "60:00"}  // 60 minutes
{"time": "45:30"}  // 45 minutes 30 seconds  
{"time": "05:00"}  // 5 minutes
{"time": "01:30"}  // 1 minute 30 seconds
{"time": "00:45"}  // 45 seconds
```

**Format**: 
- `MM:SS` where MM = minutes (00-99), SS = seconds (00-59)
- Leading zeros are required
- Invalid formats are ignored

**Visual Behavior**:
- Times ≥ 60 seconds: Shows both minute and second hands
- Times < 60 seconds: Shows only second hand
- Hands animate smoothly to new positions

## 3. Display Control Commands

### Fade In
Makes the clock display visible with a smooth fade-in effect.
```json
{"command": "fadeIn", "duration": 1000}
```
**Parameters**:
- `duration` (optional): Fade duration in milliseconds (default: 2000ms)

**Examples**:
```json
{"command": "fadeIn"}                    // 2 second fade in
{"command": "fadeIn", "duration": 500}   // 0.5 second fade in
{"command": "fadeIn", "duration": 3000}  // 3 second fade in
```

**Legacy Format**: `{"command": "fadein"}` *(will be deprecated)*

### Fade Out
Hides the clock display with a smooth fade-out effect.
```json
{"command": "fadeOut", "duration": 500}
```
**Parameters**:
- `duration` (optional): Fade duration in milliseconds (default: 2000ms)

**Examples**:
```json
{"command": "fadeOut"}                     // 2 second fade out
{"command": "fadeOut", "duration": 1000}   // 1 second fade out
{"command": "fadeOut", "duration": 250}    // Quick 0.25 second fade
```

**Legacy Format**: `{"command": "fadeout"}` *(will be deprecated)*

## 4. Hint System Commands

### Display Hint
Shows a text hint overlay on the clock display.
```json
{"hint": "Your hint text here", "duration": 10}
```

**Parameters**:
- `hint`: Text to display (required)
- `duration`: Display duration in seconds (optional, default: 25 seconds)

**Examples**:
```json
{"hint": "Look behind the mirror", "duration": 8}
{"hint": "Check the book spine", "duration": 5}  
{"hint": "The key is in the last place you'd look", "duration": 12}
{"hint": "Time is running out!", "duration": 3}
```

**Visual Behavior**:
- Text appears centered over the clock
- Uses custom "Alger" font for themed appearance
- White text with shadow for visibility
- Automatically fades out after duration
- New hints replace existing ones

## Command Combinations and Scenarios

### Game Start Sequence
```json
{"time": "60:00"}
{"command": "fadeIn", "duration": 2000}
{"command": "start"}
```

or

```json
{"command": "resume"}
```

### Mid-Game Hint
```json
{"hint": "Check the ancient symbols", "duration": 10}
```

### Final Warning
```json
{"time": "05:00"}
{"hint": "Final challenge unlocked!", "duration": 8}
```

### Emergency Pause
```json
{"command": "pause"}
{"hint": "Game paused - please wait", "duration": 30}
```

### Game End
```json
{"command": "pause"}
{"command": "fadeOut", "duration": 1000}
```

## Technical Details

### Message Processing
- All commands are processed asynchronously
- Invalid JSON messages are ignored silently
- Unknown command types are logged but ignored
- Multiple commands can be sent in rapid succession

### Error Handling
- Invalid time formats are ignored (no state change)
- Missing required parameters cause command to be ignored
- Network disconnections trigger automatic reconnection
- Connection status is visible in browser developer console

### Performance Considerations
- Commands are processed immediately upon receipt
- Smooth animations are prioritized over command responsiveness
- Large hint text may affect display performance
- Rapid command sequences may cause visual artifacts

## Testing Commands

### Quick Test Sequence (Corrected Format)
```bash
# Using mosquitto_pub command line tool
TOPIC="paradox/houdini/mirror/clock/commands"
HOST="localhost"
PORT="1883"

# Set time and start
mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"time": "10:00"}'
mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"command": "start"}'

# Show hint
mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"hint": "Test hint", "duration": 5}'

# Test fade effects
mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"command": "fadeOut", "duration": 1000}'
mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"command": "fadeIn", "duration": 1000}'

# Pause
mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"command": "pause"}'
```

### Legacy Format (Current Implementation)
```bash
# Until PR-8 is completed, use legacy format:
TOPIC="Paradox/Houdini/Mirror/Clock/Commands"

mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"command": "fadein"}'
mosquitto_pub -h $HOST -p $PORT -t $TOPIC -m '{"command": "fadeout"}'
```

## Migration Notes

### Format Changes (ISSUE-8)
- **Topic**: `Paradox/Houdini/...` → `paradox/houdini/...`
- **Commands**: `fadein` → `fadeIn`, `fadeout` → `fadeOut`
- **Timing**: Will be implemented in PR-8
- **Compatibility**: Temporary backward compatibility during transition

### Configuration Changes (ISSUE-9)
- **Settings**: Moving from package.json to .ini files
- **Benefits**: Easier environment management
- **Timing**: Will be implemented in PR-9

## Best Practices

### Timing
- Allow fade effects to complete before sending new display commands
- Use appropriate hint durations (5-15 seconds typical)
- Coordinate time setting with game progression

### Hint Usage
- Keep hint text concise and readable
- Use hints sparingly for maximum impact
- Consider display size and viewing distance
- Test hint readability in actual game environment

### Error Recovery
- Monitor connection status in browser console
- Have backup commands ready for network issues
- Test all commands before live game sessions
- Keep command history for troubleshooting

### Error Handling
The clock application now includes robust error handling:
- **Invalid JSON**: Malformed JSON messages are logged to the warnings topic
- **Unknown Commands**: Unrecognized commands trigger warning messages
- **Invalid Time Formats**: Time parsing errors are captured and reported
- **Connection Issues**: Automatic reconnection with exponential backoff
- **Graceful Degradation**: Application continues running even with MQTT errors

All errors and warnings are published to `paradox/houdini/clock/warnings` for monitoring.

## Troubleshooting

### Commands Not Working
1. Verify MQTT broker is running and accessible
2. Check topic name exactly matches (case-sensitive)
3. Validate JSON format using online JSON validator
4. Check browser developer console for error messages
5. Test with simple commands first (start/pause)

### Connection Issues
1. Verify WebSocket port (1884) is accessible
2. Check firewall settings on MQTT broker
3. Test MQTT connection with standalone client
4. Verify environment variables are correctly set

### Display Issues
1. Check browser developer console for JavaScript errors
2. Verify all static assets (fonts, images) are loading
3. Test on target hardware and display setup
4. Confirm browser supports required CSS features

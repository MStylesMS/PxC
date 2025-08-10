# Control Page MQTT Specifications (Separate Repository)

## Overview
This document specifies the MQTT commands for the Houdini escape room control page interface. This is a **separate application** from the clock display and will be moved to its own repository.

**Note**: This is for reference only - not implemented in this clock display repository.

---

## Control Interface Commands

The control page is a web interface that allows operators to manage the escape room game state and send commands to various components.

### Commands Published by Control Page

| Topic | JSON Format | UI Element | Description |
|-------|-------------|------------|-------------|
| `paradox/houdini/commands` | `{"command": "start60"}` | "Start 60" button | Start 60-minute timer |
| `paradox/houdini/commands` | `{"command": "start30"}` | "Start 30" button | Start 30-minute timer |
| `paradox/houdini/commands` | `{"command": "pause"}` | "Pause" button | Pause/Resume toggle |
| `paradox/houdini/commands` | `{"command": "reset"}` | "Reset" button | Reset game state |
| `paradox/houdini/commands` | `{"command": "solve"}` | "Solve" button | Mark game as solved |
| `paradox/houdini/commands` | `{"command": "fail"}` | Right-click "Solve" | Mark game as failed (with confirmation) |

### Props Control

| Topic | JSON Format | UI Element | Description |
|-------|-------------|------------|-------------|
| `paradox/houdini/props/lights` | `{"color": "red"}` | "Red" button | Set props lighting to red |
| `paradox/houdini/props/lights` | `{"color": "green"}` | "Green" button | Set props lighting to green |
| `paradox/houdini/props/lights` | `{"color": "white"}` | "White" button | Set props lighting to white |

### Clock Control from Control Page

| Topic | JSON Format | UI Element | Description |
|-------|-------------|------------|-------------|
| `paradox/houdini/mirror/clock/commands` | `{"hint": "text", "duration": 10}` | Hint input + "Send" | Send hint to clock display |

**Note**: Duration field is optional for control page implementation.
**Special**: If hint text box is blank, send a single space `" "` to clear hints.

### Status Subscriptions (Control Page Receives)

| Topic | JSON Format | UI Element | Description |
|-------|-------------|------------|-------------|
| `paradox/houdini/mirror/clock/status` | `{"time": <seconds>}` | "Time Left" display | Shows remaining time in MM:SS format |

---

## Other Escape Room Systems (Reference)

### Picture System Control

| Topic | JSON Format | UI Elements | Description |
|-------|-------------|-------------|-------------|
| `paradox/houdini/picture` | `{"video": "filename", "duration": <seconds>, "nextVideo": "filename"}` | Current/Remaining/Next Up fields | Video playback control for picture system |

**Display Fields**:
- **Current**: Shows filename of currently playing video
- **Remaining**: Countdown timer in MM:SS format (if duration provided)
- **Next Up**: Shows next video filename (optional field)

### Mirror Video System Control

| Topic | JSON Format | UI Elements | Description |
|-------|-------------|-------------|-------------|
| `paradox/houdini/mirror/video` | `{"video": "filename", "duration": <seconds>, "nextVideo": "filename"}` | Current/Remaining/Next Up fields | Video playback control for mirror system |

**Display Fields**:
- **Current**: Shows filename of currently playing video  
- **Remaining**: Countdown timer in MM:SS format (if duration provided)
- **Next Up**: Shows next video filename (optional field)

---

## Control Page UI Behavior

### Button States
- **Start 60 & Start 30**: Disabled after game starts until Reset is pressed
- **Pause Button**: Text changes to "Resume" when game is paused
- **Solve Button**: Right-click shows "Fail Game?" confirmation dialog

### Timer Displays
- **Time Left**: Shows clock countdown in MM:SS format
- **Picture Remaining**: Shows picture video countdown in MM:SS format  
- **Mirror Remaining**: Shows mirror video countdown in MM:SS format

### Input Fields
- **Hint Text**: Free text input for sending hints to clock display
- **Duration**: Optional numeric input for hint display duration

---

## Implementation Notes

### Control Page Architecture
This should be a separate React or HTML/JavaScript application that:
1. **Publishes** control commands to various escape room systems
2. **Subscribes** to status updates from those systems
3. **Displays** current state information to operators
4. **Manages** UI state (button enable/disable, text changes)

### MQTT Integration
- Uses same MQTT broker as clock display
- Publishes to command topics
- Subscribes to status topics
- Handles connection management and error recovery

### Future Development
When creating the control page repository:
1. Use this specification as requirements
2. Implement responsive web interface
3. Include MQTT client for browser communication
4. Add operator authentication if needed
5. Include logging and monitoring features

---

## Migration from Clock Repository
When this moves to its own repository:
1. Create new React or HTML/JS project
2. Copy this specification as requirements document
3. Implement control interface using MQTT.js or similar
4. Test integration with existing clock display
5. Deploy as separate web application

# MQTT Commands Specification for Houdini Escape Room

## Overview
This document specifies the MQTT message formats for the Houdini escape room system, which consists of multiple interconnected components.

---

## Clock Display Commands (This Repository)

These commands control the countdown clock display application in this repository.

### Topic: `paradox/houdini/mirror/clock/commands`

| Command Type | JSON Format | Description |
|--------------|-------------|-------------|
| **Set Time** | `{"time": "MM:SS"}` | Sets the clock to the designated time (MM:SS format) |
| **Start Countdown** | `{"command": "start"}` | Starts the clock counting down |
| **Pause Countdown** | `{"command": "pause"}` | Pauses the clock countdown |
| **Fade Out** | `{"command": "fadeOut", "duration": 2000}` | Transition to black screen over specified milliseconds. Clock continues tracking time while hidden |
| **Fade In** | `{"command": "fadeIn", "duration": 2000}` | Transition from black to show clock over specified milliseconds |
| **Display Hint** | `{"hint": "User text", "duration": 25}` | Display text centered on screen in 90° orientation. Fades in over 2s, holds for duration (seconds), fades out over 2s. Default duration: 25s. Send space " " to clear |

### Status Updates from Clock (Published by Clock App)

| Topic | JSON Format | Description |
|-------|-------------|-------------|
| `paradox/houdini/mirror/clock/status` | `{"time": <seconds>}` | Current countdown time in seconds |

---

## Control Page Commands (Separate Repository)

These commands are for the operator control interface (not implemented in this repository).

### Control Interface Publishes:

| Topic | JSON Format | UI Element | Description |
|-------|-------------|------------|-------------|
| `paradox/houdini/commands` | `{"command": "start60"}` | "Start 60" button | Start 60-minute timer |
| `paradox/houdini/commands` | `{"command": "start30"}` | "Start 30" button | Start 30-minute timer |
| `paradox/houdini/commands` | `{"command": "pause"}` | "Pause" button | Pause/Resume toggle |
| `paradox/houdini/commands` | `{"command": "reset"}` | "Reset" button | Reset game state |
| `paradox/houdini/commands` | `{"command": "solve"}` | "Solve" button | Mark game as solved |
| `paradox/houdini/commands` | `{"command": "fail"}` | Right-click "Solve" | Mark game as failed (with confirmation dialog) |
| `paradox/houdini/props/lights` | `{"color": "red"}` | "Red" button | Set props lighting to red |
| `paradox/houdini/props/lights` | `{"color": "green"}` | "Green" button | Set props lighting to green |
| `paradox/houdini/props/lights` | `{"color": "white"}` | "White" button | Set props lighting to white |
| `paradox/houdini/mirror/clock` | `{"hint": "text", "duration": 10}` | Hint input + "Send" | Send hint to clock display |

### Control Interface Subscribes:

| Topic | JSON Format | UI Element | Description |
|-------|-------------|------------|-------------|
| `paradox/houdini/mirror/clock` | `{"time": <seconds>}` | "Time Left" display | Shows remaining time in MM:SS format |

---

## Other Escape Room Systems (Reference Only)

These are for other components in the escape room but not part of this repository.

### Picture System
| Topic | JSON Format | Description |
|-------|-------------|-------------|
| `paradox/houdini/picture` | `{"video": "filename", "duration": <seconds>, "nextVideo": "filename"}` | Video playback control |

### Mirror Video System  
| Topic | JSON Format | Description |
|-------|-------------|-------------|
| `paradox/houdini/mirror` | `{"video": "filename", "duration": <seconds>, "nextVideo": "filename"}` | Mirror video playback control |

---

## Implementation Notes

### Current vs. Corrected Naming
- **Current**: Topics use `Paradox/Houdini/...` (mixed case, leading slash)
- **Corrected**: Topics should use `paradox/houdini/...` (lowercase, no leading slash)
- **Commands**: Should use camelCase (e.g., `fadeOut`, `fadeIn`)

### Configuration Management
- MQTT broker settings currently hardcoded in package.json
- Should be moved to .ini configuration file for easier management

### Future Enhancements
- Topic naming standardization (ISSUE-8)
- Configuration file implementation (ISSUE-9)


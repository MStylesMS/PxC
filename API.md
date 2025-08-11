# API Documentation - MQTT Interface

This document describes the MQTT API for controlling the Houdini Clock application.

## 📡 MQTT Connection

### Connection Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Host** | `localhost` (dev) / `your-broker.com` (prod) | MQTT broker hostname |
| **Port** | `1884` (dev) / `8883` (prod SSL) | MQTT broker port |
| **Protocol** | WebSocket | Connection type for web browsers |
| **Client ID** | Auto-generated | Unique identifier per session |

### Topic Structure

```
Paradox/Houdini/Mirror/Clock/Commands
```

All commands are sent to this single topic. The application subscribes to this topic and processes incoming messages.

## 🎮 Command Reference

### Time Management Commands

#### Set Countdown Time

```
time <seconds>
```

**Description**: Sets the countdown timer to the specified number of seconds.

**Parameters**:
- `seconds` (integer): Time in seconds (must be positive)

**Examples**:
```
time 300        # Set to 5 minutes (300 seconds)
time 120        # Set to 2 minutes (120 seconds)
time 60         # Set to 1 minute (60 seconds)
time 1800       # Set to 30 minutes (1800 seconds)
```

**Behavior**:
- Updates the clock display immediately
- Resets any active countdown
- Clock hands move to reflect new time
- Does not automatically start the countdown

---

#### Start Countdown

```
start
```

**Description**: Begins the countdown timer from the currently set time.

**Parameters**: None

**Examples**:
```
start
```

**Behavior**:
- Activates the countdown mechanism
- Clock hands begin moving
- Timer decrements every second
- Visual state changes to "active"

---

#### Pause Countdown

```
pause
```

**Description**: Pauses the active countdown timer.

**Parameters**: None

**Examples**:
```
pause
```

**Behavior**:
- Stops the countdown at current time
- Clock hands stop moving
- Timer value preserved
- Visual state changes to "inactive"
- Can be resumed with `start` command

### Visual Effect Commands

#### Fade In Display

```
fadein
```

**Description**: Smoothly fades in the clock display from transparent to fully visible.

**Parameters**: None

**Examples**:
```
fadein
```

**Behavior**:
- Transitions opacity from current value to 1.0
- Smooth CSS transition animation
- Affects entire clock container
- Duration: ~1 second

---

#### Fade Out Display

```
fadeout
```

**Description**: Smoothly fades out the clock display from visible to transparent.

**Parameters**: None

**Examples**:
```
fadeout
```

**Behavior**:
- Transitions opacity from current value to 0.0
- Smooth CSS transition animation
- Clock remains functional but invisible
- Duration: ~1 second

### Hint System Commands

#### Display Hint Message

```
hint <message>
```

**Description**: Displays a temporary hint message overlay on the clock.

**Parameters**:
- `message` (string): Text to display (supports spaces and special characters)

**Examples**:
```
hint Welcome to the escape room!
hint Look for the hidden key
hint Time is running out...
hint Check the bookshelf
hint 🔑 The key is behind the painting
```

**Behavior**:
- Displays message as overlay on clock
- Auto-hides after 5 seconds
- Subsequent hint commands reset the timer
- Empty hint clears current message immediately

## 🔄 Command Sequences

### Typical Escape Room Flow

```bash
# 1. Setup - Set initial time (e.g., 60 minutes)
time 3600

# 2. Briefing - Show welcome message
hint Welcome! You have 60 minutes to escape.

# 3. Start - Begin countdown
start

# 4. Mid-game - Provide hints as needed
hint Look for clues in the books
hint The combination is hidden in the painting

# 5. Warning - Time running low
hint Only 10 minutes remaining!

# 6. Emergency - Pause if needed
pause

# 7. Resume - Continue after issue resolved
start

# 8. Dramatic effect - Fade for special moments
fadeout
# ... special effect happens ...
fadein

# 9. Victory - Stop timer (pause)
pause
hint Congratulations! You escaped!
```

### Testing Sequence

```bash
# Quick test sequence
time 10
hint Starting test sequence
start
# Wait a few seconds
pause
hint Test paused
fadeout
fadein
hint Test complete
```

## 📊 Message Format Specifications

### Valid Command Patterns

```regex
^time \d+$                    # time <number>
^start$                       # start
^pause$                       # pause
^fadein$                      # fadein
^fadeout$                     # fadeout
^hint .+$                     # hint <text>
```

### Error Handling

The application handles malformed commands gracefully:

| Invalid Command | Behavior |
|----------------|----------|
| `time abc` | Ignored (non-numeric time) |
| `time -5` | Ignored (negative time) |
| `unknown_command` | Ignored (unrecognized) |
| Empty message | Ignored |
| `hint` (no text) | Clears current hint |

### Case Sensitivity

- Commands are **case-sensitive**
- Use lowercase for all commands
- `START` or `Start` will be ignored

## 🛠️ Implementation Examples

### JavaScript/Node.js Client

```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('ws://localhost:1884');
const topic = 'Paradox/Houdini/Mirror/Clock/Commands';

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Set 5-minute countdown
  client.publish(topic, 'time 300');
  
  // Show welcome message
  client.publish(topic, 'hint Welcome to the Houdini Room!');
  
  // Start countdown after 2 seconds
  setTimeout(() => {
    client.publish(topic, 'start');
  }, 2000);
});
```

### Python Client

```python
import paho.mqtt.client as mqtt
import time

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")

client = mqtt.Client()
client.on_connect = on_connect

# Connect to broker
client.connect("localhost", 1884, 60)

# Send commands
topic = "Paradox/Houdini/Mirror/Clock/Commands"

# Setup game
client.publish(topic, "time 1800")  # 30 minutes
client.publish(topic, "hint Game begins in 10 seconds...")
time.sleep(10)
client.publish(topic, "start")

client.disconnect()
```

### Bash/CLI Testing

```bash
# Using mosquitto_pub (install mosquitto-clients)
TOPIC="Paradox/Houdini/Mirror/Clock/Commands"
BROKER="localhost"
PORT="1884"

# Test commands
mosquitto_pub -h $BROKER -p $PORT -t "$TOPIC" -m "time 60"
mosquitto_pub -h $BROKER -p $PORT -t "$TOPIC" -m "hint Ready?"
mosquitto_pub -h $BROKER -p $PORT -t "$TOPIC" -m "start"
sleep 5
mosquitto_pub -h $BROKER -p $PORT -t "$TOPIC" -m "pause"
mosquitto_pub -h $BROKER -p $PORT -t "$TOPIC" -m "hint Game paused"
```

## 🔍 Debugging & Monitoring

### Message Logging

To monitor MQTT messages:

```bash
# Subscribe to see all commands
mosquitto_sub -h localhost -p 1884 -t "Paradox/Houdini/Mirror/Clock/Commands"

# Subscribe with timestamp
mosquitto_sub -h localhost -p 1884 -t "Paradox/Houdini/Mirror/Clock/Commands" -F "%I:%M:%S %t %p"
```

### Browser Console Debugging

Open browser developer tools and check console for:

```javascript
// MQTT connection status
console.log('MQTT Connected:', mqttClient.isConnected());

// Message reception
mqtt.subscribe(topic).pipe(
  tap(message => console.log('Received:', message))
).subscribe();
```

### Common Issues

1. **Commands Not Working**:
   - Verify MQTT broker is running
   - Check topic spelling exactly
   - Ensure WebSocket support enabled on broker
   - Test with MQTT client tools first

2. **Clock Not Updating**:
   - Check browser console for errors
   - Verify JavaScript is enabled
   - Test with simple commands first (e.g., `time 10`)

3. **Hint Not Displaying**:
   - Ensure hint text is not empty
   - Check for CSS styling issues
   - Verify overlay is not hidden behind other elements

## 📋 Command Reference Summary

| Command | Parameters | Example | Description |
|---------|------------|---------|-------------|
| `time` | `<seconds>` | `time 300` | Set countdown time |
| `start` | None | `start` | Begin countdown |
| `pause` | None | `pause` | Pause countdown |
| `fadein` | None | `fadein` | Fade in display |
| `fadeout` | None | `fadeout` | Fade out display |
| `hint` | `<message>` | `hint Welcome!` | Show hint overlay |

## 🔐 Security Considerations

### Production MQTT

- Use SSL/TLS encryption (port 8883)
- Implement authentication if required
- Restrict broker access to known networks
- Consider message signing for critical applications

### Network Security

- Deploy on isolated escape room network
- Use VPN for remote management
- Monitor for unauthorized connections
- Implement rate limiting if needed

---

**API Version**: 1.0  
**Last Updated**: 2025  
**Compatible With**: Houdini Clock v1.0.1+

# Testing Guide for Houdini Clock Application

## Overview
This document provides comprehensive testing procedures for the Houdini escape room clock application, covering both development testing and escape room operational scenarios.

## Pre-Testing Setup

### Environment Requirements
- MQTT broker running on configured host/port
- Web browser with developer tools
- Network access to MQTT broker
- Test MQTT client (like MQTT.fx or mosquitto_pub)

### Configuration Check
```bash
# Verify environment variables in package.json
npm run start
# Should connect to MQTT broker at configured host:port
```

## Functional Testing Scenarios

### 1. Clock Display Testing

#### Time Setting
**Test**: Set various countdown times
```json
{"command": "setTime", "time": "05:30"}  // 5 minutes 30 seconds
{"command": "setTime", "time": "01:00"}  // 1 minute
{"command": "setTime", "time": "00:45"}  // 45 seconds
{"command": "setTime", "time": "10:00"}  // 10 minutes
```
**Expected**: Clock displays correct time with appropriate hands

#### Combined Time Set & Start
**Test**: Set time and start in one command
```json
{"command": "start", "time": "05:00"}   // Set 5 minutes and start
{"command": "resume", "time": "03:30"}  // Set 3:30 and resume
```
**Expected**: Clock immediately shows new time and begins countdown

#### Clock Control
**Test**: Start and pause functionality
```json
{"command": "start"}   // Clock begins countdown
{"command": "pause"}   // Clock stops countdown
```
**Expected**: Timer counts down when started, stops when paused

### 2. Visual Effects Testing

#### Fade Controls
**Test**: Display visibility controls
```json
{"command": "fadeIn", "duration": 1000}   // Fade in over 1 second (corrected)
{"command": "fadeOut", "duration": 2000}  // Fade out over 2 seconds (corrected)

// Legacy format (current implementation until PR-8):
{"command": "fadein", "duration": 1000}   
{"command": "fadeout", "duration": 2000}  
```
**Expected**: Smooth fade transitions at specified speeds

### 3. Hint System Testing

#### Hint Display
**Test**: Show hints with various durations
```json
{"hint": "Look behind the mirror", "duration": 10}    // 10 second hint
{"hint": "Check the book spine", "duration": 5}       // 5 second hint
{"hint": "Final clue revealed", "duration": 15}       // 15 second hint
```
**Expected**: Hints appear, remain visible for duration, then auto-hide

### 4. Edge Case Testing

#### Invalid Commands
**Test**: Malformed or invalid messages
```json
{"invalid": "command"}                    // Should be ignored with command_rejected event
{"command": "setTime", "time": "invalid"}// Should be rejected with invalid_time_format
{"command": "unknown"}                   // Should be rejected with unknown_command
{"command": "setTime", "time": "61:00"}  // Should be rejected (time > 60:00)
{"malformed json"}                       // Should trigger warning
```
**Expected**: Application continues normally, invalid commands publish rejection events

#### Extreme Values
**Test**: Boundary conditions
```json
{"command": "setTime", "time": "00:00"}  // Zero time (valid)
{"command": "setTime", "time": "60:00"}  // Maximum time (valid)
{"command": "fadeIn", "duration": 0}     // Zero duration effects
{"hint": "", "duration": 5}              // Empty hint (clears current)
```

## Escape Room Operational Testing

### Complete Game Scenario
1. **Pre-Game Setup**
   ```json
   {"command": "fadeOut", "duration": 500}
   ```

2. **Game Start**
   ```json
   {"command": "setTime", "time": "60:00"}
   {"command": "fadeIn", "duration": 2000}
   {"command": "start"}
   ```
   **Alternative** (combined command):
   ```json
   {"command": "fadeIn", "duration": 2000}
   {"command": "start", "time": "60:00"}
   ```

3. **Mid-Game Hints**
   ```json
   {"hint": "Time is running out!", "duration": 8}
   ```

4. **Final Countdown**
   ```json
   {"command": "setTime", "time": "05:00"}
   {"hint": "Final challenge!", "duration": 10}
   ```

5. **Game End**
   ```json
   {"command": "pause"}
   {"command": "fadeOut", "duration": 1000}
   ```

### Performance Testing

#### MQTT Connection Reliability
- Test connection loss and reconnection
- Verify message delivery during network issues
- Test with multiple rapid commands

#### Animation Performance
- Verify smooth clock hand movements
- Test fade effects don't impact clock accuracy
- Check for memory leaks during long sessions

## Automated Testing Commands

### Development Testing Script
```bash
# Install dependencies
npm install

# Run tests
npm test

# Build verification
npm run build

# Start development server
npm start
```

### MQTT Testing Commands
```bash
# Using mosquitto_pub for testing (corrected format)
TOPIC="paradox/houdini/mirror/clock/commands"
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"time": "05:00"}'
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"command": "start"}'
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"hint": "Test hint", "duration": 5}'
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"command": "fadeOut", "duration": 1000}'

# Legacy format (current implementation until PR-8):
TOPIC="Paradox/Houdini/Mirror/Clock/Commands"
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"time": "05:00"}'
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"command": "start"}'
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"hint": "Test hint", "duration": 5}'
mosquitto_pub -h localhost -p 1884 -t "$TOPIC" -m '{"command": "fadeout", "duration": 1000}'
```

## Troubleshooting

### Common Issues

#### Clock Not Updating
- Check MQTT broker connection
- Verify topic name exactly matches: `paradox/houdini/mirror/clock/commands` (corrected) or `Paradox/Houdini/Mirror/Clock/Commands` (legacy)
- Confirm JSON format is valid

#### Performance Issues
- Check browser developer console for errors
- Verify no memory leaks from intervals
- Test on target hardware/browser

#### Visual Issues
- Verify all image assets are loading
- Check CSS transforms are working
- Test on target display orientation/resolution

### Debug Information
- Open browser developer console
- Check for connection messages
- Monitor MQTT message reception
- Verify component state updates

## Acceptance Criteria Checklist

### Before Each Release
- [ ] All MQTT commands respond correctly
- [ ] Clock countdown is accurate to the second
- [ ] Fade effects work smoothly
- [ ] Hints display and hide properly
- [ ] No console errors or warnings
- [ ] Connection recovery works after network issues
- [ ] Performance is acceptable on target hardware
- [ ] Visual appearance matches design requirements

### Escape Room Validation
- [ ] Complete game scenario runs without issues
- [ ] All operator commands work reliably
- [ ] Display is readable from player positions
- [ ] Audio/visual effects don't interfere with game
- [ ] System recovers gracefully from any errors

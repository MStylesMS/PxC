# PR-8: Standardize MQTT Topic Naming and Command Formats

## Description
Updates MQTT topic naming and command formats to follow industry best practices and improve consistency across the escape room system.

## Changes Made

### Topic Naming Updates
- **Before**: `Paradox/Houdini/Mirror/Clock/Commands` (mixed case, leading slash)
- **After**: `paradox/houdini/mirror/clock/commands` (lowercase, no leading slash)

### Command Format Updates
- **Before**: `fadein`, `fadeout` (lowercase)
- **After**: `fadeIn`, `fadeOut` (camelCase)

### Code Changes

#### MQTT.js
- Updated topic subscription to use new lowercase format
- Maintained same connection logic and error handling

#### App.js  
- Updated topic subscription string
- Updated command parsing in switch statement
- Added backward compatibility support (temporary)

#### Package.json
- Updated environment variable examples
- Updated build and start script comments

### Backward Compatibility
**Temporary Support**: During transition period, the application will accept both:
- Old format: `Paradox/Houdini/Mirror/Clock/Commands` with `fadein`/`fadeout`
- New format: `paradox/houdini/mirror/clock/commands` with `fadeIn`/`fadeOut`

**Removal Plan**: Backward compatibility will be removed in a future release after all systems are updated.

## Benefits
- **Standardization**: Follows MQTT topic naming best practices
- **Consistency**: Uniform command casing across the system
- **Compatibility**: Better integration with standard MQTT tools
- **Maintainability**: Clearer, more predictable naming scheme

## Breaking Changes
⚠️ **Breaking Change**: MQTT topic names have changed

### Migration Required For:
- Control page application
- Any manual MQTT testing tools
- External monitoring systems
- Documentation and operator guides

### Migration Steps:
1. Update control page to publish to new topic: `paradox/houdini/mirror/clock/commands`
2. Update commands to use camelCase: `fadeIn`, `fadeOut`
3. Test integration between control page and clock display
4. Update operator documentation and training

## Testing Completed

### New Format Testing
- [x] Topic subscription works with `paradox/houdini/mirror/clock/commands`
- [x] Commands work with camelCase: `fadeIn`, `fadeOut`, `start`, `pause`
- [x] Time setting works: `{"time": "05:00"}`
- [x] Hint system works: `{"hint": "test", "duration": 10}`

### Backward Compatibility Testing
- [x] Old topic still works during transition
- [x] Old command formats still function
- [x] No conflicts between old and new formats

### Integration Testing
- [x] MQTT broker handles topic changes correctly
- [x] Connection stability maintained
- [x] Performance impact is negligible

## Command Examples

### New Standard Format
```bash
# Using mosquitto_pub with new format
TOPIC="paradox/houdini/mirror/clock/commands"

mosquitto_pub -h localhost -p 1883 -t "$TOPIC" -m '{"time": "10:00"}'
mosquitto_pub -h localhost -p 1883 -t "$TOPIC" -m '{"command": "start"}'
mosquitto_pub -h localhost -p 1883 -t "$TOPIC" -m '{"command": "fadeOut", "duration": 1000}'
mosquitto_pub -h localhost -p 1883 -t "$TOPIC" -m '{"hint": "New format works!", "duration": 5}'
```

## Documentation Updates
- Updated MQTT-COMMANDS.md with new format examples
- Updated TESTING.md with new test commands
- Updated DEPLOYMENT.md with new configuration examples
- Updated all issue and PR examples

## Performance Impact
- **Bundle Size**: No change
- **Runtime Performance**: No measurable impact
- **Connection**: Same stability and reliability

## Security Impact
- **Improved**: Lowercase topics reduce case-sensitivity issues
- **Maintained**: All existing security measures unchanged
- **Enhanced**: Better compatibility with security scanning tools

## Related Issues
Fixes #ISSUE-8

## Deployment Coordination Required

### Pre-Deployment Checklist
- [ ] Control page updated to use new topic/commands
- [ ] All MQTT testing tools updated
- [ ] Operator documentation updated
- [ ] Integration testing completed with control page

### Post-Deployment Tasks
- [ ] Monitor for any missed integrations
- [ ] Collect feedback from operators
- [ ] Plan removal of backward compatibility
- [ ] Update any remaining legacy references

## Review Notes
This change improves system consistency and follows MQTT best practices. The temporary backward compatibility ensures a smooth transition, but should be removed once all systems are updated.

# ISSUE-8: Standardize MQTT Topic Naming and Command Formats

## Priority: MEDIUM 🟡

## Problem
The application currently uses inconsistent MQTT topic naming and command formats that don't follow standard conventions:

### Current Issues
- **Topics**: Use mixed case with leading slash (`Paradox/Houdini/Mirror/Clock/Commands`)
- **Commands**: Use lowercase (`fadein`, `fadeout`) instead of camelCase
- **Inconsistency**: Doesn't follow MQTT best practices for topic naming

### MQTT Best Practices Violations
- Topics should be lowercase without leading slashes
- Commands should use consistent casing (camelCase preferred)
- Topic hierarchy should be logical and standardized

## Current vs. Proposed Format

### Topic Naming
```
Current:  Paradox/Houdini/Mirror/Clock/Commands
Proposed: paradox/houdini/mirror/clock/commands
```

### Command Format
```json
// Current
{"command": "fadein"}
{"command": "fadeout"}

// Proposed  
{"command": "fadeIn"}
{"command": "fadeOut"}
```

## Impact Assessment
- **Breaking Change**: Yes - requires coordination with control systems
- **User Impact**: Operators will need to update any manual MQTT tools
- **System Impact**: All MQTT publishers must update to new topic names

## Files Requiring Changes
- `src/App.js` - Update topic subscription
- `src/App.js` - Update command processing (switch statements)
- `package.json` - Update environment variable examples
- Documentation - Update all command examples
- Testing scripts - Update test commands

## Implementation Tasks
- [ ] Update MQTT topic subscription in App.js
- [ ] Update command parsing to handle camelCase
- [ ] Maintain backward compatibility during transition (if needed)
- [ ] Update environment variable examples
- [ ] Update all documentation with new formats
- [ ] Update testing scripts and examples

## Migration Strategy

### Option A: Breaking Change (Recommended)
- Update all components simultaneously
- Requires coordination with control page deployment
- Clean implementation with no legacy support

### Option B: Gradual Migration
- Support both old and new formats temporarily
- More complex implementation
- Allows gradual rollout across systems

## Acceptance Criteria
- [ ] MQTT topics use lowercase without leading slashes
- [ ] Commands use consistent camelCase format
- [ ] All functionality works with new naming
- [ ] Documentation updated with new formats
- [ ] Test scripts use new command formats
- [ ] Backward compatibility handling (if implemented)

## Testing Requirements
- Test all MQTT commands with new formats
- Verify topic subscription works correctly
- Test command parsing with camelCase
- Validate documentation examples work
- Test with actual escape room control systems

## Dependencies
- Should be coordinated with control page updates
- May need to be done in conjunction with other MQTT-using systems
- Consider timing with other refactoring efforts

## Deployment Considerations
- **Coordination Required**: Control page and other systems must update simultaneously
- **Testing Window**: Need access to full system for integration testing
- **Rollback Plan**: Ability to quickly revert if issues arise during deployment

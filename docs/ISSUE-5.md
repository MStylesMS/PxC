# ISSUE-5: Remove fbemitter Dependency

## Priority: MEDIUM 🟡

## Problem
The application uses `fbemitter` (Facebook EventEmitter) which is:
- Deprecated and no longer maintained by Facebook
- Unnecessary dependency for the current usage pattern
- Can be replaced with native browser APIs or simpler solutions

## Current Usage Analysis
In `MQTT.js`, fbemitter is used to:
- Emit MQTT messages to RxJS subscribers
- Handle topic-based message routing
- Provide EventEmitter pattern for message distribution

## Impact of Removal
- **Maintenance**: Eliminates deprecated dependency
- **Bundle Size**: Reduces application footprint
- **Security**: Removes unmaintained code from dependency chain
- **Simplification**: Uses standard patterns instead of Facebook-specific library

## Proposed Solution
Replace fbemitter with one of these approaches:

### Option 1: Native EventTarget (Recommended)
- Use browser's built-in EventTarget API
- Modern, performant, and well-supported
- No additional dependencies

### Option 2: Simple Custom Implementation
- Create minimal event system for MQTT message routing
- Tailored exactly to our needs
- Very lightweight

### Option 3: RxJS Subject (Alternative)
- Use RxJS Subject for message routing
- Leverages existing RxJS dependency
- Consistent with reactive patterns

## Implementation Tasks
- [ ] Analyze current fbemitter usage patterns
- [ ] Implement replacement event system
- [ ] Update MQTT.js to use new event handling
- [ ] Test message routing functionality
- [ ] Ensure no performance regression

## Acceptance Criteria
- [ ] fbemitter dependency completely removed
- [ ] All MQTT message routing works identically
- [ ] No functional changes or regressions
- [ ] Bundle size reduced
- [ ] Code is simpler and more maintainable

## Testing Requirements
- MQTT subscription and message handling
- Multiple topic subscription scenarios
- Message routing accuracy
- Performance testing for event handling

## Dependencies
- Should be done after PR-4 for incremental approach
- Low risk change that can be done independently

# ISSUE-1: Fix Deprecated React Lifecycle Methods

## Priority: CRITICAL 🔴

## Problem
The application currently uses `componentWillReceiveProps` in two components (`Clock.js` and `Hint.js`), which has been deprecated since React 16.3 and will be removed in future versions.

## Impact
- **Immediate**: Console warnings in development
- **Future**: Application will break when React removes these methods
- **Maintenance**: Prevents upgrading to newer React versions

## Affected Files
- `src/components/clock/Clock.js` (line 18)
- `src/components/hint/Hint.js` (line 18)

## Solution
Replace `componentWillReceiveProps` with modern React patterns:
- Use `componentDidUpdate` for side effects
- Use `getDerivedStateFromProps` for state updates based on props
- Ensure proper comparison logic to prevent infinite loops

## Acceptance Criteria
- [ ] Remove all usage of `componentWillReceiveProps`
- [ ] Maintain identical functionality for clock time updates
- [ ] Maintain identical functionality for hint display
- [ ] No console warnings about deprecated lifecycle methods
- [ ] All existing functionality works as before

## Testing Requirements
- Test clock time setting via MQTT
- Test clock start/pause functionality
- Test hint display and auto-hide
- Test fade in/out animations

## Dependencies
None - this can be done independently

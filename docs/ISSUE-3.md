# ISSUE-3: Replace Custom MQTT Library with Industry Standard

## Priority: HIGH 🟠

## Problem
The application uses a custom GitHub fork of paho-mqtt that is:
- Unmaintained and potentially insecure
- Not published to npm registry
- Missing TypeScript support
- Potentially incompatible with modern bundlers

## Impact
- **Security**: Unknown vulnerabilities in unmaintained code
- **Reliability**: Could break with Node.js updates
- **Maintenance**: No support or updates available
- **Development**: Poor IDE support and debugging

## Current Implementation
```javascript
import {Client} from "paho-mqtt";
// Uses: https://github.com/AngelKyriako/paho.mqtt.javascript.git#master
```

## Proposed Solution
Replace with `mqtt.js` - the industry-standard MQTT client:
- Well-maintained with regular updates
- Excellent browser support
- TypeScript definitions available
- Better API design
- Smaller bundle size

## Migration Tasks
- [ ] Replace paho-mqtt import with mqtt.js
- [ ] Update MQTT connection code
- [ ] Adapt message handling to mqtt.js API
- [ ] Update subscription/publish methods
- [ ] Ensure WebSocket compatibility for browser use
- [ ] Test connection reliability

## API Changes Required
- Connection setup: Different client initialization
- Message handling: Different event callback structure
- Error handling: Updated error event patterns

## Acceptance Criteria
- [ ] Remove paho-mqtt dependency completely
- [ ] MQTT connection works with same broker settings
- [ ] All MQTT commands function identically
- [ ] Connection resilience maintained or improved
- [ ] No functional regressions

## Testing Requirements
- MQTT broker connection establishment
- Command reception and processing (start, pause, fadeIn, fadeOut, time, hint)
- Connection loss and reconnection
- Message parsing and handling
- Real-world escape room scenario testing

## Dependencies
- Should be done after PR-2 (React upgrade) for stability

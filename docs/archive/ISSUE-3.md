# ISSUE-3: Replace Custom MQTT Library with Industry Standard

## Priority: HIGH 🟠

## Problem
The application uses a custom GitHub fork of paho-mqtt that is:
- Unmaintained and potentially insecure
- Not published to npm registry
- Missing TypeScript support
- Potentially incompatible with modern bundlers

## Impact
- Security, reliability, maintenance, and development concerns

## Proposed Solution
Replace with `mqtt.js` - the industry-standard MQTT client.

## Migration Tasks
- Replace paho-mqtt import with mqtt.js, update connection code, adapt message handling, update sub/pub methods, ensure WS compatibility, test reliability

## Acceptance Criteria
- Remove paho-mqtt, maintain functionality, improve resilience, no regressions

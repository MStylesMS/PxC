# PR: Add `getState` Command & Boolean `visible` Flag to Houdini Clock

## Summary
Enhance the Houdini Clock application to support a `{"command":"getState"}` request that triggers an immediate state publish including a new boolean `visible` field. The UI (separate PR) will consume this authoritative flag (instead of inferring from fade commands). The flag semantics:

* `visible: true` ONLY after a fade in completes (clock fully shown)
* `visible: false` is set immediately when a fade out begins (clock begins hiding)

This ensures operators never see `visible: true` while the clock is mid‑fade and not fully readable.

## Motivation
Current limitations:
- Control UI infers visibility from fade commands instead of authoritative state.
- No on-demand mechanism to force a fresh state snapshot (e.g., after reconnect or late join).
- Visibility semantics implicit in CSS/DOM fade logic—not exported.

Benefits:
- Deterministic operator experience (can query clock instantly).
- Simplified integration: a single predicate (visibility > 50) rather than multiple event sequences.
- Future extensibility: allow more fields (e.g., theme, mode, network health) in state response.

## Scope (MVP)
1. Recognize incoming `{"command":"getState"}` on the clock's commands topic.
2. Publish to `<clockBaseTopic>/state` a JSON payload including at minimum:
  - `state`: existing run status (e.g., `running`, `paused`)
  - `time`: current formatted time (already present)
  - `visible`: boolean (authoritative flag; see semantics above)
  - (Retain other existing fields like `kiosk` if already provided)
3. Introduce internal `visible` tracking updated when fade transitions occur.
4. Ensure existing `fadeIn` / `fadeOut` commands set `visible` at the correct moments (no gradual intermediate reporting in MVP).
5. Backward compatibility: existing consumers ignoring `visibility` remain unaffected.

## Non-Goals (This PR)
- Changing fade animation implementation specifics (e.g., easing curve) beyond necessary visibility reporting.
- Introducing partial opacity granularity for other UI elements.
- Adding persistence across restarts (visibility resets to 0 or inferred from current DOM on start).

## Design Details
### Command Handling
- Extend existing command switch to include `getState`.
- On receipt, call `publishState({ reason: 'manual' })`.

### `visible` Tracking
MVP Behavior:
* When a `fadeIn` (case-insensitive) command is received: start fade animation; set `visible = true` only AFTER the fade completes (or immediately if no animation is applied).
* When a `fadeOut` command is received: set `visible = false` immediately (at start of fade) and then run the fade animation.

Rationale: We only claim the clock is fully visible when users see its final, fully opaque state. During fade out the content is already degrading, so we drop to `false` early.

Potential Enhancement (deferred): Introduce a secondary field like `fading: 'in' | 'out' | null` if mid-transition visibility states ever matter. Not required now.

### State Publish Schema (Example)
```json
{
  "state": "running",
  "time": "23:14",
  "kiosk": true,
  "visible": true,
  "t": 1759074897094
}
```
Add a timestamp field `t` if not already present.

### Topics
- Commands: `<clockBaseTopic>/commands` (already used; receives `getState`).
- State: `<clockBaseTopic>/state` (existing; add `visible`).

### Edge Cases
Case | Behavior
-----|---------
`getState` during fadeIn animation | Return `visible: false` until fade fully completes.
`getState` during fadeOut animation | Return `visible: false` (set at fade start).
Clock just started (no fade yet) | If initial `shown` flag true, treat as already fully visible; else false.
Invalid command payload | Ignore with warning log.

## Test Plan
Scenario | Steps | Expected
-------- | ----- | --------
Baseline getState | Send `getState` | Immediate state payload with `visible` boolean present.
Fade in sequence | Issue `fadeIn` (duration N) then query mid-fade | `visible:false` until animation completes; post-completion publish shows `visible:true`.
Fade out sequence | Issue `fadeOut` | State publish (either immediate or next) reflects `visible:false` immediately.
Rapid query spam | Send 5 `getState` quickly | Each returns current `visible` without throttling issues (optional rate-limit can be added).
Startup default hidden | Start app with default hidden | `visible:false` until first fadeIn completes (or explicit show command sets it).
Startup default shown | Start app with `shown:true` | First state shows `visible:true`.

## Logging
Add concise log lines:
- `Received command getState` (debug/info level)
- `Publishing state visible=true reason=manual` (debug)

## Risks & Mitigations
Risk | Mitigation
---- | ----------
High-frequency getState spamming | (Optional) Rate-limit via simple timestamp check (e.g., min interval 250ms).
Out-of-sync DOM vs internal value | Optionally sample computed opacity on publish (future enhancement).
Missing completion publish after fadeIn | Ensure fadeIn completion handler always invokes a state publish (add try/finally around animation callback).

## Rollback
Revert commit; no schema incompatibility (extra field is additive). UI PR will treat missing `visibility` as 0 for backward compatibility.

## Follow-Up Enhancements (Post-PR)
- Report additional metrics: `fps`, `droppedFrames`, `desyncMs`.
- Support `setVisibility` command to jump to arbitrary %.
- Provide `focus` echo for redundancy if UI ever consumes directly.

## Acceptance Criteria
- `visible` boolean included in every state publish.
- getState command yields immediate publish without affecting animation state.
- FadeIn sets `visible:true` only after completion; FadeOut sets `visible:false` at start.

---
Prepared for implementation pending review.

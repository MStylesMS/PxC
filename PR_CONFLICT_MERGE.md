# PxC Merge Conflict Analysis: GitHub ↔ GitLab

## Summary

The `master` branches on GitHub and GitLab diverged after commit `ad6c75a` (Mar 31 merge). Both sides did 2–3 days of active development on overlapping files. A `git merge` produces **5 conflicting files with 16 conflict hunks** — the largest being ClockShell.jsx with 11.

## Branch Topology

```
                  ┌─ 3fe2a02 feat: MQTT topic + config.json (GitHub)
                  ├─ 2dd0be1 WIP: heartbeat + ClockShell visibility (GitHub)
ad6c75a (base) ───┤  └─ 131e0b7 WIP: browser fix + assets + prebuild (GitHub)  ← HEAD
                  │
                  ├─ e987a12 Refactor code structure (GitLab)
                  ├─ b9aec43 NON-WORKING: Houdini clock fix attempt (GitLab)
                  ├─ 693438f Fix: stabilize builds, MQTT, rotation (GitLab)
                  ├─ d128df3 feat: build process + asset management (GitLab)
                  └─ f3b04b4 feat: retained schema + heartbeat (GitLab)  ← gitlab/master
```

## What Each Side Did

### GitHub (3 commits — current HEAD)

| Commit | Key Changes |
|--------|-------------|
| `3fe2a02` | Changed MQTT topic `agent22` → `houdini`, added `heartbeat_ms` to config.json, added YAML dependency |
| `2dd0be1` | Added heartbeat interval to MQTT config, rewrote ClockShell visibility/fade handling, added ClockShell tests |
| `131e0b7` | Rewrote `mqtt-client.js` connection logic (explicit host/port/path constructor, TLS support, URL parsing), added Houdini assets to `public/`, updated prebuild to sync styles, added `app-shell` wrapper for rotation |

### GitLab (5 commits)

| Commit | Key Changes |
|--------|-------------|
| `e987a12` | Refactored code structure (readability) |
| `b9aec43` | **NON-WORKING** — attempted Houdini clock fix, refactored mqtt-client.js (same connection problem GitHub later solved differently) |
| `693438f` | **Big stabilization commit**: rewrote ClockShell command handling, added postbuild.js, fixed rotation (same problem GitHub solved differently), committed build-houdini/ and build-agent22/ outputs, added tests |
| `d128df3` | Enhanced build process, revised MQTT API docs, simplified config.json |
| `f3b04b4` | Added `publishRetained()`, `_publishSchema()`, `_startHeartbeat()` to mqtt-client.js, added mqtt-discovery tests |

## Files in Conflict (both sides modified)

| File | GitHub Changes | GitLab Changes | Conflict Hunks |
|------|---------------|----------------|:-:|
| `src/utils/mqtt-client.js` | Rewrote connection (explicit host/port/path, TLS, URL parsing) | Added fallback URL logic + publishRetained/schema/heartbeat | 1 |
| `src/components/ClockShell.jsx` | Rewrote visibility/fade handling, added heartbeat config | Rewrote command handling, visibility, state publishing | **11** |
| `src/App.jsx` | Added `app-shell` wrapper div, rotation fix | Added viewport resize listener, richer rotation styles, config merge fix | 1 |
| `src/App.css` | Added `.app-shell` class, repositioned `.app-container` | Changed `.app-container` to `position: fixed`, added overflow hidden | 1 |
| `src/components/ClockShell.test.jsx` | Added visibility/heartbeat tests | Added command handling + state publishing tests | 2 |

## Files Changed Only on One Side (no conflict)

### GitLab-only (safe to keep or discard individually)

| File(s) | Notes |
|---------|-------|
| `build-agent22/`, `build-houdini/` (42 files) | **Committed build artifacts.** These should NOT be in source control. |
| `scripts/postbuild.js` | New — copies build output to room-specific dirs |
| `src/App.test.jsx` | New — App component tests |
| `src/utils/__tests__/mqtt-discovery.test.js` | New — MQTT schema/heartbeat tests |
| `docs/MQTT_API.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/CONFIG_EDITING.md` | Documentation updates |
| `src/components/clocks/AnalogClock.css` | Minor style fix |
| `README.md`, `package.json` | Version/docs updates |

### GitHub-only (safe to keep)

| File(s) | Notes |
|---------|-------|
| `public/assets/houdini/*`, `public/assets/simple-4-digit/*` | Production assets (font/image files) |
| `config/houdini.ini` | Added `heartbeat_ms` |
| `package-lock.json` | YAML dependency |
| `src/utils/ini-loader.js` | Minor update |

---

## Overlapping Work Analysis

Both sides independently attempted to fix the **same three problems**:

### 1. MQTT Connection Robustness

- **GitHub**: Rewrote with explicit `host/port/path` Paho constructor, added WebSocket URL parsing and TLS/SSL support
- **GitLab**: Added fallback URL array with retry (`tryConnect` with primary + fallback), kept URL-based constructor
- **Overlap**: Both address "connection doesn't work through Nginx proxy" but with different strategies
- **Recommendation**: **GitHub's approach is better** — explicit constructor is more debuggable and handles wss:// natively. GitLab's fallback pattern is a workaround for the same root cause.

### 2. Rotation / Quarter-Turn Layout

- **GitHub**: Added `.app-shell` wrapper, CSS `translate(-50%, -50%)` centering, `isQuarterTurn` swaps `100vh`/`100vw`
- **GitLab**: Used `position: fixed` with viewport-size-aware `containerStyle`, added resize listener
- **Overlap**: Both fix "rotated clock overflows viewport" with different CSS strategies
- **Recommendation**: **GitLab's approach is more complete** — the resize listener handles dynamic viewport changes (e.g., dev tools, orientation change), and pixel-based sizing avoids CSS unit quirks. GitHub's is simpler but misses resize.

### 3. Heartbeat / Schema Publishing

- **GitHub**: Added `heartbeat_ms` config field, basic heartbeat interval in ClockShell
- **GitLab**: Full `publishRetained()`, `_publishSchema()`, `_startHeartbeat()` in mqtt-client.js with tests
- **Overlap**: Both add heartbeat/liveness, but GitLab also adds retained schema (command discovery)
- **Recommendation**: **GitLab's approach is more complete** — schema publishing is the right place for this (MQTT client, not UI component), and retained messages are idiomatic MQTT.

---

## Decisions Required

### Decision 1: Build Artifacts

GitLab committed `build-agent22/` and `build-houdini/` (42 files of compiled JS/CSS/fonts).

- **Option A (Recommended)**: Discard these and add `build-*/` to `.gitignore`. Build outputs don't belong in source control — they're generated by `npm run build`.
- **Option B**: Keep them for deployment convenience (some Pi setups pull pre-built bundles).

### Decision 2: MQTT Connection Strategy

- **Option A (Recommended)**: Use GitHub's explicit host/port/path constructor as the base, then cherry-pick GitLab's `publishRetained()`, `_publishSchema()`, and `_startHeartbeat()` on top.
- **Option B**: Use GitLab's fallback URL array approach. *(Not recommended — it's a workaround, and the `NON-WORKING` commit in its history suggests the approach was still being debugged.)*

### Decision 3: Rotation / Layout Strategy

- **Option A (Recommended)**: Use GitLab's resize-listener approach with `containerStyle`, but adopt GitHub's `app-shell` wrapper div for cleaner separation.
- **Option B**: Use GitHub's simpler CSS-unit approach (no resize listener). Simpler but less robust.

### Decision 4: ClockShell.jsx — Primary Base

This file has **11 conflict hunks**. Both sides rewrote large sections. A line-by-line merge is impractical.

- **Option A (Recommended)**: Use GitLab's ClockShell.jsx as the base (it has richer command handling and state publishing), then apply GitHub's specific improvements: `heartbeat_ms` config support and any visibility logic not already covered.
- **Option B**: Use GitHub's ClockShell.jsx as the base and backport GitLab's command handling. *(More work — GitHub's version is less complete here.)*

### Decision 5: `config.json` Topic and Style

GitHub changed the config from `agent22/led` to `houdini/analog`. This is a deployment-specific choice, not a code decision.

- **Option A (Recommended)**: Keep GitHub's `houdini/analog` config since that reflects the current production target. The build system should generate per-room configs anyway.
- **Option B**: Revert to `agent22/led` if that room is still active.

---

## Recommended Merge Strategy

**Do NOT use `git merge`.** The 11-hunk ClockShell conflict makes automated merge unworkable. Instead:

### Step-by-step Plan

1. **Create a branch** `merge/github-gitlab-reconcile` from `origin/master` (GitHub HEAD)
2. **Discard build artifacts**: Add `build-*/` to `.gitignore`
3. **Cherry-pick non-conflicting GitLab additions**:
   - `scripts/postbuild.js`
   - `src/App.test.jsx`
   - `src/utils/__tests__/mqtt-discovery.test.js`
   - Doc updates (`docs/MQTT_API.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/CONFIG_EDITING.md`)
   - `src/components/clocks/AnalogClock.css` fix
4. **Manual reconciliation** (the real work):
   - `mqtt-client.js`: Start from GitHub's connection rewrite, add GitLab's `publishRetained()`, `_publishSchema()`, `_startHeartbeat()`, and `_stopHeartbeat()`
   - `ClockShell.jsx`: Start from GitLab's version, integrate GitHub's heartbeat config + any missing visibility features
   - `App.jsx`: Combine GitLab's resize listener with GitHub's `app-shell` wrapper
   - `App.css`: Merge both overflow/positioning fixes
   - `ClockShell.test.jsx`: Combine test suites from both sides
5. **Run tests**: `npm test` to validate
6. **Build**: `npm run build` for houdini config to verify
7. **Push to both remotes**

---

## Model Recommendation

| Phase | Complexity | Recommended Model | Rationale |
|-------|-----------|-------------------|-----------|
| Steps 1–3 (branch, gitignore, cherry-picks) | Low | **Sonnet 4.6 (1x)** | Mechanical git operations, no judgment needed |
| Step 4 (manual reconciliation) | **High** | **Opus 4.6 (3x)** | 5 files with competing architectural decisions, needs to understand both approaches and synthesize the best parts. ClockShell alone is 700+ lines with 11 conflict zones. Getting this wrong means a broken clock. |
| Steps 5–7 (test, build, push) | Low | **Sonnet 4.6 (1x)** | Running commands and fixing lint/test errors |

**Overall recommendation: Use Opus 4.6 for the full job.** While steps 1–3 and 5–7 are simple, the context needed to do step 4 correctly (understanding both codebases' approach to MQTT, rotation, and ClockShell state management) means switching models mid-task would require re-establishing all context. The cost of Opus doing the simple steps is negligible compared to the risk of a cheaper model mishandling the reconciliation.

Estimated scope: ~5 files to hand-merge, ~1500 lines of code to reconcile, 1 test suite to validate.

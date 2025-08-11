# Open Issues

## ISSUE: Refactor and re-enable performance tests

Context:
- The current performance test suite is heavy and flaky under jsdom. It was temporarily skipped to stabilize CI.

Goals:
- Rework or relocate the performance tests so they run reliably.

Acceptance criteria:
- No skipped tests in CI related to performance.
- Performance checks either run in a real browser (Playwright) or are converted into fast, deterministic unit/benchmark checks.
- CI time impact is acceptable (< 1–2 minutes extra).

Proposed approach:
- Option A: Move perf checks to Playwright with a headless Chromium run, measure frame/tick durations using the browser Performance API.
- Option B: Extract hot-path calculations (hand rotations, tick logic) into pure functions and add micro-benchmarks with a threshold (e.g., benchmark.js or custom harness) executed behind a CI flag.
- Option C: Keep jsdom but stub timers/animation frames and assert only on counts and scheduling, not wall-clock timings.

Tasks:
- Audit existing performance.test.js and list assertions that depend on real time/raf.
- Decide on A/B/C per assertion and implement accordingly.
- Wire into npm scripts and CI; remove the `describe.skip`.
- Document how to run locally.

Notes:
- Prioritize determinism over absolute timing numbers.
- Consider nightly/per-branch perf jobs if needed.

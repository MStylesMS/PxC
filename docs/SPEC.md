# Paradox Clock (PxC) — High-level SPEC

This document is a high-level plan for Paradox Clock (PxC). It describes goals, architecture, configuration approach, extension points for multiple clock types, and a short list of questions for the maintainer to answer before we fill in implementation details.

## Goals

- Provide a small, well-structured React application that can render different clock types (analog, LED/countdown, flip, hourglass, etc.).
- Support configuration-driven customization via `.ini` files so non-developers can author variants (images, colors, rotation origin, starting offsets, display mode).
- Keep the original Houdini Clock content available for reference in `/archive` but start PxC as a clean, generic implementation.
- Be easy to extend with new clock renderers and assets.

## High-level architecture

- Top-level app shell (ClockShell)
  - Loads configuration (from local `.ini`, runtime config, or embedded defaults).
  - Chooses a clock renderer component based on config `clock.type`.
  - Provides common services (asset loader, sizing/layout, time source, optional MQTT/time-sync hooks).

- Clock renderers (plugin-style components)
  - `LedClock` — 4-digit 7-segment LED style (initial implementation requested).
  - `AnalogClock` — minute/second hands (inspiration from Houdini Clock).
  - `FlipClock`, `Hourglass` — stubs for future work.

- Utilities
  - `ini-loader` — parses `.ini` into a JS object with validation and defaults.
  - `asset-loader` — maps asset names/relative paths to public URLs and provides fallbacks.
  - `time-service` — provides time values (local ticking, countdown source, or synchronized source).

## On-disk layout (first pass)

- `/src` — React source
  - `/components` — shared components
    - `/clocks` — individual clock renderers (LedClock.jsx, AnalogClock.jsx, ...)
    - `ClockShell.jsx` — orchestrates config -> renderer
    - `ConfigEditor.jsx` — optional UI to edit `.ini` and preview
  - `/utils` — `ini-loader.js`, `asset-loader.js`, `time-service.js`
- `/config` — example `.ini` files for authors
- `/public/assets` — images/fonts for clocks
- `/docs` — design docs and authoring guidelines (this file lives here)

## Configuration model (.ini)

Use a familiar INI structure. Example mapping:

[clock]
type = led            ; led | analog | flip | hourglass
mode = countdown      ; countdown | clock
digits = 4
start = 00:05         ; for countdown

[assets]
background = assets/bg.png
led_segment = assets/led_segment.svg

[led]
color_on = #ffcc00
color_off = #222222
segment_width = 18

The `ini-loader` will validate keys per `clock.type` and provide clear errors for missing assets or invalid values.

## Extension points

- Add a new clock renderer under `/src/components/clocks`. It should accept a typed props object and register itself with the shell (or be referenced by a factory mapping in `ClockShell`).
- Asset references in `.ini` should be relative to `/public/assets` and validated at build/runtime.

## Build, test, and deployment

- Keep the existing React build (npm/yarn). Provide scripts:
  - `npm run start` — dev server
  - `npm run build` — production build
  - `npm run test` — unit tests for utils and renderers

## Initial implementation workstream

1. Move older Houdini Clock content into `/archive` (done).
2. Implement `LedClock` (4-digit 7-segment) and a minimal `ClockShell` that can load an example `.ini` and render the LED clock.
3. Add `ini-loader` utility and example config files under `/config/examples`.
4. Run builds and add CI to validate (lint, build, test).

## Open questions (please answer to guide the next pass)

1. Preferred default display modes: should `PxC` focus on `countdown` only, or support both `countdown` and real-time clocks from the start?
2. How do you want to manage assets for different clock types? (store in `/public/assets/<clock-name>/` or a single shared assets folder?)
3. Should the `.ini` editor be built into the app (web UI) or as a separate CLI/editor tool?
4. Do you prefer SSH or HTTPS remotes for GitHub pushes? (I created the GitHub remote as HTTPS — I can switch to SSH if you prefer.)
5. Which browser/device types are primary (kiosk displays, browsers on desktops, mobile)? This affects responsive layout choices.

---

This is a first-pass spec. Once you answer the open questions I will expand this document with concrete data shapes, component contracts, example `.ini` files, and a minimal test plan.

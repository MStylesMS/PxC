# Paradox Clock (PxC) — High-level SPEC

This document is a high-level plan for Paradox Clock (PxC). It describes goals, architecture, configuration approach, extension points for multiple clock types, and a short list of questions for the maintainer to answer before we fill in implementation details.

## Goals

- Provide a small, well-structured React application that can render different clock types (analog, LED/countdown, flip, hourglass, etc.). PxC will focus primarily on configurable countdown displays but should also support real-time clock and stopwatch modes.
- Support configuration-driven customization via `.ini` files so authors can create variants (images, colors, rotation origin, starting offsets, display mode, and asset selections such as multiple backgrounds, hands, digit sets, and fonts).
- Keep the original Houdini Clock content available for reference in `/archive` but start PxC as a clean, generic implementation. Houdini-derived styles will be one of many selectable clock styles.
- Be easy to extend with new clock renderers and assets and to add multiple named styles (see naming convention below).

## High-level architecture

- Top-level app shell (ClockShell)
  - Loads configuration (from local `.ini`, runtime config, or embedded defaults).
  - Chooses a clock renderer component based on config `clock.type`.
  - Provides common services (asset loader, sizing/layout, time source, optional MQTT/time-sync hooks).

- Clock renderers (plugin-style components)
  - `LedClock` — 4-digit 7-segment LED style (initial implementation requested).
  - `AnalogClock` — minute/second hands (inspiration from Houdini Clock).
  - `FlipClock`, `Hourglass` — stubs for future work.

Naming convention for styles

- Each clock style will have a stable, descriptive name used in `.ini` files and the UI. Example names:
  - `antique-analog-oval-portrait` (the Houdini-style analog clock)
  - `simple-4digit-landscape` (the first LED/countdown style we'll implement)

Each style may provide multiple selectable assets (backgrounds, hands, digit graphics, fonts). The `.ini` for a style will pick which assets to use.

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
- `/assets` — images/fonts for clocks (organized by style, e.g. `/assets/houdini`)
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

Editing workflow

- For the initial phase we'll edit `.ini` files manually. There will be example `.ini` files under `/config/examples` that document the available keys and sample asset choices. Building a web-based or GUI `.ini` editor is a future enhancement.

## Extension points

- Add a new clock renderer under `/src/components/clocks`. It should accept a typed props object and register itself with the shell (or be referenced by a factory mapping in `ClockShell`).
- Asset references in `.ini` should be relative to `/public/assets` and validated at build/runtime.

## Build, test, and deployment

- Keep the existing React build (npm/yarn). Provide scripts:
  - `npm run start` — dev server
  - `npm run build` — production build
  - `npm run test` — unit tests for utils and renderers

Git remotes

- The repository currently has a GitHub remote created with `gh` using HTTPS. You prefer SSH for GitHub pushes; we can switch `origin` to an SSH URL later — I'll do that only if you confirm you'd like SSH remotes, since the current HTTPS origin is working and `gh` created the repo.

## Initial implementation workstream

1. Move older Houdini Clock content into `/archive` (done).
2. Implement `LedClock` (4-digit 7-segment) and a minimal `ClockShell` that can load an example `.ini` and render the LED clock.
3. Add `ini-loader` utility and example config files under `/config/examples`.
4. Run builds and add CI to validate (lint, build, test).

## Open questions (please answer to guide the next pass)

The clarifications below have been recorded and incorporated into the spec. They resolve the initial open questions:

1. PxC will focus on configurable countdown displays, but must also support realtime clock and stopwatch modes.
2. Each style will have its own `<clock-name>` namespace (e.g. `antique-analog-oval-portrait`, `simple-4digit-landscape`). Each style may expose multiple backgrounds, hands, digit sets, and fonts; the `.ini` will select the desired assets.
3. For now, `.ini` files will be edited manually. We'll provide examples and documentation under `/config/examples` and `/docs` to guide authors.
4. You prefer SSH for GitHub pushes. I will switch the `origin` remote to SSH only if you ask me to (it's currently set to HTTPS and working).
5. Primary targets are full-screen standard displays (kiosk/large screens) in both landscape and portrait. The renderers should support rotations of 0, 90, 180 and 270 degrees (equivalently -90).

---

This is a first-pass spec. Once you answer the open questions I will expand this document with concrete data shapes, component contracts, example `.ini` files, and a minimal test plan.

## INI settings reference

Below is a canonical reference for the `.ini` settings that PxC will support. The first table lists the common sections/keys that apply to most clock styles. After that are per-style tables with settings specific to that renderer.

Common sections

| Section | Key | Type | Description |
|---|---:|---|---|
| [mqtt] | (see `config/clock.ini`) | section | MQTT/telemetry settings (hostname, port, topics, auth). These are the same settings used by the original Houdini Clock and reused here. |
| [display] | orientation | int (0,90,180,270) | Rotation to apply to the entire display. |
| [display] | fade_duration_ms | int | Fade animation duration in milliseconds when switching states. |
| [type] | style | string | Clock style identifier (e.g. `antique-analog-oval-portrait`, `simple-4digit-landscape`). |
| [type] | mode | string | mode for this clock instance: `countdown`, `clock`, or `stopwatch`. |

Notes: Many other keys are per-style and appear under section names that match the style (for example `[analog]`, `[led4]`, `[flip]`, `[font]`, `[graphic]`). Keys that reference assets should be paths relative to `/assets/<style>/` or absolute URLs.

Analog style (`[analog]`)

| Key | Type | Description |
|---|---:|---|
| background | path | Path to background image. |
| minute_hand.path | path | Image for minute hand. |
| minute_hand.origin_x | float | X (px or %) center of rotation within the image. |
| minute_hand.origin_y | float | Y center of rotation. |
| minute_hand.zero_rotation | float | Degrees for the zero (reference) rotation. |
| minute_hand.direction | enum | `cw` or `ccw`. |
| minute_hand.start_angle | float | Optional clamp/start angle. |
| minute_hand.stop_angle | float | Optional clamp/stop angle. |
| second_hand.* | ... | Same keys as minute_hand for the seconds hand. |
| hint.x | int | Hint box top-left X. |
| hint.y | int | Hint box top-left Y. |
| hint.width | int | Hint box width. |
| hint.height | int | Hint box height. |
| hint.halign | enum | horizontal justification: `left`,`center`,`right`. |
| hint.valign | enum | vertical justification: `top`,`middle`,`bottom`. |
| hint.font.family | string | Font family for hint text. |
| hint.font.size | int | Font size in px. |
| hint.font.style | string | CSS font-style/weight. |
| hint.font.color | hex | Text color. |
| hint.font.alpha | float | Opacity (0.0 - 1.0). |

Font style (`[font]`) — simple text-based clock

| Key | Type | Description |
|---|---:|---|
| background | path | Path to background image. |
| digits.x | int | Top-left X of the text box for digits. |
| digits.y | int | Top-left Y of the text box for digits. |
| digits.width | int | Width of the text box. |
| digits.height | int | Height of the text box. |
| digits.halign | enum | `left`,`center`,`right`. |
| digits.valign | enum | `top`,`middle`,`bottom`. |
| digits.font.* | ... | Font family/size/style/color/alpha as per hint font above. |
| hint.* | ... | Same hint box keys as analog. |

4-digit style (`[led4]`) — image based digital clock

| Key | Type | Description |
|---|---:|---|
| background | path | Path to background image. |
| digits.dir | path | Directory containing digit images (0-9). Can include GIFs for animated digits. |
| digits.bg_transparent | bool | Whether digit image backgrounds are considered transparent. |
| digit[0-3].x | int | Top-left X for digit N (0..3). |
| digit[0-3].y | int | Top-left Y for digit N. |
| digit[0-3].width | int | Width for digit N. |
| digit[0-3].height | int | Height for digit N. |
| digit[0-3].halign | enum | `left`,`center`,`right`. |
| digit[0-3].valign | enum | `top`,`middle`,`bottom`. |
| hint.* | ... | Same hint box keys as analog.

Flip style (`[flip]`) — image based split-flip digits

| Key | Type | Description |
|---|---:|---|
| background | path | Path to background image. |
| digits.dir | path | Directory containing digit images (0-9). |
| flip.style | enum | `one-piece` or `two-piece`. |
| flip.direction | enum | `left`,`right`,`up`,`down`. |
| digit[0-3].* | ... | Digit location keys identical to `[led4]` for each digit. |
| hint.* | ... | Same hint box keys as analog.

Graphic/video style (`[graphic]`) — video/timeline-driven frames

| Key | Type | Description |
|---|---:|---|
| background | path | Static background (optional). |
| video.path | path | Path to video file. |
| video.frame_map | string | Mapping method: frame-per-second or timestamp mapping; implementation-specific. |
| video.digit[0-3].x | int | Top-left X for video frame region that supplies digit N. |
| video.digit[0-3].y | int | Top-left Y for region. |
| video.digit[0-3].width | int | Width of region. |
| video.digit[0-3].height | int | Height of region. |
| hint.* | ... | Same hint box keys as analog.

Example usage

An example `config/examples/simple-4digit-landscape.ini` will demonstrate the `[display]`, `[type]`, `[led4]` and `[mqtt]` sections with concrete file paths and values.


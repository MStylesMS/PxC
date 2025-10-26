# Paradox Clock (PxC) — Architecture

This document describes the architecture of the Paradox Clock (PxC) repository. PxC is a **framework for creating optimized, configuration-driven clock applications** rather than a single monolithic app. Each clock variant (Houdini-style analog, LED countdown, flip clock, etc.) is defined by a `.ini` configuration file and built into a standalone, production-ready React application.

## Core concept: configuration-driven builds

PxC is designed around the principle of **build-time optimization**. Instead of shipping a generic clock app that reads config at runtime, PxC:

1. Authors create or edit a `.ini` file (e.g., `config/houdini.ini`) that specifies the clock style, assets, layout, MQTT settings, and display options.
2. The build process reads the `.ini` and **bakes the configuration into the compiled React app** at build time.
3. The result is a lean, optimized bundle that contains only the renderer and assets needed for that specific clock variant.

This approach ensures:
- **Fast startup and rendering** — no runtime config parsing overhead.
- **Small bundle size** — only the selected clock renderer and its assets are included.
- **Static deployment** — the built app can be served from any static host or embedded in a kiosk without external dependencies.

## Repository structure

```
/opt/paradox/apps/PxC/
├── archive/                      # Original Houdini Clock code (reference only)
├── assets/                       # Clock assets organized by style
│   └── houdini/                  # Houdini analog clock assets
│       ├── bg.png
│       ├── minute_hand_sm.png
│       ├── seconds_hand_sm.png
│       └── alger.ttf
├── config/                       # Configuration files (.ini)
│   └── houdini.ini               # Example: Houdini analog clock config
├── docs/                         # Documentation
│   ├── SPEC.md                   # High-level spec and INI reference
│   └── ARCHITECTURE.md           # This file
├── src/                          # React source (to be created)
│   ├── components/
│   │   ├── clocks/               # Clock renderer plugins
│   │   │   ├── AnalogClock.jsx
│   │   │   ├── LedClock.jsx
│   │   │   └── ...future styles
│   │   └── ClockShell.jsx        # Main orchestrator component
│   ├── utils/
│   │   ├── ini-loader.js         # Parse .ini at build time
│   │   ├── asset-loader.js       # Resolve asset paths
│   │   └── time-service.js       # Time/countdown logic
│   └── index.jsx                 # Entry point
├── package.json                  # Dependencies and build scripts
└── README.md                     # Quick-start guide
```

## Build workflow

### 1. Configuration authoring

An author creates or edits a `.ini` file in `/config`. For example, `config/houdini.ini` defines:

- Clock style: `antique-analog-oval-portrait`
- Mode: `countdown` (or `clock`, `stopwatch`)
- Asset paths: background, minute hand, second hand, hint font
- Display settings: orientation, fade duration
- MQTT settings: host, port, topic

See `docs/SPEC.md` for the full `.ini` schema.

### 2. Build-time processing

When running `npm run build`:

1. **Configuration loading**: A build-time script (e.g., `scripts/build-config.js` or webpack plugin) reads the target `.ini` file (specified via environment variable or default).
2. **Renderer selection**: Based on the `[type] style` key, the build includes only the required clock renderer component (e.g., `AnalogClock.jsx` for the Houdini style).
3. **Asset bundling**: Only the assets referenced in the `.ini` are bundled (tree-shaking and dead code elimination remove unused files).
4. **Config injection**: The parsed `.ini` is serialized as a JSON object and injected into the app at build time (via `process.env` or a generated `config.json` module).

### 3. Runtime behavior

The built app:

- Loads with the baked configuration already in memory.
- Renders the selected clock style using the pre-configured assets and layout.
- Connects to MQTT (if configured) for remote control (start/stop/hints).
- Supports full-screen display with configurable rotation (0°, 90°, 180°, 270°).

### 4. Deployment

The output of `npm run build` is a static bundle (HTML, JS, CSS, images) that can be:

- Served from a web server (nginx, Apache, etc.)
- Deployed to a CDN or static host (GitHub Pages, Netlify, S3)
- Embedded in a kiosk or Electron app for offline use

Each `.ini` configuration can produce a separate build, allowing multiple clock variants to coexist as independent deployments.

## Extension points

### Adding a new clock style

To add a new style (e.g., `flip-clock`):

1. Create assets under `/assets/flip-clock/` (images, fonts, etc.).
2. Write a new renderer component: `src/components/clocks/FlipClock.jsx`.
3. Register the renderer in `ClockShell.jsx` or use a factory pattern that maps `[type] style` to component imports.
4. Extend the `.ini` schema in `docs/SPEC.md` with a `[flip]` section defining flip-specific keys.
5. Create an example config: `config/flip-clock.ini`.
6. Build with `CLOCK_CONFIG=config/flip-clock.ini npm run build`.

The build system will automatically include only the `FlipClock` component and its assets.

### Adding new features

- **Time sources**: Extend `time-service.js` to support external time sync, NTP, or custom countdown logic.
- **Animations**: Add CSS transitions or animation libraries; the build will tree-shake unused animation code.
- **MQTT commands**: Extend the MQTT listener in `ClockShell` to handle new commands (e.g., theme switching, brightness control).

## Design principles

### 1. Separation of concerns

- **Configuration** (`.ini` files) is separate from **code** (React components).
- Authors with no coding experience can create new clock variants by editing `.ini` files and swapping assets.
- Developers extend the framework by adding new renderers without modifying existing ones.

### 2. Build-time optimization

- Runtime overhead is minimized by baking configuration at build time.
- The app does not need to parse `.ini` files or dynamically load assets on startup.
- Dead code and unused assets are eliminated during the build.

### 3. Pluggable renderers

- Each clock style is an independent React component that adheres to a common interface (receives config props and time/state).
- New styles can be added without refactoring the core `ClockShell` or build system.

### 4. Static deployment

- The built app is a self-contained static bundle with no server-side dependencies.
- MQTT is optional; clocks can run standalone in countdown/clock/stopwatch mode without external services.

## Future enhancements

- **Web-based config editor**: A GUI tool for editing `.ini` files and previewing changes in real time.
- **Multi-config builds**: A CI pipeline that builds all `.ini` files in `/config` and publishes them as separate artifacts.
- **Asset library**: A shared repository of clock assets (hands, backgrounds, fonts) that authors can reference.
- **Plugin marketplace**: Allow third-party developers to publish custom renderers and asset packs.

## Summary

PxC is not a single application—it is a **framework and build system** for creating optimized, configuration-driven clock applications. Each `.ini` file defines a unique clock variant, and the build process produces a lean, production-ready app tailored to that configuration. This architecture enables rapid authoring of new clock styles while maintaining performance and minimizing bundle size.

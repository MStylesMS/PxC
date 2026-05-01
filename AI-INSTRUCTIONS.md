# Paradox Clock (PxC) — AI Instructions

PxC is a **framework for creating optimized, configuration-driven clock applications**. It reads `.ini` configuration files and generates lean, production-ready React apps for countdown, real-time clock, and stopwatch displays.

**Repository**: [GitHub (MStylesMS/PxC)](https://github.com/MStylesMS/PxC)

## Tech Stack

- **Framework**: React with build-time optimization
- **Config**: INI format (each `.ini` produces a separate clock app)
- **Communication**: MQTT (optional, for remote control)
- **Deployment**: Static web bundles served in Chromium kiosk mode

## Architecture Summary

PxC is a **build system and component framework**, not a single clock app. Each INI config defines a clock variant (style, assets, MQTT settings, rotation). The build system reads the config, generates an optimized React app with only the needed renderers and assets, and outputs a static bundle. Styles include analog (rotating hands), LED/digit, flip clock, and video/graphic-based.

## Paradox Family

PxC is one of seven Paradox products. A built PxC clock is typically driven by PxO via MQTT and rendered in a PFx-managed browser/kiosk surface.

- **PFx** — media/audio/lights/relays controller
- **PxO** — game orchestration engine (primary MQTT command source)
- **PxC** — this project (clock app framework)
- **PxT** — player terminal kiosk
- **Pio** — GPIO-to-MQTT bridge (C++)
- **PxB** — Z-Wave / Zigbee / Thread to MQTT bridge (Node.js)
- Rooms: `agent22`, `houdinis-challenge`

## Critical Constraints

- **Configuration-driven**: non-developers create new clock variants by editing INI files, not code
- **Build-time optimization**: config is baked into the build for fast startup
- **MQTT topic structure**: `{baseTopic}/{commands|events|state|warnings}` (same as all Paradox components)
- **Performance-first rendering**: use `React.memo`, `useMemo`, `useCallback` in all components
- **Pluggable renderer architecture**: new clock styles must work without modifying core

## Documentation-First Development

**Core principle: Documentation is the contract. Code is the implementation.**

Before significant changes, review SPEC.md, ARCHITECTURE.md, and MQTT_API.md. If a change conflicts with documented design, propose doc updates first and get approval. Update docs alongside code. See [docs/AI-DEVELOPMENT-WORKFLOW.md](docs/AI-DEVELOPMENT-WORKFLOW.md) for the full PxC-specific development workflow including experimental code handling and PR proposal process.

Use commit prefixes: `Docs:`, `Implement:`, `Fix:`, `Test:`, `Refactor:`, `Chore:`, `Learn:`.

## Key References

| Document | Purpose |
|----------|---------|
| [AI-DETAILED-OVERVIEW.md](AI-DETAILED-OVERVIEW.md) | Full architecture, build system, development workflows |
| [docs/AI-DEVELOPMENT-WORKFLOW.md](docs/AI-DEVELOPMENT-WORKFLOW.md) | PxC-specific documentation-first workflow details |
| [docs/SPEC.md](docs/SPEC.md) | Feature specification, INI schema, clock styles |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Framework design, build system, extension points |
| [docs/MQTT_API.md](docs/MQTT_API.md) | MQTT interface and commands |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy and guidelines |
| [README.md](README.md) | User-facing overview, quick start, clock styles |
| Parent system: [/opt/paradox/AI-INSTRUCTIONS.md](/opt/paradox/AI-INSTRUCTIONS.md) | System-wide context (when in Paradox workspace) |

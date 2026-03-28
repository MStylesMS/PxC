# Paradox Clock (PxC) — AI Detailed Overview

This document provides comprehensive guidance for AI coding agents working on PxC. For a quick-start summary, see [AI-INSTRUCTIONS.md](AI-INSTRUCTIONS.md).

## System Overview

PxC is a build system and component framework that generates optimized React clock applications from INI configuration files. Each configuration produces a separate, self-contained static web app deployable to any web server or kiosk.

**Build output**: `/build` or `/dist` directory (static bundle)
**Deployment**: Served via Chromium kiosk mode or any static web server
**Primary use**: Countdown timers in escape rooms, controlled via MQTT

## Architecture

### Build-Time Configuration

Unlike runtime-configured apps, PxC bakes configuration at build time:
1. Read INI config from `/config/*.ini`
2. Select only needed renderers and assets
3. Generate optimized React app with config inlined
4. Output static bundle to `/build`

This means: configuration changes require a rebuild, but startup is instant and bundle size is minimal.

### Clock Styles

| Style | Description |
|-------|-------------|
| `antique-analog-oval-portrait` | Rotating minute/second hands on custom background (Houdini) |
| `simple-4digit-landscape` | LED-style 4-digit countdown (planned) |

New styles are added as pluggable renderers in `src/components/clocks/`.

### INI Configuration Schema

```ini
[clock]
style = antique-analog-oval-portrait
rotation = 0

[mqtt]
host = localhost
port = 1884
base_topic = paradox/houdini/clock

[assets]
background = assets/houdini/clock-face.png
minute_hand = assets/houdini/minute-hand.png
second_hand = assets/houdini/second-hand.png
```

See `docs/SPEC.md` for the complete INI schema reference.

### MQTT Integration

PxC optionally connects to MQTT for remote control:

**Inbound commands** (`{baseTopic}/commands`):
- Time control: start, stop, pause, resume, set time
- Display: show text, change mode, rotate

**Outbound state** (`{baseTopic}/state`):
- Current time, running/paused status, display mode

### Performance Requirements

All React components must follow performance-first patterns:
- `React.memo` on all components
- `useMemo` for computed values
- `useCallback` for event handlers
- Avoid unnecessary re-renders (countdown timers tick frequently)
- MQTT + RxJS for reactive state management
- Error boundaries for graceful degradation

## Development Workflows

### Creating a New Clock Style

1. Add renderer component in `src/components/clocks/NewStyle.jsx`
2. Register in the renderer registry
3. Define INI schema additions in `docs/SPEC.md`
4. Add assets to `assets/{stylename}/`
5. Create example config in `config/`
6. Test with `npm run start`
7. Verify production build: `npm run build`

### Building

```bash
npm install          # Install dependencies
npm run start        # Development mode (hot reload)
npm run build        # Production build
npm test             # Run tests
```

### Testing

See `docs/TESTING.md` for the full testing strategy. Key areas:
- Component rendering tests (React Testing Library)
- MQTT command handling
- Timer accuracy
- Build output validation

## PxC-Specific Development Workflow

PxC has a more rigorous documentation-first process than the general Paradox standard. The full details are in [docs/AI-DEVELOPMENT-WORKFLOW.md](docs/AI-DEVELOPMENT-WORKFLOW.md). Key additions beyond the company standard:

- **Experimental code** goes in `/src/__experiments__/` (git-ignored), with learnings documented in `/docs/learnings/`
- **Feature proposals** go in `/docs/prs/` before implementation, moved to `/docs/prs/done/` after completion
- **Pre-implementation approval gate**: propose doc changes, get explicit approval before coding
- **Additional commit prefix**: `Learn:` for learning/experiment documents

### Documentation Hierarchy

**Primary (always check before coding)**:
- `docs/SPEC.md` — Features, INI schema, clock styles
- `docs/ARCHITECTURE.md` — Framework design, build system, extension points
- `docs/MQTT_API.md` — MQTT interface and commands
- `docs/TESTING.md` — Testing strategy
- `README.md` — User-facing overview

**Secondary (update when relevant)**:
- `docs/learnings/*.md` — Experimental findings
- `docs/prs/*.md` — Feature proposals

## Regression Prevention

### Before Any Code Change
- [ ] Read relevant sections of SPEC.md, ARCHITECTURE.md, MQTT_API.md
- [ ] Check if change conflicts with documented design
- [ ] If conflict exists, propose doc changes first
- [ ] Get user approval before proceeding

### Key Invariants
- INI schema changes must update SPEC.md
- MQTT changes must update MQTT_API.md
- Build process changes must update ARCHITECTURE.md
- New clock styles must be pluggable (no core modifications required)

## File Map

```
/
├── assets/              # Clock assets organized by style
│   └── houdini/         # Houdini analog clock assets
├── config/              # INI configuration files
├── docs/
│   ├── SPEC.md          # Feature spec and INI schema
│   ├── ARCHITECTURE.md  # Framework design
│   ├── MQTT_API.md      # MQTT interface
│   ├── TESTING.md       # Testing strategy
│   ├── AI-DEVELOPMENT-WORKFLOW.md  # PxC-specific dev workflow
│   ├── learnings/       # Experimental findings
│   └── prs/             # Feature proposals
├── src/
│   ├── components/
│   │   ├── clocks/      # Clock renderer components
│   │   └── ClockShell.jsx
│   └── utils/
├── archive/             # Original Houdini Clock (reference only)
├── build/               # Build output
├── public/              # Static public assets
└── test/                # Tests
```

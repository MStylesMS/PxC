# Paradox Clock (PxC)

A framework for creating optimized, configuration-driven clock applications.

**AI Documentation**: [AI-INSTRUCTIONS.md](AI-INSTRUCTIONS.md) (quick context) | [AI-DETAILED-OVERVIEW.md](AI-DETAILED-OVERVIEW.md) (comprehensive guide) PxC enables rapid authoring of custom countdown, clock, and stopwatch displays through `.ini` configuration files, producing lean, production-ready React applications tailored to each specific use case.

## What is PxC?

PxC is **not** a single monolithic clock application. Instead, it's a **build system and component framework** that:

- Reads configuration from `.ini` files (clock style, assets, layout, MQTT settings)
- Generates optimized React apps at build time (only includes needed renderers and assets)
- Produces static bundles deployable to any web server or kiosk

Each `.ini` configuration produces a separate, self-contained clock application.

## Key Features

- **Multiple clock styles**: Analog (rotating hands), LED/digit-based, flip clock, video/graphic-based
- **Multiple timing modes**: Countdown, real-time clock, stopwatch (mode support depends on style)
- **Configuration-driven**: Non-developers can create new clock variants by editing `.ini` files
- **Build-time optimization**: Configuration baked into build for fast startup and small bundle size
- **Optional MQTT control**: Remote control via MQTT for escape rooms, exhibits, events
- **Rotation support**: 0°, 90°, 180°, 270° rotation for landscape/portrait displays
- **Pluggable architecture**: Developers can add new clock renderers without modifying core

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- (Optional) MQTT broker (e.g., Mosquitto) for remote control

### Clone and Install
```bash
git clone git@github.com:MStylesMS/PxC.git
cd PxC
npm install
```

### Configure a Clock
Edit or create a configuration file in `/config`:

```bash
cp config/houdini.ini config/my-clock.ini
nano config/my-clock.ini
```

### Build
```bash
npm run build
```

The built application will be in `/build` (or `/dist`) and can be served from any static web server.

### Development Mode
```bash
npm run start
```

## Repository Structure

```
/
├── assets/              # Clock assets (images, fonts, organized by style)
│   └── houdini/        # Example: Houdini analog clock assets
├── config/             # Configuration files (.ini)
│   └── houdini.ini     # Example: Houdini analog clock config
├── docs/               # Documentation
│   ├── SPEC.md         # Feature specification and INI schema
│   ├── ARCHITECTURE.md # Framework design and build system
│   ├── MQTT_API.md     # MQTT interface reference
│   ├── TESTING.md      # Testing strategy and guidelines
│   ├── AI_AGENT_INSTRUCTIONS.md  # Development workflow for AI agents
│   ├── learnings/      # Experimental findings and lessons learned
│   └── prs/            # Feature proposals (active and completed)
├── src/                # React source (to be implemented)
│   ├── components/
│   │   ├── clocks/     # Clock renderer components
│   │   └── ClockShell.jsx
│   └── utils/
├── archive/            # Original Houdini Clock code (reference)
├── package.json
└── README.md          # This file
```

## Available Clock Styles

Currently in development:
- **antique-analog-oval-portrait** (Houdini-style): Rotating minute and second hands on custom background
- **simple-4digit-landscape** (planned): LED-style 4-digit countdown display

See `/docs/SPEC.md` for complete list and configuration options.

## Configuration

Clock behavior is defined in `.ini` files under `/config`. Key sections:

### Common Settings
```ini
[mqtt]
host = localhost
port = 1884
topic = paradox/clock/my-clock

[display]
orientation = 0           # 0, 90, 180, or 270 degrees
fade_duration_ms = 2000

[type]
style = antique-analog-oval-portrait
mode = countdown          # countdown | clock | stopwatch
```

### Style-Specific Settings
Each clock style has its own section (e.g., `[analog]`, `[led4]`) with style-specific options like asset paths, positioning, colors, and fonts.

See `/docs/SPEC.md` for complete INI reference.

## MQTT Control (Optional)

If MQTT is configured, clocks can be controlled remotely. Example commands:

```bash
# Set countdown time
mosquitto_pub -t "paradox/clock/my-clock/commands" \
  -m '{"command":"setTime","time":"05:00"}'

# Start countdown
mosquitto_pub -t "paradox/clock/my-clock/commands" \
  -m '{"command":"start"}'

# Display hint
mosquitto_pub -t "paradox/clock/my-clock/commands" \
  -m '{"hint":"Check the manual","duration":10}'
```

See `/docs/MQTT_API.md` for complete command reference.

## Development

### Adding a New Clock Style

1. Create assets in `/assets/my-style/`
2. Create renderer component in `/src/components/clocks/MyStyle.jsx`
3. Register renderer in `ClockShell.jsx`
4. Document style in `/docs/SPEC.md`
5. Create example config in `/config/my-style.ini`
6. Build: `CLOCK_CONFIG=config/my-style.ini npm run build`

See `/docs/ARCHITECTURE.md` for detailed extension guide.

### Development Workflow

All significant changes follow a **documentation-first** approach:

1. Review `/docs/SPEC.md`, `/docs/ARCHITECTURE.md`, `/docs/MQTT_API.md`
2. Propose documentation updates for your change
3. Get approval
4. Update documentation
5. Implement code to match documentation

See `/docs/AI_AGENT_INSTRUCTIONS.md` for complete workflow.

## Current Status

**Status**: Active Development

**Completed**:
- ✅ Framework design and architecture
- ✅ INI schema and configuration approach
- ✅ MQTT API specification
- ✅ Houdini analog clock assets and configuration
- ✅ Documentation structure

**In Progress**:
- 🚧 React component implementation
- 🚧 Build system and INI loader
- 🚧 Analog clock renderer
- 🚧 LED 4-digit renderer

**Planned**:
- ⏳ Flip clock renderer
- ⏳ Video/graphic renderer
- ⏳ Web-based config editor
- ⏳ Multi-config CI/CD pipeline

## Documentation

- **[SPEC.md](docs/SPEC.md)** — Feature specification and INI schema reference
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Framework design and build system
- **[MQTT_API.md](docs/MQTT_API.md)** — MQTT command reference
- **[AI_AGENT_INSTRUCTIONS.md](docs/AI_AGENT_INSTRUCTIONS.md)** — Development workflow

## Contributing

When contributing code:
1. Follow the documentation-first workflow in `/docs/AI_AGENT_INSTRUCTIONS.md`
2. Update relevant documentation before implementing changes
3. Ensure code matches documentation
4. Add tests for new features
5. Update this README if adding user-facing features

## License

See `LICENSE` file for details.

## Links

- **GitHub**: https://github.com/MStylesMS/PxC
- **GitLab Mirror**: https://gitlab.gnurdle.com/paradox/PxC

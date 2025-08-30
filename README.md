# Houdini Clock - Escape Room Countdown System

A React-based countdown clock interface for escape room experiences, featuring real-time MQTT communication and dynamic visual elements.

## 📸 Screenshot

![Houdini Clock Interface](docs/Sample%20Clock.png)

## 🌟 Features

- **Real-time Countdown Clock**: Analog clock display with animated second and minute hands
- **MQTT Integration**: Real-time communication for remote control and monitoring
- **Dynamic Hints System**: Temporary hint overlays with auto-hide functionality
- **Responsive Design**: Optimized for various screen sizes and resolutions
- **Fade Effects**: Smooth fade-in/fade-out transitions for enhanced user experience
- **Escape Room Integration**: Designed specifically for escape room control systems

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ (tested with Node.js 24.4.0)
- npm or yarn package manager
- MQTT broker (default configuration expects localhost:1884)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd houdiniclock

# Install dependencies
npm install
# or
yarn install
```

### Development

```bash
# Start development server
npm start
# or
yarn start
```

The application will start on `http://localhost:3000` by default.

### Production Build

```bash
# Build for production
npm run build
# or
yarn build

# Serve production build locally (optional)
npm run build:analyze
```


## 🖥️ Kiosk Mode

For the best escape room experience, run Houdini Clock in Chromium's kiosk mode. This launches the browser in full-screen, borderless mode with no address bar or controls.

**To launch Chromium in kiosk mode:**

```bash
chromium-browser --kiosk http://your-clock-url
# or
google-chrome --kiosk http://your-clock-url
```

For more information and advanced options, see the [Kiosk Mode section in the Deployment Guide](docs/DEPLOYMENT.md#kiosk-mode).

If you cannot follow the link, see the deployment guide for more details on kiosk setup.

## ⚙️ Configuration


### MQTT Broker Configuration (TCP + WebSocket)

To support both CLI tools and browser-based apps, configure your Mosquitto broker as follows (in `/etc/mosquitto/mosquitto.conf`):

```conf
listener 1883 0.0.0.0
protocol mqtt

listener 1884
protocol websockets
```

Restart Mosquitto after editing:
```bash
sudo systemctl restart mosquitto
```

### MQTT Settings

Configure MQTT connection by editing environment variables in the start/build scripts or using a `.env` file:

```bash
# Default development configuration
REACT_APP_MQTT_HOST=localhost
REACT_APP_MQTT_PORT=1884
```

### Environment-specific Configuration

#### Development
```json
"start": "cross-env REACT_APP_MQTT_HOST=localhost REACT_APP_MQTT_PORT=1884 react-scripts start"
```

#### Production
```json
"build": "cross-env REACT_APP_MQTT_HOST=your-mqtt-broker.com REACT_APP_MQTT_PORT=8883 react-scripts build"
```


## 📡 MQTT Commands

The clock listens on the base topic `paradox/houdini/clock`:

- Commands: `paradox/houdini/clock/commands`
- State: `paradox/houdini/clock/state`
- Events: `paradox/houdini/clock/events`
- Warnings: `paradox/houdini/clock/warnings`

### Time & Control (JSON)
- Set time: `{ "command": "setTime", "time": "MM:SS" }`
- Start/Resume: `{ "command": "start" }` or `{ "command": "resume" }`
- Pause: `{ "command": "pause" }`
- Combined set & start: `{ "command": "start", "time": "MM:SS" }`

### Visual Effects (JSON)
- Fade in: `{ "command": "fadeIn", "duration": 1000 }`
- Fade out: `{ "command": "fadeOut", "duration": 1000 }`

### Hints (JSON)
- Show hint: `{ "hint": "Your hint here", "duration": 10 }`

### Legacy Text Commands (deprecated)
- `time <seconds>`, `start`, `pause`, `fadein`, `fadeout`, `hint <message>`

### Examples
```bash
# Set time to 10 minutes
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"command":"setTime","time":"10:00"}'

# Start countdown
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"command":"start"}'

# Set time and start in one command
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"command":"start","time":"05:00"}'

# Pause countdown
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"command":"pause"}'

# Resume countdown
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"command":"resume"}'

# Show hint with custom duration
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"hint":"Look behind the mirror","duration":30}'

# Fade effects
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"command":"fadeOut","duration":1000}'
mosquitto_pub -h localhost -t paradox/houdini/clock/commands -m '{"command":"fadeIn","duration":1000}'
```

For detailed specifications, see [docs/MQTT_API.md](docs/MQTT_API.md).


## 🛠️ Development

### Next Milestone

- [ ] Migrate MQTT topic, host, and port configuration to an `.ini` file for easier environment management (see docs/MQTT_API.md and planned PR).

### Available Scripts

```bash
npm start              # Start development server
npm run build          # Create production build
npm run build:analyze  # Build and serve with analysis
npm test               # Run test suite
npm run test:coverage  # Run tests with coverage report
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues automatically
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
```


### MQTT & App Settings (.ini-based)

All configuration is managed via `config/clock.ini` and is baked into the optimized build during `npm run build`.
Note: Changing `clock.ini` requires rebuilding to take effect.

**Example: `config/clock.ini`**

```ini
[mqtt]
host = localhost
port = 1884
topic = Paradox/Houdini/Mirror/Clock/Commands
reconnect_interval = 5000
keep_alive = 60

[display]
fade_duration_default = 2000
hint_duration_default = 25
clock_orientation = -90
seconds_tick_style = alternate  ; options: alternate | tick1 | tick2 | off


```

**To change MQTT host, port, or topic:**
1. Edit `config/development.ini` under the `[mqtt]` section.
2. Restart the app if running.

**To add production or other environments:**
1. Copy `config/development.ini` to `config/production.ini` (or any name matching your `NODE_ENV`).
2. Edit as needed for your environment.

Build-time processing: A prebuild step (`scripts/generate-runtime-config.js`) reads `config/clock.ini` and emits `src/runtime-config.json`, which is bundled and used by the optimized page. No runtime fetch is required.
## 🏗️ Architecture

### Component Structure

```
src/
├── App.js                    # Main application component
├── MQTT.js                   # MQTT client configuration
├── index.js                  # Application entry point
└── components/
    ├── clock/
    │   ├── Clock.js          # Main clock container
    │   ├── SecondsHand.js    # Seconds hand component
    │   ├── MinutesHand.js    # Minutes hand component
    │   └── bg.png            # Clock background image
    └── hint/
        └── Hint.js           # Hint overlay component
```

### Technology Stack

- **Frontend**: React 18.3.1 with modern hooks
- **MQTT**: RxJS 7.8.1 + Paho MQTT for real-time communication
- **Build Tools**: react-scripts 5.0.1, Webpack 5
- **Testing**: Jest, React Testing Library
- **Code Quality**: ESLint, Prettier
- **Styling**: CSS modules with responsive design

## 📚 Documentation

Key docs:

- Deployment guide: `DEPLOYMENT.md` (canonical)
- MQTT Commands: `docs/MQTT_API.md`
- Web control reference: `docs/Houdini Web Control.pdf`
- Clock assets: `docs/Countdown_Clock Face.png`

Historical plans and prior PR/Issue notes were moved to `docs/archive/` to declutter.

## 🔧 Troubleshooting

### Common Issues

1. **MQTT Connection Failed**
   - Verify MQTT broker is running on specified host/port
   - Check firewall settings for MQTT port access
   - Ensure WebSocket support is enabled on MQTT broker

2. **Clock Not Updating**
   - Check browser console for JavaScript errors
   - Verify MQTT messages are being received
   - Ensure proper time format in MQTT commands

3. **Build Errors**
   - Update Node.js to version 16 or higher
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and reinstall dependencies

### Performance Tips

- Use production build for deployment
- Enable gzip compression on web server
- Optimize images in the `public/` directory
- Monitor MQTT message frequency for performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit a pull request

### Development Workflow

- Follow the existing code style (ESLint + Prettier)
- Write tests for new components
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is part of the Paradox Escape Room system. All rights reserved.

## 📞 Support

For technical support or questions:
- Check the [documentation](docs/) directory
- Review [troubleshooting](#🔧-troubleshooting) section
- Contact the development team

---

**Version**: 1.1.0  
**Last Updated**: 2025-08-11  
**Node.js Compatibility**: 16+  
**React Version**: 18.3.1
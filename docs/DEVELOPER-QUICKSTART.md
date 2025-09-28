# Developer Quickstart

Welcome to the Houdini Clock project! This guide helps you get up to speed quickly, whether you’re new or returning.

## Essential References
- **Project Overview & Setup:** [README.md](../README.md)
- **Release History & Major Changes:** [CHANGELOG.md](../CHANGELOG.md)
- **Configuration & Next Steps:** [docs/PR-10.md](./PR-10.md)
- **Historical Docs & Refactor Notes:** [docs/archive/](./archive/)

## Local Development
1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
2. **Start the app:**
   ```bash
   npm start
   # or
   yarn start
   ```
   The app runs at http://localhost:3000 by default.

3. **Configuration:**
   - Edit `config/development.ini` for local MQTT and display settings.
   - See [docs/PR-10.md](./PR-10.md) for .ini auto-loader details and environment switching.

## Build & Test
- **Build for production:**
  ```bash
  npm run build
  ```
- **Run tests:**
  ```bash
  npm test
  ```
- **Lint code:**
  ```bash
  npm run lint
  ```

## CI/CD & Advanced Topics
- See [docs/PR-10.md](./PR-10.md) for the proposed CI pipeline and config loader design.
- For historical PRs/issues, see [docs/archive/](./archive/).

## Quick MQTT Usage (New Visibility & State Query)
After starting a local broker and the app, you can:
```bash
# Force an immediate state snapshot (at most every 900ms)
mosquitto_pub -h localhost -p 1884 -t paradox/houdini/clock/commands -m '{"command":"getState"}'

# Fade in then query mid-fade (visible will still be false until completion)
mosquitto_pub -h localhost -p 1884 -t paradox/houdini/clock/commands -m '{"command":"fadeIn", "duration": 2000}'
sleep 0.5
mosquitto_pub -h localhost -p 1884 -t paradox/houdini/clock/commands -m '{"command":"getState"}'

# Fade out immediately sets visible:false
mosquitto_pub -h localhost -p 1884 -t paradox/houdini/clock/commands -m '{"command":"fadeOut"}'
```
Subscribe in another terminal:
```bash
mosquitto_sub -h localhost -p 1884 -t paradox/houdini/clock/state
```
Expect `visible:true` only after the fadeIn duration elapses.

## Need Help?
- Check the README and PR-10 first.
- For legacy design or migration notes, see [docs/archive/](./archive/).

---

**Start here for any new dev setup, config, or repo history!**

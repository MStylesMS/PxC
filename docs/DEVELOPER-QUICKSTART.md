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

## Need Help?
- Check the README and PR-10 first.
- For legacy design or migration notes, see [docs/archive/](./archive/).

---

**Start here for any new dev setup, config, or repo history!**

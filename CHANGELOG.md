# Changelog

All notable changes to ParadoxFX Clock (PxC) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-10-31

### Added
- Runtime configuration editing via `config.json` - no rebuild required for MQTT/display changes
- User-friendly `README.md` in build directory with configuration examples
- Developer documentation in `docs/CONFIG_EDITING.md`

### Changed
- Config generation now creates editable `config.json` (excludes immutable build-time fields)
- App now loads `config.json` at runtime and merges with built-in config
- Simplified config structure - only includes fields that can be changed without rebuild

### Technical
- Modified `scripts/prebuild.js` to generate `public/config.json` with editable fields only
- Updated `src/App.jsx` to fetch and merge runtime config on startup
- Runtime config falls back to built-in config if JSON is missing or invalid

## [0.1.1] - 2025-10-25

### Initial Release
- Configuration-driven clock framework
- Multiple clock styles (LED, analog, etc.)
- MQTT integration for remote control
- INI-based build-time configuration

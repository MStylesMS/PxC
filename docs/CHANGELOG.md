# Changelog

All notable changes to the Houdini Clock project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- CI/CD pipeline implementation
 
## [1.2.0] - 2025-09-28

### Added
- `getState` MQTT command: immediate state publish on demand (rate-limited to one every 900ms).
- Boolean `visible` flag in every state publish (`true` only after fadeIn completes; `false` immediately when fadeOut begins).

### Changed
- Immediate publishes now occur on visibility and key state changes (start/resume/pause/fade transitions) resetting the periodic state timer cadence.

### Notes
- Backward compatible: prior consumers ignoring `visible` are unaffected.
- Replaced planned numeric visibility percentage with simpler boolean logic per operator feedback.

## [1.1.0] - 2025-08-11

### Changed
- Consolidated documentation: kept canonical `DEPLOYMENT.md` at repo root; removed duplicate `docs/DEPLOYMENT.md`.
- Updated README with links to MQTT commands and deployment guide; pruned outdated references.

### Added
- Created `docs/archive/` and moved historical PR/ISSUE writeups, refactor plans, and session reports there to declutter the docs root.
- Archived `src/registerServiceWorker.optimized.js` to `docs/archive/registerServiceWorker.optimized.js` for reference.

### Removed
- Deleted unused/obsolete files: `public/rotation-worker.js`, `src/App.clean.js`, `src/SimpleTest.js`, and ad-hoc test runners `test-runtime.js`, `test-runtime-live.js`, `test-functionality.js`.

### Notes
- No runtime code changes; app behavior unchanged.

- Performance optimization and bundle analysis
- Additional test coverage improvements

## [1.1.1] - 2025-08-14

### Removed
- Docker support and documentation references.

## [1.0.1] - 2025-01-XX

### Major Modernization Release

This release represents a complete modernization of the Houdini Clock application, upgrading from 2018 technology stack to 2025 standards.

### 🚀 Added
- **Testing Framework**: Comprehensive test suite using React Testing Library
  - Component tests for all React components
  - MQTT module testing with mocked dependencies
  - Timer behavior and state management tests
  - Coverage reporting with `npm run test:coverage`
- **Modern Development Tools**:
  - Prettier 3.3.3 for code formatting
  - Enhanced ESLint configuration with React hooks rules
  - VS Code workspace configuration
  - Development scripts for linting and formatting
- **Documentation**:
  - Comprehensive README.md with installation, configuration, and usage guide
  - MQTT commands reference and troubleshooting guide
  - Architecture overview and component documentation
  - This changelog for tracking project evolution

### 🔄 Changed
- **React 18 Migration**: Upgraded from React 16.4.1 to 18.3.1
  - Migrated from legacy `ReactDOM.render()` to `createRoot()` API
  - Converted all class components to functional components with hooks
  - Modern lifecycle management with `useEffect` and cleanup
  - Improved state management with `useState` and `useRef`
- **Build System**: Upgraded react-scripts from 1.1.4 to 5.0.1
  - Node.js 24.4.0 compatibility (previously incompatible)
  - Modern Webpack 5 build system
  - Improved development server with hot reloading
  - Better error reporting and debugging
- **MQTT Dependencies**: Modernized RxJS from 6.2.1 to 7.8.1
  - Updated Observable patterns and pipe() syntax
  - Improved error handling and connection management
  - Better TypeScript support and performance
- **Component Architecture**:
  - `App.js`: Maintained as class component for MQTT integration
  - `Clock.js`: Converted to functional component with hooks
  - `Hint.js`: Modernized with timer management hooks
  - `SecondsHand.js` & `MinutesHand.js`: Pure functional components
  - Added data-testid attributes for better testing

### 🔧 Fixed
- **Security**: Resolved 159 security vulnerabilities through dependency updates
- **Compatibility**: Fixed complete incompatibility with Node.js 24.4.0
- **Performance**: Eliminated deprecated React lifecycle methods
- **Code Quality**: Standardized formatting and linting across codebase
- **Build Issues**: Resolved webpack and build tool compatibility problems

### 📦 Dependencies

#### Major Updates
- React: 16.4.1 → 18.3.1
- react-scripts: 1.1.4 → 5.0.1
- RxJS: 6.2.1 → 7.8.1

#### New Dependencies
- @testing-library/react: 14.0.0
- @testing-library/jest-dom: 6.1.4
- @testing-library/user-event: 14.5.1
- prettier: 3.3.3
- cross-env: 7.0.3 (updated)

#### Development Dependencies
- Enhanced ESLint configuration
- Jest testing framework (included with react-scripts)
- VS Code extensions and workspace settings

### 🗂️ Project Structure
```
├── src/
│   ├── components/
│   │   ├── clock/           # Clock components and assets
│   │   └── hint/           # Hint overlay component
│   ├── App.js              # Main application
│   ├── MQTT.js             # MQTT client
│   └── index.js            # Entry point
├── public/                 # Static assets
├── docs/                   # Documentation and assets
├── .vscode/               # VS Code configuration
└── package.json           # Modern dependency management
```

### 🧪 Testing
- **Coverage**: Comprehensive test coverage for all components
- **Methodology**: User-centric testing with React Testing Library
- **Mocking**: Proper mocking of external dependencies (MQTT, timers)
- **CI Ready**: Tests can run in CI environments

### 📋 Migration Notes

For developers working with the legacy version:

1. **Node.js**: Upgrade to Node.js 16+ (tested with 24.4.0)
2. **Package Manager**: `npm install` will handle all dependency updates
3. **Development**: New scripts available (`npm run lint`, `npm run format`, etc.)
4. **Testing**: Run `npm test` for component testing
5. **Building**: `npm run build` for production builds

### ⚠️ Breaking Changes
- **Node.js**: Minimum version now 16+ (previously worked with older versions)
- **React**: Applications using legacy lifecycle methods may need updates
- **RxJS**: Observable patterns updated to v7 syntax

### 🎯 Performance Improvements
- Modern React rendering with concurrent features
- Optimized bundle size through updated build tools
- Better tree-shaking and code splitting
- Improved development server performance

---

## [1.0.0] - 2018-06-24

### Initial Release

The original Houdini Clock implementation with basic escape room functionality.

### Features
- Basic analog clock display
- MQTT command processing
- Countdown timer functionality
- Hint overlay system
- Fade effects for visual transitions

### Technology Stack (Legacy)
- React 16.4.1
- react-scripts 1.1.4
- RxJS 6.2.1
- Node.js compatibility issues with modern versions

### Known Issues (Resolved in v1.0.1)
- 159 security vulnerabilities
- Node.js 24.4.0 incompatibility
- Deprecated React lifecycle methods
- Outdated build tooling
- No test coverage
- Inconsistent code formatting

---

## Version History Summary

| Version | Date | Major Changes |
|---------|------|---------------|
| 1.0.1 | 2025-01-XX | Complete modernization, React 18, testing framework |
| 1.0.0 | 2018-06-24 | Initial release with basic functionality |

---

**Note**: This changelog was created during the modernization process to document the significant architectural and dependency changes made to bring the project up to 2025 standards.

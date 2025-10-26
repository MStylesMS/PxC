# Testing Strategy for Paradox Clock (PxC)

## Overview

This document defines the testing strategy for PxC, including what to test, when to test it, and how to integrate testing into the development workflow. PxC's unique architecture (build-time config processing, pluggable renderers, optional MQTT) requires a tailored testing approach.

## Testing Philosophy

1. **Test the contract, not the implementation** — Focus on behavior described in SPEC.md, not internal details
2. **Test build-time transformations early** — INI parsing and config validation are critical
3. **Test each renderer in isolation** — Clock styles should be independent
4. **Mock external dependencies** — MQTT, timers, system time should be controllable in tests
5. **Add tests incrementally** — Start with foundation, expand as features stabilize

## Test Categories and Priorities

### Phase 1: Foundation (Implement FIRST)

These tests should be created **before or alongside** initial implementation:

#### 1. INI Parser Tests (HIGH PRIORITY)
**When to create:** Before implementing any clock renderer
**File:** `test/unit/ini-loader.test.js`

**What to test:**
- Parse valid INI files correctly
- Handle missing required sections (error)
- Handle missing optional keys (apply defaults)
- Validate data types (strings, integers, booleans, enums)
- Validate enum values (e.g., mode = countdown|clock|stopwatch)
- Handle malformed INI syntax gracefully
- Resolve relative asset paths

**Why first:** Every clock depends on config parsing. Bugs here break everything.

**Example test structure:**
```javascript
describe('INI Loader', () => {
  test('parses valid houdini.ini', () => {
    const config = loadIni('test/fixtures/houdini.ini');
    expect(config.type.style).toBe('antique-analog-oval-portrait');
    expect(config.display.orientation).toBe(-90);
  });

  test('rejects missing [type] section', () => {
    expect(() => loadIni('test/fixtures/invalid-no-type.ini'))
      .toThrow('Missing required section: [type]');
  });

  test('applies default fade_duration_ms', () => {
    const config = loadIni('test/fixtures/minimal.ini');
    expect(config.display.fade_duration_ms).toBe(2000);
  });
});
```

#### 2. Config Validation Tests (HIGH PRIORITY)
**When to create:** Immediately after INI parser
**File:** `test/validate-configs.test.js`

**What to test:**
- All example INI files in `/config` parse successfully
- Required sections/keys present
- Referenced asset files exist
- Enum values are valid

**Why important:** Catches broken example configs before users encounter them.

**Example:**
```javascript
describe('Config validation', () => {
  const configFiles = fs.readdirSync('config')
    .filter(f => f.endsWith('.ini'));

  configFiles.forEach(file => {
    test(`${file} is valid and complete`, () => {
      const config = loadIni(`config/${file}`);
      
      // Required sections
      expect(config.type).toBeDefined();
      expect(config.display).toBeDefined();
      
      // Asset files exist
      if (config.analog?.background) {
        expect(fs.existsSync(config.analog.background)).toBe(true);
      }
    });
  });
});
```

#### 3. Time Service Tests (HIGH PRIORITY)
**When to create:** Before implementing time service
**File:** `test/unit/time-service.test.js`

**What to test:**
- Countdown: tick, pause, resume, reaches zero
- Stopwatch: tick, pause, resume, elapsed time
- Clock mode: formats system time correctly
- Time parsing (MM:SS → seconds)
- Time formatting (seconds → MM:SS or HH:MM:SS)

**Why critical:** Core logic for all clock types.

**Example:**
```javascript
describe('Time Service - Countdown', () => {
  test('counts down from initial time', () => {
    const timer = createCountdown('05:00');
    timer.tick();
    expect(timer.getTime()).toBe('04:59');
  });

  test('pauses and resumes correctly', () => {
    const timer = createCountdown('02:00');
    timer.pause();
    timer.tick(); // Should not decrement
    expect(timer.getTime()).toBe('02:00');
    timer.resume();
    timer.tick();
    expect(timer.getTime()).toBe('01:59');
  });

  test('triggers callback at zero', () => {
    const onZero = jest.fn();
    const timer = createCountdown('00:01', { onZero });
    timer.tick();
    expect(onZero).toHaveBeenCalled();
  });
});
```

### Phase 2: Component Integration (Implement WITH Renderers)

These tests should be created **as each renderer is implemented**:

#### 4. Clock Renderer Tests (MEDIUM PRIORITY)
**When to create:** Immediately after each renderer component is written
**Files:** `test/unit/components/AnalogClock.test.jsx`, `test/unit/components/LedClock.test.jsx`

**What to test:**
- Component renders without errors
- Accepts config props correctly
- Updates display when time prop changes
- Applies rotation transform
- Handles hint display/clear
- Responds to fade commands

**Why per-renderer:** Each style has unique behavior; test isolation ensures independence.

**Example:**
```javascript
describe('AnalogClock', () => {
  const mockConfig = {
    analog: {
      background: 'assets/houdini/bg.png',
      minute_hand: { path: 'assets/houdini/minute_hand_sm.png', ... },
      second_hand: { path: 'assets/houdini/seconds_hand_sm.png', ... }
    },
    display: { orientation: 0 }
  };

  test('renders without crashing', () => {
    render(<AnalogClock config={mockConfig} time="05:00" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  test('rotates hands based on time', () => {
    const { rerender } = render(<AnalogClock config={mockConfig} time="05:00" />);
    const minuteHand = screen.getByTestId('minute-hand');
    const initialRotation = getComputedStyle(minuteHand).transform;

    rerender(<AnalogClock config={mockConfig} time="05:30" />);
    const newRotation = getComputedStyle(minuteHand).transform;
    
    expect(newRotation).not.toBe(initialRotation);
  });
});
```

#### 5. ClockShell Integration Tests (MEDIUM PRIORITY)
**When to create:** After ClockShell and at least one renderer exist
**File:** `test/integration/ClockShell.test.jsx`

**What to test:**
- Loads correct renderer based on config.type.style
- Passes config props to renderer
- Manages timer state (start/pause/resume)
- Handles mode switching (if supported)
- Connects to MQTT (with mock broker)
- Publishes state updates
- Processes MQTT commands

**Why integration:** Tests that components work together correctly.

**Example:**
```javascript
describe('ClockShell Integration', () => {
  test('loads AnalogClock for houdini style', () => {
    const config = loadIni('test/fixtures/houdini.ini');
    render(<ClockShell config={config} />);
    
    // Verify analog clock-specific elements present
    expect(screen.getByTestId('analog-clock')).toBeInTheDocument();
  });

  test('starts countdown on start command', () => {
    const { mockMqtt } = renderWithMqtt(<ClockShell config={config} />);
    
    mockMqtt.publish('commands', '{"command":"start","time":"05:00"}');
    
    // Wait for state update
    await waitFor(() => {
      expect(mockMqtt.lastPublished('state')).toMatchObject({
        state: 'running',
        time: '05:00'
      });
    });
  });
});
```

### Phase 3: Build & Asset Tests (Implement AFTER Core Works)

#### 6. Build Process Tests (MEDIUM PRIORITY)
**When to create:** After build system is functional
**File:** `test/build/build-process.test.js`

**What to test:**
- Build with different INI configs produces different bundles
- Only referenced assets are included in bundle
- Correct renderer is included (others tree-shaken)
- Config is baked into build output
- Source maps generated (if configured)

**Why later:** Build system needs to work first; these tests validate optimization.

**Example:**
```javascript
describe('Build Process', () => {
  test('builds houdini config successfully', async () => {
    const result = await runBuild('config/houdini.ini');
    
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync('build/index.html')).toBe(true);
    expect(fs.existsSync('build/static/js/main.*.js')).toBe(true);
  });

  test('only includes houdini assets', async () => {
    await runBuild('config/houdini.ini');
    const bundleContent = fs.readFileSync('build/static/js/main.*.js', 'utf8');
    
    expect(bundleContent).toContain('houdini/bg.png');
    expect(bundleContent).not.toContain('led4/digit'); // LED assets excluded
  });
});
```

#### 7. Asset Loader Tests (MEDIUM-LOW PRIORITY)
**When to create:** When implementing asset loading logic
**File:** `test/unit/asset-loader.test.js`

**What to test:**
- Resolves relative paths to absolute URLs
- Handles missing assets (fallback or error)
- Validates asset file types
- Preloads critical assets

### Phase 4: Visual & E2E (Implement WHEN STABLE)

#### 8. Visual Regression Tests (LOW PRIORITY)
**When to create:** After renderers are stable and unlikely to change
**File:** `test/visual/*.spec.js` (Playwright)

**What to test:**
- Clock renders correctly at different times
- Rotation transforms work (0°, 90°, 180°, 270°)
- Fade in/out animations
- Hint overlay positioning
- Responsive layout

**Why last:** Visual tests are brittle and slow; wait until design is stable.

#### 9. E2E Tests (OPTIONAL)
**When to create:** If building demo environment or need cross-browser validation
**File:** `test/e2e/*.spec.js`

**What to test:**
- Full build → serve → open → MQTT control flow
- Browser compatibility
- Performance (load time, frame rate)

## Test Tools and Setup

### Required Dependencies

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "ini": "^4.0.0"
  }
}
```

### Optional (Add Later)
- `aedes` — In-memory MQTT broker for integration tests
- `playwright` — Visual/E2E tests
- `jest-image-snapshot` — Screenshot comparison

### Jest Configuration

Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|ttf)$': '<rootDir>/test/__mocks__/fileMock.js'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js'
  ],
  testMatch: [
    '<rootDir>/test/**/*.test.{js,jsx}'
  ]
};
```

### Test Directory Structure

```
/test/
├── setup.js                    # Jest setup (import '@testing-library/jest-dom')
├── fixtures/                   # Sample INI files for testing
│   ├── houdini.ini
│   ├── minimal.ini
│   ├── invalid-no-type.ini
│   └── ...
├── unit/                       # Unit tests
│   ├── ini-loader.test.js
│   ├── time-service.test.js
│   ├── asset-loader.test.js
│   └── components/
│       ├── AnalogClock.test.jsx
│       ├── LedClock.test.jsx
│       └── ClockShell.test.jsx
├── integration/                # Integration tests
│   ├── ClockShell.test.jsx
│   └── mqtt-integration.test.js
├── build/                      # Build process tests
│   └── build-process.test.js
├── visual/                     # Visual regression (Playwright)
│   └── clocks.spec.js
└── __mocks__/                  # Mock files
    ├── fileMock.js             # Mock for image imports
    └── mqttMock.js             # Mock MQTT client
```

## When to Write Tests (Decision Tree)

### New Utility Function?
→ Write unit test BEFORE or WITH implementation

### New Clock Renderer?
→ Write component test IMMEDIATELY after renderer works

### New MQTT Command?
→ Add test case to ClockShell integration tests

### New INI Key?
→ Add test case to INI parser validation

### Visual Change (CSS, layout)?
→ Manual QA first, add visual test if stable

### Bug Fix?
→ Write failing test that reproduces bug, then fix

## Integration with Development Workflow

### Before Committing Code

1. Run unit tests: `npm test`
2. Run config validation: `npm run test:configs`
3. Verify build succeeds: `npm run build`

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:configs
      - run: npm run build
      - uses: codecov/codecov-action@v3  # Upload coverage
```

### Coverage Goals

- **Utils (INI loader, time service):** 90%+ coverage
- **Components (renderers, ClockShell):** 70%+ coverage
- **Integration tests:** Focus on critical paths (MQTT commands, mode switching)

Don't aim for 100% coverage — focus on high-value tests.

## Testing MQTT Without a Broker

### Option 1: Mock the MQTT Client (Fastest)

```javascript
// test/__mocks__/mqttMock.js
const mockClient = {
  on: jest.fn((event, callback) => {
    if (event === 'connect') callback();
  }),
  subscribe: jest.fn(),
  publish: jest.fn(),
  end: jest.fn()
};

const mqtt = {
  connect: jest.fn(() => mockClient)
};

module.exports = mqtt;
```

### Option 2: In-Memory Broker (More Realistic)

```javascript
const Aedes = require('aedes')();
const { createServer } = require('net');

// Start broker in test setup
const broker = createServer(Aedes.handle);
broker.listen(1883, () => console.log('Test broker ready'));

// Tear down in afterAll
afterAll(() => broker.close());
```

### Option 3: Test Container (Most Realistic, Slowest)

Use Docker to run Mosquitto during tests. Only for E2E tests.

## Documentation Testing

### Validate INI Examples in SPEC.md

Create a test that:
1. Extracts INI code blocks from SPEC.md
2. Attempts to parse each one
3. Fails if any example is invalid

```javascript
test('SPEC.md INI examples are valid', () => {
  const specContent = fs.readFileSync('docs/SPEC.md', 'utf8');
  const iniBlocks = extractIniBlocks(specContent);
  
  iniBlocks.forEach((block, index) => {
    expect(() => ini.parse(block))
      .not.toThrow(`INI example ${index + 1} in SPEC.md is invalid`);
  });
});
```

## Test Maintenance

### When to Update Tests

- **SPEC.md changes** → Update INI parser tests and validation tests
- **MQTT_API.md changes** → Update MQTT integration tests
- **New renderer added** → Add renderer-specific tests
- **Bug found** → Add regression test

### When to Delete Tests

- Feature removed entirely
- Test is flaky and low-value
- Test duplicates coverage of another test

## Summary: Testing Timeline

| Phase | What | When |
|---|---|---|
| **Phase 1** | INI parser, config validation, time service | Before/during initial implementation |
| **Phase 2** | Component tests, ClockShell integration | As each component is written |
| **Phase 3** | Build tests, asset loading | After build system works |
| **Phase 4** | Visual regression, E2E | When stable, before v1.0 |

**Golden Rule:** Write tests that give confidence without slowing development. Start small, expand as patterns emerge.

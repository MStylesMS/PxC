// Tests for browser-safe config loader and Node .ini fallback

// For Node tests, config attempts to load config/<env>.ini; if not available, it falls back to defaults

describe('config loader', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  test('provides sane browser defaults when window is defined', async () => {
    // Simulate browser environment and ensure host preference via injected config
    global.window = { __APP_CONFIG__: { mqtt: { host: 'example.local' } }, location: { hostname: 'ignored.local' } };
    process.env = { ...originalEnv, NODE_ENV: 'test' };

    let cfg;
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      cfg = require('./config').default;
    });
  expect(typeof cfg.mqtt.host).toBe('string');
    expect(typeof cfg.mqtt.port).toBe('number');
    expect(cfg.mqtt.topic).toBeTruthy();
    expect(typeof cfg.enable_console_logging).toBe('boolean');
  });

  test('falls back to defaults when .ini is missing in Node', async () => {
    delete global.window; // simulate Node
  process.env = { ...originalEnv, NODE_ENV: 'test' };

    let cfg;
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      cfg = require('./config').default;
    });
    expect(cfg.mqtt.host).toBeDefined();
        expect(cfg.display.fade_duration_default).toBe(2);
  });

  test('merges window.__APP_CONFIG__ over defaults when present', async () => {
    global.window = {
      __APP_CONFIG__: {
        mqtt: { host: 'override-host', port: 9999 },
        display: { hint_duration_default: 42 },
        enable_console_logging: true,
      },
      location: { hostname: 'ignored.local' },
    };

    let cfg;
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      cfg = require('./config').default;
    });
    expect(cfg.mqtt.host).toBe('override-host');
    expect(cfg.mqtt.port).toBe(9999);
    expect(cfg.display.hint_duration_default).toBe(42);
    expect(cfg.enable_console_logging).toBe(true);
  });
});

// Browser-safe config loader with Node fallback for .ini files
// Priority order:
// 1) window.__APP_CONFIG__ (if injected via script in index.html)
// 2) Defaults and REACT_APP_* envs for browser builds
// 3) Node-only: config/<NODE_ENV>.ini read via fs (for tooling/tests)

const env = process.env.NODE_ENV || 'development';

// Base defaults (also used for browser)
const defaults = {
  mqtt: {
    host: (typeof window !== 'undefined' && window.location && window.location.hostname) || process.env.REACT_APP_MQTT_HOST || 'localhost',
    port: Number(process.env.REACT_APP_MQTT_PORT) || 1884,
    topic: 'paradox/houdini/clock',
    reconnect_interval: 5000,
    keep_alive: 60,
  },
  display: {
    fade_duration_default: 2000,
    hint_duration_default: 25,
    clock_orientation: -90,
  seconds_tick_style: 'alternate', // 'alternate' | 'tick1' | 'tick2' | 'off'
  },
  enable_console_logging: env === 'development',
};

let config = defaults;
let runtimeConfig = null;
try {
  // Will be present after prebuild step generates it
  // eslint-disable-next-line global-require, import/no-unresolved
  runtimeConfig = require('./runtime-config.json');
} catch (_) {
  runtimeConfig = null;
}

// 1) Window-injected runtime config (if present)
try {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    config = { ...defaults, ...window.__APP_CONFIG__, mqtt: { ...defaults.mqtt, ...(window.__APP_CONFIG__.mqtt || {}) }, display: { ...defaults.display, ...(window.__APP_CONFIG__.display || {}) } };
  } else if (runtimeConfig) {
    // Build-time baked config from clock.ini
    config = { ...defaults, ...runtimeConfig, mqtt: { ...defaults.mqtt, ...(runtimeConfig.mqtt || {}) }, display: { ...defaults.display, ...(runtimeConfig.display || {}) } };
  }
} catch (_) {
  // ignore
}

// 3) Node-only .ini loading (tests/tooling)
if (typeof window === 'undefined') {
  try {
  // eslint-disable-next-line no-eval
  const fs = eval('require')(/* webpackIgnore: true */ 'fs');
  // eslint-disable-next-line no-eval
  const ini = eval('require')(/* webpackIgnore: true */ 'ini');
    const configPath = `config/clock.ini`;
    const iniContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = ini.parse(iniContent);
    config = {
      ...defaults,
      ...parsed,
      mqtt: { ...defaults.mqtt, ...(parsed.mqtt || {}) },
      display: { ...defaults.display, ...(parsed.display || {}) },
    };
  } catch (e) {
    // No .ini available in Node – stick with defaults
    if (process && process.env && process.env.NODE_ENV !== 'test') {
      // Reduce noise during tests
      // eslint-disable-next-line no-console
      console.warn(`Config: using defaults (${env}); ${e.message}`);
    }
  }
} else {
  // In browser, ensure mqtt.host follows window.location.hostname unless explicitly overridden via window.__APP_CONFIG__
  try {
    const hostFromWindow = window && window.location && window.location.hostname;
    const overridden = !!(window && window.__APP_CONFIG__ && window.__APP_CONFIG__.mqtt && window.__APP_CONFIG__.mqtt.host);
    if (hostFromWindow && !overridden) {
      config = { ...config, mqtt: { ...config.mqtt, host: hostFromWindow } };
    }
  } catch (_) {
    // ignore
  }
}

export default config;

// Optional one-time debug of effective config
try {
  if (config && config.enable_console_logging) {
    // eslint-disable-next-line no-console
    console.debug('[PXC] Effective config:', config);
  }
} catch (_) {
  // ignore
}

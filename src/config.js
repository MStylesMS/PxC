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
    topic: 'Paradox/Houdini/Mirror/Clock/Commands',
    reconnect_interval: 5000,
    keep_alive: 60,
  },
  display: {
    fade_duration_default: 2000,
    hint_duration_default: 25,
    clock_orientation: -90,
  },
  enable_console_logging: env === 'development',
};

let config = defaults;

// 1) Window-injected runtime config (if present)
try {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    config = { ...defaults, ...window.__APP_CONFIG__, mqtt: { ...defaults.mqtt, ...(window.__APP_CONFIG__.mqtt || {}) }, display: { ...defaults.display, ...(window.__APP_CONFIG__.display || {}) } };
  }
} catch (_) {
  // ignore
}

// 3) Node-only .ini loading (tests/tooling)
if (typeof window === 'undefined') {
  try {
    const fs = eval('require')(/* webpackIgnore: true */ 'fs');
    const ini = eval('require')(/* webpackIgnore: true */ 'ini');
    const configPath = `config/${env}.ini`;
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
      console.warn(`Config: using defaults (${env}); ${e.message}`);
    }
  }
}

export default config;

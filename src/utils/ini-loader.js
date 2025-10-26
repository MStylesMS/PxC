/**
 * INI Loader Utility
 * 
 * Loads and validates PxC .ini configuration files.
 * Used at build time by prebuild.js and for testing.
 */

const fs = require('fs');
const path = require('path');
const ini = require('ini');

/**
 * Load and parse an INI file
 * @param {string} configPath - Absolute or relative path to .ini file
 * @returns {object} Parsed INI configuration (raw, unvalidated)
 * @throws {Error} If file not found or parse fails
 */
function loadIni(configPath) {
  const resolvedPath = path.resolve(configPath);
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }

  try {
    const iniContent = fs.readFileSync(resolvedPath, 'utf-8');
    return ini.parse(iniContent);
  } catch (error) {
    throw new Error(`Failed to parse INI file: ${error.message}`);
  }
}

/**
 * Validate and normalize configuration
 * @param {object} rawConfig - Raw parsed INI configuration
 * @returns {object} Validated and normalized configuration
 * @throws {Error} If validation fails
 */
function validateConfig(rawConfig) {
  // Validate required sections
  if (!rawConfig.type) {
    throw new Error('Missing required section: [type]');
  }

  if (!rawConfig.display) {
    throw new Error('Missing required section: [display]');
  }

  // Validate [type] section
  if (!rawConfig.type.style) {
    throw new Error('Missing required key: [type] style');
  }

  if (!rawConfig.type.mode) {
    throw new Error('Missing required key: [type] mode');
  }

  const validModes = ['countdown', 'clock', 'stopwatch'];
  if (!validModes.includes(rawConfig.type.mode)) {
    throw new Error(
      `Invalid [type] mode: ${rawConfig.type.mode}. Must be one of: ${validModes.join(', ')}`
    );
  }

  // Determine style-specific section
  const style = rawConfig.type.style;
  const styleSection = style.includes('analog') ? 'analog' :
                       style.includes('led') ? 'led4' :
                       style.includes('flip') ? 'flip' :
                       style.includes('font') ? 'font' :
                       style.includes('graphic') ? 'graphic' : null;

  if (!styleSection) {
    throw new Error(`Could not determine style section for: ${style}`);
  }

  if (!rawConfig[styleSection]) {
    throw new Error(`Missing required section: [${styleSection}]`);
  }

  // Style-specific validation
  if (styleSection === 'analog') {
    if (!rawConfig.analog.background) {
      throw new Error('Missing required key: [analog] background');
    }
    if (!rawConfig.analog['second_hand.path']) {
      throw new Error('Missing required key: [analog] second_hand.path');
    }
  }

  // Build validated config with defaults
  const config = {
    mqtt: rawConfig.mqtt ? {
      host: rawConfig.mqtt.host || 'localhost',
      port: coerceNumber(rawConfig.mqtt.port, 1884),
      topic: rawConfig.mqtt.topic || 'paradox/clock',
      reconnect_interval: coerceNumber(rawConfig.mqtt.reconnect_interval, 5000),
      keep_alive: coerceNumber(rawConfig.mqtt.keep_alive, 60),
    } : null,

    display: {
      orientation: coerceNumber(rawConfig.display.orientation, 0),
      fade_duration_ms: coerceNumber(rawConfig.display.fade_duration_ms, 2000),
      fade_background_type: rawConfig.display.fade_background_type || 'color',
      fade_background_color: rawConfig.display.fade_background_color || '#000000',
      fade_background_image: rawConfig.display.fade_background_image || null,
    },

    type: {
      style: rawConfig.type.style,
      mode: rawConfig.type.mode,
    },

    // Include style-specific config
    [styleSection]: rawConfig[styleSection],
  };

  return config;
}

/**
 * Coerce value to number, return default if invalid
 * @param {any} value - Value to coerce
 * @param {number} defaultValue - Default if coercion fails
 * @returns {number}
 */
function coerceNumber(value, defaultValue) {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Coerce value to boolean, return default if invalid
 * @param {any} value - Value to coerce
 * @param {boolean} defaultValue - Default if coercion fails
 * @returns {boolean}
 */
function coerceBoolean(value, defaultValue) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  return defaultValue;
}

module.exports = {
  loadIni,
  validateConfig,
  coerceNumber,
  coerceBoolean,
};

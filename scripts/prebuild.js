#!/usr/bin/env node

/**
 * PxC Prebuild Script
 * 
 * Reads the target .ini configuration file, validates it, resolves asset paths,
 * and generates src/generated-config.js for build-time optimization.
 * 
 * Usage:
 *   node scripts/prebuild.js [config-file]
 *   
 * If no config file is specified, defaults to config/houdini.ini
 */

const fs = require('fs');
const path = require('path');
const ini = require('ini');

// Configuration
const DEFAULT_CONFIG = 'config/houdini.ini';
const OUTPUT_FILE = 'src/generated-config.js';
const ROOT_DIR = path.resolve(__dirname, '..');

// Parse command line args
const configFile = process.argv[2] || DEFAULT_CONFIG;
const configPath = path.resolve(ROOT_DIR, configFile);

console.log(`[prebuild] Reading config: ${configFile}`);

// Check if config file exists
if (!fs.existsSync(configPath)) {
  console.error(`[prebuild] ERROR: Config file not found: ${configPath}`);
  process.exit(1);
}

// Read and parse INI file
let rawConfig;
try {
  const iniContent = fs.readFileSync(configPath, 'utf-8');
  rawConfig = ini.parse(iniContent);
} catch (error) {
  console.error(`[prebuild] ERROR: Failed to parse INI file: ${error.message}`);
  process.exit(1);
}

console.log(`[prebuild] Parsed INI successfully`);

// Validation helper functions
function validateRequired(obj, section, key, errorMsg) {
  if (!obj || obj[key] === undefined || obj[key] === null || obj[key] === '') {
    console.error(`[prebuild] ERROR: ${errorMsg || `Missing required key [${section}] ${key}`}`);
    process.exit(1);
  }
}

function validateAsset(assetPath, section, key) {
  if (!assetPath) return; // Optional asset
  
  const fullPath = path.resolve(ROOT_DIR, assetPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[prebuild] ERROR: Asset file not found: ${assetPath}`);
    console.error(`[prebuild]        Required by [${section}] ${key}`);
    console.error(`[prebuild]        Resolved path: ${fullPath}`);
    process.exit(1);
  }
}

function coerceNumber(value, defaultValue) {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function coerceBoolean(value, defaultValue) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  return defaultValue;
}

// Validate required sections
validateRequired(rawConfig, 'root', 'type', 'Missing required section: [type]');
validateRequired(rawConfig, 'root', 'display', 'Missing required section: [display]');

// Validate [type] section
validateRequired(rawConfig.type, 'type', 'style', 'Missing required key: [type] style');
validateRequired(rawConfig.type, 'type', 'mode', 'Missing required key: [type] mode');

const validModes = ['countdown', 'clock', 'stopwatch'];
if (!validModes.includes(rawConfig.type.mode)) {
  console.error(`[prebuild] ERROR: Invalid [type] mode: ${rawConfig.type.mode}`);
  console.error(`[prebuild]        Must be one of: ${validModes.join(', ')}`);
  process.exit(1);
}

// Validate style-specific section exists
const style = rawConfig.type.style;
const styleSection = style.includes('analog') ? 'analog' :
                     style.includes('led') ? 'led4' :
                     style.includes('flip') ? 'flip' :
                     style.includes('font') ? 'font' :
                     style.includes('graphic') ? 'graphic' : null;

if (!styleSection) {
  console.error(`[prebuild] ERROR: Could not determine style section for: ${style}`);
  process.exit(1);
}

validateRequired(rawConfig, 'root', styleSection, `Missing required section: [${styleSection}]`);

console.log(`[prebuild] Validating style: ${style} (section: [${styleSection}])`);

// Style-specific validation
if (styleSection === 'analog') {
  validateRequired(rawConfig.analog, 'analog', 'background');
  validateAsset(rawConfig.analog.background, 'analog', 'background');
  
  // Second hand is required
  validateRequired(rawConfig.analog, 'analog', 'second_hand.path');
  validateAsset(rawConfig.analog['second_hand.path'], 'analog', 'second_hand.path');
  
  // Minute hand is optional (only for times >= 60 seconds)
  if (rawConfig.analog['minute_hand.path']) {
    validateAsset(rawConfig.analog['minute_hand.path'], 'analog', 'minute_hand.path');
  }
  
  // Validate hint font if specified
  if (rawConfig.analog['hint.font.path']) {
    validateAsset(rawConfig.analog['hint.font.path'], 'analog', 'hint.font.path');
  }
}

// Validate display fade background image if specified
if (rawConfig.display) {
  const fadeType = rawConfig.display.fade_background_type;
  if (fadeType === 'image' && rawConfig.display.fade_background_image) {
    validateAsset(rawConfig.display.fade_background_image, 'display', 'fade_background_image');
  }
}

console.log(`[prebuild] Validation passed`);

// Apply defaults and type coercion
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

console.log(`[prebuild] Generating ${OUTPUT_FILE}`);

// Generate JavaScript module
const outputPath = path.resolve(ROOT_DIR, OUTPUT_FILE);
const outputDir = path.dirname(outputPath);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const jsContent = `// AUTO-GENERATED by scripts/prebuild.js
// Do not edit this file manually - it will be overwritten on next build
// Source: ${configFile}

const config = ${JSON.stringify(config, null, 2)};

export default config;
`;

fs.writeFileSync(outputPath, jsContent, 'utf-8');

console.log(`[prebuild] ✓ Generated config from ${configFile}`);
console.log(`[prebuild] ✓ Style: ${config.type.style}`);
console.log(`[prebuild] ✓ Mode: ${config.type.mode}`);
console.log(`[prebuild] ✓ MQTT: ${config.mqtt ? 'enabled' : 'disabled'}`);
console.log(`[prebuild] ✓ Ready to build`);

/**
 * Layout config shared by prebuild and the clock.
 * CommonJS so scripts/prebuild.js can load it.
 */

const fs = require('fs');
const path = require('path');
const {
  normalizeVolume,
  volumeToPlayback,
  buildFieldState,
  SET_LAYOUT_RESERVED,
  SET_MESSAGE_RESERVED,
  layoutByName,
  assertKnownLayout,
  safeAssetName,
} = require('./layout-runtime');

const LAYOUT_PROP_KEYS = new Set([
  'background_image',
  'background_video',
  'background_video_fallback',
  'background_color',
  'volume',
  'muted',
  'extends',
]);

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);

function quoteIniHex(iniText) {
  return String(iniText).replace(
    /^(\s*[^;#\n][^=\n]*=\s*)(#[0-9a-fA-F]{3,8})\s*$/gm,
    (_, prefix, hex) => `${prefix}"${hex}"`
  );
}

function coerceBoolean(value, defaultValue) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function findDuplicateLayout(iniText) {
  if (!iniText) return null;
  const seen = new Set();
  const re = /^\[layout\.([^\].\s]+)\]\s*$/gm;
  let match = re.exec(iniText);
  while (match) {
    if (seen.has(match[1])) return match[1];
    seen.add(match[1]);
    match = re.exec(iniText);
  }
  return null;
}

function fieldFromRaw(raw) {
  return {
    text: raw.text != null ? String(raw.text) : '',
    font: raw.font || '',
    size: raw.size || '',
    weight: raw.weight || '',
    x: raw.x || '',
    y: raw.y || '',
    left: raw.left || '',
    top: raw.top || '',
    width: raw.width || '',
    height: raw.height || '',
    align: raw.align || '',
    color: raw.color || '',
    digitWidth: raw.digit_width || '',
    lineHeight: raw.line_height || '',
  };
}

function mergeLayout(parent, child) {
  const merged = { ...parent };
  Object.keys(child).forEach((key) => {
    if (key === 'extends') return;
    if (isPlainObject(child[key]) || isPlainObject(parent[key])) {
      merged[key] = { ...(isPlainObject(parent[key]) ? parent[key] : {}), ...child[key] };
      return;
    }
    merged[key] = child[key];
  });
  delete merged.extends;
  return merged;
}

function resolveOne(name, rawLayouts, stack) {
  if (!Object.prototype.hasOwnProperty.call(rawLayouts, name)) {
    throw new Error(`missing parent: ${name}`);
  }
  if (stack.includes(name)) {
    throw new Error(`extends cycle: ${stack.concat(name).join(' -> ')}`);
  }
  const raw = rawLayouts[name];
  if (!raw || !raw.extends) return raw;
  const parent = resolveOne(raw.extends, rawLayouts, stack.concat(name));
  return mergeLayout(parent, raw);
}

function listImages(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .sort();
}

function assertFile(assetsDir, file, layoutName, key) {
  if (!file) return;
  const full = path.resolve(assetsDir, file);
  if (!full.startsWith(path.resolve(assetsDir) + path.sep) && full !== path.resolve(assetsDir)) {
    throw new Error(`Asset path escapes assets_dir: ${file} required by [layout.${layoutName}] ${key}`);
  }
  if (!fs.existsSync(full)) {
    throw new Error(`Missing asset file: ${file} required by [layout.${layoutName}] ${key}`);
  }
}

/**
 * Parse layout sections from an ini.parse result.
 * Returns null when the INI has no layouts.
 * @param {object} rawConfig
 * @param {{ iniText?: string, rootDir?: string, checkFiles?: boolean }} [options]
 */
function parseLayouts(rawConfig, options = {}) {
  const checkFiles = options.checkFiles !== false;
  const rawLayoutTable = rawConfig && rawConfig.layout;
  const hasLayouts = isPlainObject(rawLayoutTable) && Object.keys(rawLayoutTable).length > 0;
  const hasSection = rawConfig && isPlainObject(rawConfig.layouts);

  if (!hasLayouts && !hasSection) return null;
  if (!hasLayouts) {
    throw new Error('Missing layout sections: [layouts] is set but no [layout.*] sections were found');
  }

  const duplicate = findDuplicateLayout(options.iniText || '');
  if (duplicate) {
    throw new Error(`duplicate layout name: ${duplicate}`);
  }

  const settings = hasSection ? rawConfig.layouts : {};
  const assetsDir = settings.assets_dir ? String(settings.assets_dir) : '';
  if (checkFiles && !assetsDir) {
    throw new Error('Missing required key [layouts] assets_dir');
  }

  const names = Object.keys(rawLayoutTable);
  const resolved = {};
  names.forEach((name) => {
    resolved[name] = resolveOne(name, rawLayoutTable, []);
  });

  const defaultName = settings.default ? String(settings.default) : names[0];
  if (!resolved[defaultName]) {
    throw new Error(`unknown default layout: ${defaultName}`);
  }

  const layouts = {};
  const referenced = [];

  names.forEach((name) => {
    const raw = resolved[name];
    const backgroundImage = raw.background_image ? String(raw.background_image) : '';
    if (!backgroundImage) {
      throw new Error(`Missing asset file: background_image required by [layout.${name}] background_image`);
    }
    if (checkFiles) {
      assertFile(assetsDir, backgroundImage, name, 'background_image');
      if (raw.background_video) assertFile(assetsDir, String(raw.background_video), name, 'background_video');
      if (raw.background_video_fallback) {
        assertFile(assetsDir, String(raw.background_video_fallback), name, 'background_video_fallback');
      }
    }

    const fields = {};
    Object.keys(raw).forEach((key) => {
      if (LAYOUT_PROP_KEYS.has(key)) return;
      if (!isPlainObject(raw[key])) return;
      fields[key] = fieldFromRaw(raw[key]);
    });

    const fieldOrder = [];
    if (fields.time) fieldOrder.push('time');
    if (fields.hint) fieldOrder.push('hint');
    Object.keys(fields).sort().forEach((key) => {
      if (key !== 'time' && key !== 'hint') fieldOrder.push(key);
    });

    const volume = raw.volume != null && raw.volume !== ''
      ? normalizeVolume(raw.volume)
      : 100;
    if (volume === null) {
      throw new Error(`Invalid volume on [layout.${name}]: ${raw.volume}`);
    }

    referenced.push(backgroundImage);
    if (raw.background_video) referenced.push(String(raw.background_video));
    if (raw.background_video_fallback) referenced.push(String(raw.background_video_fallback));

    layouts[name] = {
      name,
      backgroundImage,
      backgroundVideo: raw.background_video ? String(raw.background_video) : '',
      backgroundVideoFallback: raw.background_video_fallback ? String(raw.background_video_fallback) : '',
      backgroundColor: raw.background_color ? String(raw.background_color) : '',
      volume,
      muted: coerceBoolean(raw.muted, false),
      fields,
      fieldOrder,
    };
  });

  const fonts = {};
  if (isPlainObject(rawConfig.font)) {
    Object.keys(rawConfig.font).forEach((name) => {
      const raw = rawConfig.font[name];
      if (!isPlainObject(raw)) return;
      fonts[name] = {
        family: raw.family || name,
        file: raw.file || '',
        weight: raw.weight || '',
      };
      if (checkFiles && fonts[name].file) {
        assertFile(assetsDir, fonts[name].file, name, 'file');
      }
    });
  }

  const scanned = checkFiles ? listImages(assetsDir) : [];
  const assets = Array.from(new Set(scanned.concat(referenced.filter((file) => IMAGE_EXT.has(path.extname(file).toLowerCase()))))).sort();

  return {
    default: defaultName,
    stageWidth: Number(settings.stage_width) || 1920,
    stageHeight: Number(settings.stage_height) || 1080,
    assetsDir,
    assets,
    layouts,
    fonts,
  };
}

module.exports = {
  quoteIniHex,
  normalizeVolume,
  volumeToPlayback,
  parseLayouts,
  buildFieldState,
  SET_LAYOUT_RESERVED,
  SET_MESSAGE_RESERVED,
  layoutByName,
  assertKnownLayout,
  safeAssetName,
};

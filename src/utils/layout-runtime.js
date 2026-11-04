/**
 * Layout helpers the browser bundle can load.
 * Parsing and file checks stay in layouts.js, which uses Node's fs.
 */

/**
 * Integer 0–200, PFx volume scale. 100 is unity.
 * @returns {number|null}
 */
function normalizeVolume(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    if (!/^-?\d+$/.test(value.trim())) return null;
    value = Number(value);
  }
  if (!Number.isInteger(value) || value < 0 || value > 200) return null;
  return value;
}

/**
 * Map PFx volume onto a media element. 0–100 is element volume.
 * 101–200 is unity on the element plus a Web Audio gain, because the
 * element cannot exceed 1.
 */
function volumeToPlayback(volume) {
  const v = normalizeVolume(volume);
  if (v === null) return null;
  if (v <= 100) return { elementVolume: v / 100, gain: 1 };
  return { elementVolume: 1, gain: v / 100 };
}

/**
 * Text shown for each field on a layout.
 * Opacity is included only when it is not 1.
 */
function buildFieldState(layout, { timeText, hintText, overrides, opacity }) {
  if (!layout) return {};
  const fields = {};
  layout.fieldOrder.forEach((name) => {
    let text = '';
    if (name === 'time') text = timeText;
    else if (name === 'hint') text = hintText || '';
    else if (overrides && Object.prototype.hasOwnProperty.call(overrides, name)) text = overrides[name];
    else text = layout.fields[name].text || '';

    const op = opacity && Object.prototype.hasOwnProperty.call(opacity, name) ? opacity[name] : 1;
    if (op !== 1) fields[name] = { text, opacity: op };
    else fields[name] = text;
  });
  return fields;
}

const SET_LAYOUT_RESERVED = new Set(['command', 'layout', 'volume']);
const SET_MESSAGE_RESERVED = new Set(['command', 'fadeTime']);

function layoutByName(layoutsConfig, name) {
  if (!layoutsConfig || !layoutsConfig.layouts) return null;
  return layoutsConfig.layouts[name] || null;
}

function assertKnownLayout(layoutsConfig, name) {
  const layout = layoutByName(layoutsConfig, name);
  if (!layout) {
    const error = new Error(`unknown layout: ${name}`);
    error.reason = 'unknown_layout';
    error.layout = name;
    error.available = layoutsConfig && layoutsConfig.layouts
      ? Object.keys(layoutsConfig.layouts)
      : [];
    throw error;
  }
  return layout;
}

function safeAssetName(file) {
  if (typeof file !== 'string' || !file.trim()) return null;
  if (file.includes('..') || file.startsWith('/') || file.includes('\\')) return null;
  return file;
}

module.exports = {
  normalizeVolume,
  volumeToPlayback,
  buildFieldState,
  SET_LAYOUT_RESERVED,
  SET_MESSAGE_RESERVED,
  layoutByName,
  assertKnownLayout,
  safeAssetName,
};

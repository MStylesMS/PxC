/**
 * Media pack helpers for PxC.
 *
 * PxC does NOT prefix a PFx-style media_dir. Each pack is a prebuilt clock
 * bundle (or URL). switchMedia loads that URL; rooms must build one site per pack.
 */

const MEDIA_ID_RE = /^[1-9][0-9]{0,8}$/;
const MEDIA_ID_STORAGE_KEY = 'pxc.mediaId';

/**
 * Sanitize a switchMedia / start mediaId.
 * Accepts a JSON number or decimal string. null / "" means clear (unset).
 * @param {*} value
 * @returns {{ ok: true, mediaId: number|null } | { ok: false }}
 */
function sanitizeMediaId(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, mediaId: null };
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || !MEDIA_ID_RE.test(String(value))) {
      return { ok: false };
    }
    return { ok: true, mediaId: value };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return { ok: true, mediaId: null };
    }
    if (!MEDIA_ID_RE.test(trimmed)) {
      return { ok: false };
    }
    return { ok: true, mediaId: Number(trimmed) };
  }

  return { ok: false };
}

/**
 * refresh defaults to false. Only JSON true is treated as true.
 * @param {*} value
 * @returns {boolean}
 */
function parseRefresh(value) {
  return value === true;
}

/**
 * Reject javascript:/data: and empty strings. Relative paths and http(s) are OK.
 * @param {*} url
 * @returns {string|null}
 */
function sanitizePackUrl(url) {
  if (typeof url !== 'string') {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return null;
  }
  return trimmed;
}

/**
 * Pull optional pack URLs from parsed INI / config.
 * Supports `[media] url` (default / cleared bundle) and `[media.1] url`.
 * @param {object} rawConfig
 * @returns {{ packs: Object<string, string>, defaultUrl: string|null }}
 */
function extractMediaPackUrls(rawConfig) {
  const packs = {};
  let defaultUrl = null;

  if (!rawConfig || typeof rawConfig !== 'object') {
    return { packs, defaultUrl };
  }

  const media = rawConfig.media;
  if (media && typeof media === 'object') {
    defaultUrl = sanitizePackUrl(media.url) || sanitizePackUrl(media.defaultUrl);

    Object.keys(media).forEach((key) => {
      if (!MEDIA_ID_RE.test(key)) {
        return;
      }
      const entry = media[key];
      const url = entry && typeof entry === 'object'
        ? sanitizePackUrl(entry.url)
        : sanitizePackUrl(entry);
      if (url) {
        packs[key] = url;
      }
    });
  }

  Object.keys(rawConfig).forEach((key) => {
    const match = /^media\.([1-9][0-9]{0,8})$/.exec(key);
    if (!match) {
      return;
    }
    const entry = rawConfig[key];
    const url = entry && typeof entry === 'object'
      ? sanitizePackUrl(entry.url)
      : sanitizePackUrl(entry);
    if (url) {
      packs[match[1]] = url;
    }
  });

  return { packs, defaultUrl };
}

/**
 * Resolve the prebuilt URL for a pack id (or the default URL when clearing).
 * Accepts extracted `{ packs, defaultUrl }` or raw INI-shaped `media`.
 * @param {object|null|undefined} mediaConfig
 * @param {number|null} mediaId
 * @returns {string|null}
 */
function lookupPackUrl(mediaConfig, mediaId) {
  if (!mediaConfig || typeof mediaConfig !== 'object') {
    return null;
  }

  if (mediaId == null) {
    return sanitizePackUrl(mediaConfig.defaultUrl) || sanitizePackUrl(mediaConfig.url);
  }

  const key = String(mediaId);
  if (mediaConfig.packs && typeof mediaConfig.packs === 'object') {
    const fromPacks = sanitizePackUrl(mediaConfig.packs[key]);
    if (fromPacks) {
      return fromPacks;
    }
  }

  const entry = mediaConfig[key];
  if (entry && typeof entry === 'object') {
    return sanitizePackUrl(entry.url);
  }
  return sanitizePackUrl(entry);
}

/**
 * Decide whether to load a pack URL.
 * refresh true → reload even if already on that id.
 * refresh false and already on that pack → no-op.
 * @param {{ currentId: number|null, nextId: number|null, refresh: boolean, url: string|null }} opts
 * @returns {'assign'|'reload'|'none'}
 */
function resolvePackNavigation({ currentId, nextId, refresh, url }) {
  if (!url) {
    return 'none';
  }

  const samePack = currentId === nextId;
  if (samePack && !refresh) {
    return 'none';
  }
  if (samePack && refresh) {
    return 'reload';
  }
  return 'assign';
}

/**
 * Navigate the kiosk browser to a prebuilt pack. Loading a new bundle may flash.
 * @param {'assign'|'reload'|'none'} kind
 * @param {string|null} url
 */
function applyPackNavigation(kind, url) {
  if (typeof window === 'undefined' || !window.location) {
    return;
  }
  if (kind === 'reload' && typeof window.location.reload === 'function') {
    window.location.reload();
    return;
  }
  if (kind === 'assign' && url && typeof window.location.assign === 'function') {
    window.location.assign(url);
  }
}

function readStoredMediaId() {
  try {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const parsed = sanitizeMediaId(sessionStorage.getItem(MEDIA_ID_STORAGE_KEY));
    return parsed.ok ? parsed.mediaId : null;
  } catch (_err) {
    return null;
  }
}

function persistMediaId(mediaId) {
  try {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    if (mediaId == null) {
      sessionStorage.removeItem(MEDIA_ID_STORAGE_KEY);
    } else {
      sessionStorage.setItem(MEDIA_ID_STORAGE_KEY, String(mediaId));
    }
  } catch (_err) {
    // Private mode / disabled storage — pack still applies in this page lifetime.
  }
}

module.exports = {
  MEDIA_ID_RE,
  MEDIA_ID_STORAGE_KEY,
  sanitizeMediaId,
  parseRefresh,
  sanitizePackUrl,
  extractMediaPackUrls,
  lookupPackUrl,
  resolvePackNavigation,
  applyPackNavigation,
  readStoredMediaId,
  persistMediaId,
};

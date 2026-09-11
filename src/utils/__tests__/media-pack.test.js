import {
  sanitizeMediaId,
  parseRefresh,
  sanitizePackUrl,
  extractMediaPackUrls,
  lookupPackUrl,
  resolvePackNavigation,
  persistMediaId,
  readStoredMediaId,
  MEDIA_ID_STORAGE_KEY,
} from '../media-pack';

describe('sanitizeMediaId', () => {
  test('accepts positive integers and decimal strings', () => {
    expect(sanitizeMediaId(1)).toEqual({ ok: true, mediaId: 1 });
    expect(sanitizeMediaId(2)).toEqual({ ok: true, mediaId: 2 });
    expect(sanitizeMediaId('2')).toEqual({ ok: true, mediaId: 2 });
    expect(sanitizeMediaId(999999999)).toEqual({ ok: true, mediaId: 999999999 });
  });

  test('clears on null or empty string', () => {
    expect(sanitizeMediaId(null)).toEqual({ ok: true, mediaId: null });
    expect(sanitizeMediaId('')).toEqual({ ok: true, mediaId: null });
    expect(sanitizeMediaId('  ')).toEqual({ ok: true, mediaId: null });
  });

  test('rejects 0, leading zeros, slugs, and path junk', () => {
    expect(sanitizeMediaId(0).ok).toBe(false);
    expect(sanitizeMediaId('0').ok).toBe(false);
    expect(sanitizeMediaId('01').ok).toBe(false);
    expect(sanitizeMediaId('v1').ok).toBe(false);
    expect(sanitizeMediaId('../etc').ok).toBe(false);
    expect(sanitizeMediaId(2.5).ok).toBe(false);
    expect(sanitizeMediaId(-1).ok).toBe(false);
    expect(sanitizeMediaId({}).ok).toBe(false);
  });
});

describe('parseRefresh', () => {
  test('only JSON true is refresh', () => {
    expect(parseRefresh(true)).toBe(true);
    expect(parseRefresh(false)).toBe(false);
    expect(parseRefresh(undefined)).toBe(false);
    expect(parseRefresh('true')).toBe(false);
    expect(parseRefresh(1)).toBe(false);
  });
});

describe('extractMediaPackUrls / lookupPackUrl', () => {
  test('reads nested [media.N] url and optional default url', () => {
    const extracted = extractMediaPackUrls({
      media: {
        url: '/clock/',
        1: { url: '/clock/en/' },
        2: { url: '/clock/es/' },
      },
    });

    expect(extracted.defaultUrl).toBe('/clock/');
    expect(extracted.packs['1']).toBe('/clock/en/');
    expect(extracted.packs['2']).toBe('/clock/es/');
    expect(lookupPackUrl(extracted, 2)).toBe('/clock/es/');
    expect(lookupPackUrl(extracted, null)).toBe('/clock/');
  });

  test('reads flat media.N keys if the INI parser did not nest them', () => {
    const extracted = extractMediaPackUrls({
      'media.3': { url: 'https://clock.example/3/' },
    });
    expect(extracted.packs['3']).toBe('https://clock.example/3/');
  });

  test('ignores unsafe and empty URLs', () => {
    expect(sanitizePackUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizePackUrl('')).toBeNull();
    const extracted = extractMediaPackUrls({
      media: {
        1: { url: 'javascript:alert(1)' },
        2: { url: '' },
      },
    });
    expect(extracted.packs['1']).toBeUndefined();
    expect(extracted.packs['2']).toBeUndefined();
    expect(lookupPackUrl(extracted, 1)).toBeNull();
  });

  test('looks up raw INI-shaped media without extract', () => {
    expect(lookupPackUrl({ 4: { url: '/pxc/4/' } }, 4)).toBe('/pxc/4/');
  });
});

describe('resolvePackNavigation', () => {
  test('no URL means no navigation', () => {
    expect(resolvePackNavigation({
      currentId: null, nextId: 2, refresh: true, url: null,
    })).toBe('none');
  });

  test('refresh false and already on that pack is a no-op', () => {
    expect(resolvePackNavigation({
      currentId: 2, nextId: 2, refresh: false, url: '/pxc/2/',
    })).toBe('none');
  });

  test('refresh true reloads even if already on that pack', () => {
    expect(resolvePackNavigation({
      currentId: 2, nextId: 2, refresh: true, url: '/pxc/2/',
    })).toBe('reload');
  });

  test('switching packs assigns the new URL', () => {
    expect(resolvePackNavigation({
      currentId: 1, nextId: 2, refresh: false, url: '/pxc/2/',
    })).toBe('assign');
  });
});

describe('persistMediaId', () => {
  afterEach(() => {
    sessionStorage.removeItem(MEDIA_ID_STORAGE_KEY);
  });

  test('round-trips a pack id and clears on null', () => {
    persistMediaId(2);
    expect(readStoredMediaId()).toBe(2);
    persistMediaId(null);
    expect(readStoredMediaId()).toBeNull();
  });
});

const mockStore = new Map<string, unknown>();

jest.mock('../StorageService', () => ({
  StorageService: {
    load: jest.fn(async (key: string, fallback: unknown) =>
      mockStore.has(key) ? mockStore.get(key) : fallback
    ),
    save: jest.fn(async (key: string, value: unknown) => {
      mockStore.set(key, value);
    }),
    remove: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
  },
}));

const {
  JamendoClient,
  JamendoConfigError,
  JamendoRequestError,
  mapTrack,
} = require('../JamendoClient');

const payload = (overrides: Record<string, unknown> = {}) => ({
  id: '1234',
  name: 'Night Drive',
  artist_name: 'The Relaxers',
  album_name: 'Chill Vibes',
  duration: 210,
  audio: 'https://prod-1.storage.jamendo.com/1234.mp3',
  audiodownload: 'https://prod-1.storage.jamendo.com/download/1234.mp3',
  audiodownload_allowed: true,
  image: 'https://usercontent.jamendo.com/1234.jpg',
  shareurl: 'https://www.jamendo.com/track/1234',
  license_ccurl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  ...overrides,
});

const respondWith = (results: unknown[], init: { ok?: boolean; status?: number; headers?: unknown } = {}) =>
  Promise.resolve({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => ({ headers: init.headers ?? { status: 'success' }, results }),
  });

const mockFetch = jest.fn();

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID = 'test-client-id';
});

describe('mapTrack', () => {
  it('namespaces the id and converts seconds to milliseconds', () => {
    const track = mapTrack(payload());

    expect(track).toMatchObject({
      id: 'jamendo:1234',
      source: 'jamendo',
      title: 'Night Drive',
      artist: 'The Relaxers',
      // Jamendo reports seconds; everything above the audio layer is in ms.
      duration: 210000,
      sourceUrl: 'https://www.jamendo.com/track/1234',
    });
  });

  it('drops the download url when the artist has opted out', () => {
    // Jamendo blanks `audiodownload` and 404s the file endpoint in that case,
    // so keeping the URL would produce a download button that cannot work.
    const track = mapTrack(payload({ audiodownload_allowed: false, audiodownload: '' }));

    expect(track.downloadAllowed).toBe(false);
    expect(track.downloadUri).toBeUndefined();
  });

  it('does not trust a download url that contradicts the flag', () => {
    const track = mapTrack(payload({ audiodownload_allowed: false }));

    expect(track.downloadUri).toBeUndefined();
  });

  it('rejects entries with nothing playable', () => {
    expect(mapTrack(payload({ audio: undefined }))).toBeNull();
    expect(mapTrack(payload({ id: undefined }))).toBeNull();
  });

  it('falls back for missing metadata rather than rendering blanks', () => {
    const track = mapTrack(payload({ name: '', artist_name: undefined, album_name: '' }));

    expect(track).toMatchObject({ title: 'Untitled', artist: 'Unknown Artist' });
    expect(track.album).toBeUndefined();
  });

  it('carries the licence url through for the attribution UI', () => {
    expect(mapTrack(payload()).licenseUrl).toBe('http://creativecommons.org/licenses/by-nc-nd/3.0/');
  });
});

describe('requests', () => {
  it('asks for mp32 rather than the 96 kbps default', async () => {
    mockFetch.mockReturnValue(respondWith([payload()]));

    await JamendoClient.searchTracks('night');

    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain('audioformat=mp32');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('namesearch=night');
  });

  it('fails with a clear error when no client id is configured', async () => {
    delete process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID;

    await expect(JamendoClient.popularTracks()).rejects.toBeInstanceOf(JamendoConfigError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips the network entirely for an empty query', async () => {
    const result = await JamendoClient.searchTracks('   ');

    expect(result.tracks).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('serves a repeated request from cache, to protect the monthly quota', async () => {
    mockFetch.mockReturnValue(respondWith([payload()]));

    await JamendoClient.searchTracks('night');
    await JamendoClient.searchTracks('night');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('treats a different page as a different request', async () => {
    mockFetch.mockReturnValue(respondWith([payload()]));

    await JamendoClient.searchTracks('night', 0);
    await JamendoClient.searchTracks('night', 1);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('reports rate limiting in language a user can act on', async () => {
    mockFetch.mockReturnValue(respondWith([], { ok: false, status: 429 }));

    await expect(JamendoClient.popularTracks()).rejects.toThrow(/too many requests/i);
  });

  it('surfaces an error the API reports inside a 200 response', async () => {
    // Jamendo signals failure in the body, so an ok response is not enough.
    mockFetch.mockReturnValue(
      respondWith([], { headers: { status: 'failed', error_message: 'Your credits are exhausted' } })
    );

    await expect(JamendoClient.popularTracks()).rejects.toThrow('Your credits are exhausted');
  });

  it('turns a network failure into a readable message', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await expect(JamendoClient.popularTracks()).rejects.toBeInstanceOf(JamendoRequestError);
  });

  it('lets an abort propagate so a superseded search can be told apart from a failure', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    await expect(JamendoClient.popularTracks()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('reports whether more pages may exist', async () => {
    mockFetch.mockReturnValue(respondWith([payload()]));

    const page = await JamendoClient.searchTracks('night');

    // One result against a page size of 50 means the listing is exhausted.
    expect(page.hasMore).toBe(false);
    expect(page.tracks).toHaveLength(1);
  });
});

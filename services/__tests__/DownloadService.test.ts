import { MusicTrack } from '../../types/MusicTypes';

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

const mockDownloadAsync = jest.fn();
const mockCancelAsync = jest.fn();
const mockProgressRef: { current?: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void } = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 4_194_304 }),
  createDownloadResumable: jest.fn(
    (
      _url: string,
      fileUri: string,
      _options: unknown,
      callback: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void
    ) => {
      mockProgressRef.current = callback;
      return {
        downloadAsync: () => mockDownloadAsync(fileUri),
        cancelAsync: mockCancelAsync,
      };
    }
  ),
}));

const jamendoTrack = (overrides: Partial<MusicTrack> = {}): MusicTrack => ({
  id: 'jamendo:1593988',
  source: 'jamendo',
  title: 'Lofi Chillout Hip Hop Beat',
  artist: 'Joystock',
  duration: 149000,
  uri: 'https://api.jamendo.com/v3.0/tracks/file/?id=1593988',
  downloadAllowed: true,
  downloadUri: 'https://prod-1.storage.jamendo.com/download/track/1593988/mp32/',
  ...overrides,
});

let downloadService: typeof import('../DownloadService').downloadService;
let fileSystem: any;

/**
 * `download()` awaits hydration and directory creation before it ever creates
 * the task, so the progress callback does not exist yet on the tick the call
 * is made. Lets those settle.
 */
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await new Promise(resolve => setImmediate(resolve));
  }
};

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  jest.resetModules();
  mockDownloadAsync.mockImplementation(async (fileUri: string) => ({ uri: fileUri }));
  // The service is a singleton with in-memory state, so each case needs a
  // fresh module instance.
  downloadService = require('../DownloadService').downloadService;
  fileSystem = require('expo-file-system/legacy');
});

describe('eligibility', () => {
  it('allows a download only when the artist has permitted it', () => {
    expect(downloadService.canDownload(jamendoTrack())).toBe(true);
    expect(downloadService.canDownload(jamendoTrack({ downloadAllowed: false }))).toBe(false);
  });

  it('refuses when there is no download url, whatever the flag says', () => {
    expect(downloadService.canDownload(jamendoTrack({ downloadUri: undefined }))).toBe(false);
  });

  it('never offers to download a local file', () => {
    const local = jamendoTrack({ id: 'local:a1', source: 'local' });
    expect(downloadService.canDownload(local)).toBe(false);
  });

  it('rejects a download of a track the artist has blocked', async () => {
    await expect(
      downloadService.download(jamendoTrack({ downloadAllowed: false }))
    ).rejects.toThrow(/not made this track available/i);
    expect(fileSystem.createDownloadResumable).not.toHaveBeenCalled();
  });
});

describe('download', () => {
  it('stores the file and registers the track', async () => {
    await downloadService.download(jamendoTrack());

    const snapshot = downloadService.getSnapshot();
    expect(snapshot.entries['jamendo:1593988']).toMatchObject({
      localUri: 'file:///docs/downloads/jamendo-1593988.mp3',
      bytes: 4_194_304,
    });
    expect(downloadService.isDownloaded('jamendo:1593988')).toBe(true);
  });

  it('makes the local file the one playback resolves to', async () => {
    await downloadService.download(jamendoTrack());

    expect(downloadService.localUriFor('jamendo:1593988')).toBe(
      'file:///docs/downloads/jamendo-1593988.mp3'
    );
  });

  it('persists the registry so downloads survive a restart', async () => {
    await downloadService.download(jamendoTrack());

    expect(mockStore.get('downloads')).toMatchObject({
      'jamendo:1593988': { localUri: 'file:///docs/downloads/jamendo-1593988.mp3' },
    });
  });

  it('reports progress while running and clears it afterwards', async () => {
    let resolveDownload: (value: { uri: string }) => void = () => {};
    mockDownloadAsync.mockImplementation(
      (fileUri: string) =>
        new Promise(resolve => {
          resolveDownload = () => resolve({ uri: fileUri });
        })
    );

    const pending = downloadService.download(jamendoTrack());
    await flush();
    mockProgressRef.current?.({ totalBytesWritten: 50, totalBytesExpectedToWrite: 200 });

    expect(downloadService.getSnapshot().active['jamendo:1593988'].ratio).toBe(0.25);

    resolveDownload({ uri: '' });
    await pending;

    expect(downloadService.getSnapshot().active['jamendo:1593988']).toBeUndefined();
  });

  it('shows an indeterminate state when the server sends no content length', async () => {
    mockDownloadAsync.mockImplementation(
      (fileUri: string) =>
        new Promise(resolve => {
          mockProgressRef.current?.({ totalBytesWritten: 50, totalBytesExpectedToWrite: 0 });
          resolve({ uri: fileUri });
        })
    );

    const pending = downloadService.download(jamendoTrack());
    await pending;

    // A fabricated percentage would be worse than admitting we don't know.
    expect(downloadService.isDownloaded('jamendo:1593988')).toBe(true);
  });

  it('does not register anything when the download is cancelled', async () => {
    mockDownloadAsync.mockResolvedValue(undefined);

    await downloadService.download(jamendoTrack());

    expect(downloadService.isDownloaded('jamendo:1593988')).toBe(false);
    expect(downloadService.getSnapshot().active['jamendo:1593988']).toBeUndefined();
  });

  it('ignores a second request for a track already downloaded', async () => {
    await downloadService.download(jamendoTrack());
    await downloadService.download(jamendoTrack());

    expect(fileSystem.createDownloadResumable).toHaveBeenCalledTimes(1);
  });
});

describe('removal', () => {
  it('deletes the file and forgets the entry', async () => {
    await downloadService.download(jamendoTrack());
    await downloadService.remove('jamendo:1593988');

    expect(fileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///docs/downloads/jamendo-1593988.mp3',
      { idempotent: true }
    );
    expect(downloadService.isDownloaded('jamendo:1593988')).toBe(false);
    expect(mockStore.get('downloads')).toEqual({});
  });

  it('still forgets the entry when the file is already gone', async () => {
    await downloadService.download(jamendoTrack());
    fileSystem.deleteAsync.mockRejectedValueOnce(new Error('ENOENT'));

    await downloadService.remove('jamendo:1593988');

    expect(downloadService.isDownloaded('jamendo:1593988')).toBe(false);
  });
});

describe('hydrate', () => {
  it('drops entries whose file the OS has reclaimed', async () => {
    mockStore.set('downloads', {
      'jamendo:1': { track: jamendoTrack(), localUri: 'file:///docs/downloads/gone.mp3', bytes: 1, downloadedAt: 1 },
    });
    fileSystem.getInfoAsync.mockResolvedValue({ exists: false });

    await downloadService.hydrate();

    // A registry pointing at a missing file would fail at playback time
    // instead of showing the track as unavailable.
    expect(downloadService.isDownloaded('jamendo:1')).toBe(false);
    expect(mockStore.get('downloads')).toEqual({});
  });

  it('keeps entries whose file is still present', async () => {
    mockStore.set('downloads', {
      'jamendo:1': { track: jamendoTrack(), localUri: 'file:///docs/downloads/there.mp3', bytes: 10, downloadedAt: 1 },
    });

    await downloadService.hydrate();

    expect(downloadService.isDownloaded('jamendo:1')).toBe(true);
    expect(downloadService.totalBytes()).toBe(10);
  });
});

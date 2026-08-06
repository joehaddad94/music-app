import { Playlist } from '../../types/MusicTypes';

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
  CURRENT_SCHEMA_VERSION,
  FAVORITES_KEY,
  PLAYLISTS_KEY,
  SCHEMA_VERSION_KEY,
  loadAndMigrateLibrary,
  migrateLibraryData,
} = require('../LibraryMigrations');
const { StorageService } = require('../StorageService');

const playlist = (trackIds: string[]): Playlist => ({
  id: 'p1',
  name: 'Road trip',
  trackIds,
  createdAt: 1,
});

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('migrateLibraryData', () => {
  it('namespaces bare ids as local', () => {
    const result = migrateLibraryData(0, {
      favorites: ['1', '2'],
      playlists: [playlist(['1', '3'])],
    });

    expect(result.favorites).toEqual(['local:1', 'local:2']);
    expect(result.playlists[0].trackIds).toEqual(['local:1', 'local:3']);
  });

  it('is idempotent, because a crash between writing data and writing the version replays it', () => {
    const once = migrateLibraryData(0, {
      favorites: ['1'],
      playlists: [playlist(['1'])],
    });
    const twice = migrateLibraryData(0, once);

    expect(twice).toEqual(once);
  });

  it('collapses a bare id and its namespaced twin into one entry', () => {
    const result = migrateLibraryData(0, {
      favorites: ['1', 'local:1'],
      playlists: [playlist(['2', 'local:2'])],
    });

    expect(result.favorites).toEqual(['local:1']);
    expect(result.playlists[0].trackIds).toEqual(['local:2']);
  });

  it('preserves playlist metadata', () => {
    const result = migrateLibraryData(0, { favorites: [], playlists: [playlist(['1'])] });

    expect(result.playlists[0]).toMatchObject({ id: 'p1', name: 'Road trip', createdAt: 1 });
  });
});

describe('loadAndMigrateLibrary', () => {
  it('migrates and persists data written before namespacing existed', async () => {
    mockStore.set(FAVORITES_KEY, ['1', '2']);
    mockStore.set(PLAYLISTS_KEY, [playlist(['1'])]);

    const result = await loadAndMigrateLibrary();

    expect(result.favorites).toEqual(['local:1', 'local:2']);
    expect(mockStore.get(FAVORITES_KEY)).toEqual(['local:1', 'local:2']);
    expect(mockStore.get(SCHEMA_VERSION_KEY)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('does not rewrite storage on a normal launch', async () => {
    mockStore.set(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
    mockStore.set(FAVORITES_KEY, ['local:1']);
    mockStore.set(PLAYLISTS_KEY, []);

    const result = await loadAndMigrateLibrary();

    expect(result.favorites).toEqual(['local:1']);
    expect(StorageService.save).not.toHaveBeenCalled();
  });

  it('writes the version marker only after the data it describes', async () => {
    mockStore.set(FAVORITES_KEY, ['1']);
    mockStore.set(PLAYLISTS_KEY, []);

    await loadAndMigrateLibrary();

    const savedKeys = (StorageService.save as jest.Mock).mock.calls.map(call => call[0]);
    expect(savedKeys.indexOf(SCHEMA_VERSION_KEY)).toBeGreaterThan(savedKeys.indexOf(FAVORITES_KEY));
  });

  it('starts clean when nothing has been stored yet', async () => {
    const result = await loadAndMigrateLibrary();

    expect(result).toEqual({ favorites: [], playlists: [] });
  });
});

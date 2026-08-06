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

// The durable-url rewrite is covered by its own suite; keep this one focused
// on ordering and capping.
jest.mock('../MusicSources', () => ({
  toDurableTrack: (track: unknown) => track,
}));

const track = (id: string): MusicTrack => ({
  id,
  source: 'jamendo',
  title: id,
  artist: 'Someone',
  duration: 1000,
  uri: `https://example.test/${id}`,
});

let recentlyPlayed: typeof import('../RecentlyPlayed').recentlyPlayed;

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  jest.resetModules();
  recentlyPlayed = require('../RecentlyPlayed').recentlyPlayed;
});

describe('recentlyPlayed', () => {
  it('puts the newest track first', async () => {
    await recentlyPlayed.record(track('a'));
    await recentlyPlayed.record(track('b'));

    expect(recentlyPlayed.getSnapshot().map(t => t.id)).toEqual(['b', 'a']);
  });

  it('moves a replayed track to the front instead of duplicating it', async () => {
    await recentlyPlayed.record(track('a'));
    await recentlyPlayed.record(track('b'));
    await recentlyPlayed.record(track('a'));

    expect(recentlyPlayed.getSnapshot().map(t => t.id)).toEqual(['a', 'b']);
  });

  it('caps the list so it cannot grow without bound', async () => {
    for (let i = 0; i < 40; i++) {
      await recentlyPlayed.record(track(`t${i}`));
    }

    const snapshot = recentlyPlayed.getSnapshot();
    expect(snapshot).toHaveLength(30);
    expect(snapshot[0].id).toBe('t39');
  });

  it('persists across a restart', async () => {
    await recentlyPlayed.record(track('a'));

    jest.resetModules();
    const reloaded = require('../RecentlyPlayed').recentlyPlayed;

    expect(await reloaded.hydrate()).toHaveLength(1);
  });

  it('notifies subscribers when something is recorded', async () => {
    const listener = jest.fn();
    recentlyPlayed.subscribe(listener);

    await recentlyPlayed.record(track('a'));

    expect(listener).toHaveBeenCalled();
  });

  it('clears the list', async () => {
    await recentlyPlayed.record(track('a'));
    await recentlyPlayed.clear();

    expect(recentlyPlayed.getSnapshot()).toEqual([]);
  });
});

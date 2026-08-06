import type { MusicTrack } from '../../types/MusicTypes';

/**
 * Unit tests for the playback service.
 *
 * expo-audio and expo-media-library are mocked so these run in plain Node with
 * no native module and no device — the focus is the queue/repeat/shuffle logic
 * and the seconds-to-milliseconds boundary introduced by the expo-audio
 * migration.
 */

type StatusListener = (status: Record<string, unknown>) => void;

const mockPlayerRef: { current: any } = { current: null };
const mockStatusListenerRef: { current: StatusListener | null } = { current: null };

function createMockPlayer() {
  return {
    volume: 1,
    loop: false,
    playing: false,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    setActiveForLockScreen: jest.fn(),
    updateLockScreenMetadata: jest.fn(),
    clearLockScreenControls: jest.fn(),
    addListener: jest.fn((_event: string, cb: StatusListener) => {
      mockStatusListenerRef.current = cb;
      return { remove: jest.fn() };
    }),
  };
}

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayerRef.current),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getAssetsAsync: jest.fn().mockResolvedValue({ assets: [] }),
  MediaType: { audio: 'audio' },
  SortBy: { creationTime: 'creationTime' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 34 },
  PermissionsAndroid: {
    request: jest.fn().mockResolvedValue('granted'),
    PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
  },
}));

const makeTracks = (count: number): MusicTrack[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `local:track-${i}`,
    source: 'local' as const,
    title: `Track ${i}`,
    artist: `Artist ${i}`,
    album: `Album ${i}`,
    duration: 180000,
    uri: `file:///music/track-${i}.mp3`,
  }));

/** Lets queued promise callbacks (including the auto-advance chain) settle. */
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await new Promise(resolve => setImmediate(resolve));
  }
};

const emitStatus = (overrides: Record<string, unknown> = {}) => {
  mockStatusListenerRef.current?.({
    currentTime: 0,
    duration: 0,
    playing: false,
    didJustFinish: false,
    loop: false,
    isLoaded: true,
    ...overrides,
  });
};

describe('MusicService', () => {
  let service: typeof import('../MusicService').musicService;
  let mediaLibrary: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPlayerRef.current = createMockPlayer();
    mockStatusListenerRef.current = null;
    (global as any).__DEV__ = true;

    mediaLibrary = require('expo-media-library');
    mediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mediaLibrary.getAssetsAsync.mockResolvedValue({ assets: [] });

    service = require('../MusicService').musicService;
  });

  describe('shuffle queue anchoring', () => {
    it('pins the shuffled queue to the newly tapped track, not the one already playing', async () => {
      const tracks = makeTracks(50);

      // Something is already playing, and shuffle is on.
      service.setQueue(tracks, 0, tracks[0]);
      await service.loadTrack(tracks[0]);
      service.toggleShuffle();

      // The user now taps a different track.
      const tapped = tracks[30];
      service.setQueue(tracks, 30, tapped);

      const state = service.getPlaybackState();
      expect(state.currentIndex).toBe(0);
      expect(state.queue[state.currentIndex].id).toBe(tapped.id);
    });

    it('keeps currentIndex pointing at the anchor across many shuffles', async () => {
      const tracks = makeTracks(30);

      for (let run = 0; run < 40; run++) {
        jest.resetModules();
        mockPlayerRef.current = createMockPlayer();
        const fresh = require('../MusicService').musicService;

        fresh.setQueue(tracks, 0, tracks[0]);
        await fresh.loadTrack(tracks[0]);
        fresh.toggleShuffle();

        const anchor = tracks[(run * 7) % tracks.length];
        fresh.setQueue(tracks, tracks.indexOf(anchor), anchor);

        const state = fresh.getPlaybackState();
        expect(state.queue[state.currentIndex].id).toBe(anchor.id);
        expect(state.queue).toHaveLength(tracks.length);
      }
    });

    it('restores the original order and index when shuffle is turned off', async () => {
      const tracks = makeTracks(20);
      service.setQueue(tracks, 5, tracks[5]);
      await service.loadTrack(tracks[5]);

      service.toggleShuffle();
      service.toggleShuffle();

      const state = service.getPlaybackState();
      expect(state.shuffleMode).toBe(false);
      expect(state.queue.map(t => t.id)).toEqual(tracks.map(t => t.id));
      expect(state.queue[state.currentIndex].id).toBe(tracks[5].id);
    });
  });

  describe('time unit conversion (expo-audio reports seconds)', () => {
    it('converts position and duration from seconds to milliseconds', async () => {
      await service.loadTrack(makeTracks(1)[0]);

      emitStatus({ currentTime: 12.5, duration: 200, playing: true });

      const state = service.getPlaybackState();
      expect(state.position).toBe(12500);
      expect(state.duration).toBe(200000);
      expect(state.isPlaying).toBe(true);
    });

    it('keeps the scanned duration while the player still reports 0', async () => {
      const track = makeTracks(1)[0];
      await service.loadTrack(track);

      emitStatus({ currentTime: 0, duration: 0 });

      expect(service.getPlaybackState().duration).toBe(track.duration);
    });

    it('seeks in seconds while accepting milliseconds', async () => {
      await service.loadTrack(makeTracks(1)[0]);

      await service.seekTo(30000);

      expect(mockPlayerRef.current.seekTo).toHaveBeenCalledWith(30);
      expect(service.getPlaybackState().position).toBe(30000);
    });
  });

  describe('stop', () => {
    it('clears the now-playing state so the mini player dismisses', async () => {
      const tracks = makeTracks(3);
      service.setQueue(tracks, 0, tracks[0]);
      await service.loadTrack(tracks[0]);

      await service.stop();

      const state = service.getPlaybackState();
      expect(state.currentTrack).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.position).toBe(0);
      expect(state.currentIndex).toBe(-1);
      expect(mockPlayerRef.current.clearLockScreenControls).toHaveBeenCalled();
    });
  });

  describe('repeat modes', () => {
    it('drives repeat-one through the native loop flag', async () => {
      await service.loadTrack(makeTracks(1)[0]);

      service.setRepeatMode('one');
      expect(mockPlayerRef.current.loop).toBe(true);

      service.setRepeatMode('all');
      expect(mockPlayerRef.current.loop).toBe(false);
    });

    it('wraps to the first track at the end of the queue with repeat all', async () => {
      const tracks = makeTracks(3);
      service.setQueue(tracks, 2, tracks[2]);
      await service.loadTrack(tracks[2]);
      service.setRepeatMode('all');

      await service.playNext();

      expect(service.getPlaybackState().currentTrack?.id).toBe(tracks[0].id);
    });

    it('stops at the end of the queue with repeat off', async () => {
      const tracks = makeTracks(2);
      service.setQueue(tracks, 1, tracks[1]);
      await service.loadTrack(tracks[1]);

      await service.playNext();

      expect(service.getPlaybackState().currentTrack).toBeNull();
    });
  });

  describe('auto advance', () => {
    it('advances to the next track when one finishes', async () => {
      const tracks = makeTracks(3);
      service.setQueue(tracks, 0, tracks[0]);
      await service.loadTrack(tracks[0]);

      emitStatus({ didJustFinish: true });
      await flush();

      expect(service.getPlaybackState().currentTrack?.id).toBe(tracks[1].id);
    });

    it('does not advance while the track is looping (repeat one)', async () => {
      const tracks = makeTracks(3);
      service.setQueue(tracks, 0, tracks[0]);
      await service.loadTrack(tracks[0]);
      service.setRepeatMode('one');

      emitStatus({ didJustFinish: true, loop: true });
      await flush();

      expect(service.getPlaybackState().currentTrack?.id).toBe(tracks[0].id);
    });

    it('does not double-advance when two finish events arrive', async () => {
      const tracks = makeTracks(5);
      service.setQueue(tracks, 0, tracks[0]);
      await service.loadTrack(tracks[0]);

      emitStatus({ didJustFinish: true });
      emitStatus({ didJustFinish: true });
      await flush();

      expect(service.getPlaybackState().currentTrack?.id).toBe(tracks[1].id);
    });
  });

  describe('previous', () => {
    it('restarts the current track when more than 3 seconds in', async () => {
      const tracks = makeTracks(3);
      service.setQueue(tracks, 1, tracks[1]);
      await service.loadTrack(tracks[1]);
      emitStatus({ currentTime: 5 });

      await service.playPrevious();

      expect(mockPlayerRef.current.seekTo).toHaveBeenCalledWith(0);
      expect(service.getPlaybackState().currentTrack?.id).toBe(tracks[1].id);
    });

    it('moves to the previous track when near the start', async () => {
      const tracks = makeTracks(3);
      service.setQueue(tracks, 1, tracks[1]);
      await service.loadTrack(tracks[1]);
      emitStatus({ currentTime: 1 });

      await service.playPrevious();

      expect(service.getPlaybackState().currentTrack?.id).toBe(tracks[0].id);
    });
  });

  describe('lock screen', () => {
    it('publishes now-playing metadata when a track loads', async () => {
      const track = makeTracks(1)[0];

      await service.loadTrack(track);

      expect(mockPlayerRef.current.setActiveForLockScreen).toHaveBeenCalledWith(
        true,
        expect.objectContaining({
          title: track.title,
          artist: track.artist,
          albumTitle: track.album,
        }),
        expect.objectContaining({ showSeekForward: true, showSeekBackward: true })
      );
    });

    it('reuses a single native player across track changes', async () => {
      const tracks = makeTracks(3);
      const { createAudioPlayer } = require('expo-audio');

      await service.loadTrack(tracks[0]);
      await service.loadTrack(tracks[1]);
      await service.loadTrack(tracks[2]);

      expect(createAudioPlayer).toHaveBeenCalledTimes(1);
      expect(mockPlayerRef.current.replace).toHaveBeenCalledTimes(2);
    });
  });

  describe('volume', () => {
    it('clamps to the 0..1 range and applies to the player', async () => {
      await service.loadTrack(makeTracks(1)[0]);

      await service.setVolume(0.4);
      expect(mockPlayerRef.current.volume).toBe(0.4);

      await service.setVolume(5);
      expect(service.getPlaybackState().volume).toBe(1);

      await service.setVolume(-2);
      expect(service.getPlaybackState().volume).toBe(0);
    });

    it('reapplies volume after a track change', async () => {
      const tracks = makeTracks(2);
      await service.loadTrack(tracks[0]);
      await service.setVolume(0.25);

      await service.loadTrack(tracks[1]);

      expect(mockPlayerRef.current.volume).toBe(0.25);
    });
  });

  describe('scanMusicFiles', () => {
    it('requests audio-only permission, not photos and videos', async () => {
      await service.scanMusicFiles();

      expect(mediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(false, ['audio']);
    });

    it('maps assets to tracks with millisecond durations', async () => {
      mediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [
          { id: 'a1', filename: 'Song One.mp3', duration: 210, uri: 'file:///a1.mp3' },
          { id: 'a2', filename: 'notes.txt', duration: 0, uri: 'file:///a2.txt' },
        ],
      });

      const result = await service.scanMusicFiles();

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0]).toMatchObject({
        // Namespaced, so a MediaLibrary asset id can never collide with a
        // Jamendo track id in persisted favorites or playlists.
        id: 'local:a1',
        source: 'local',
        title: 'Song One',
        duration: 210000,
      });
      expect(result.notice).toBeNull();
    });

    it('reports permission denial instead of failing silently', async () => {
      mediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await service.scanMusicFiles();

      expect(result.notice).toBeTruthy();
      expect(result.notice).toMatch(/permission denied/i);
    });

    it('never serves sample tracks in a release build', async () => {
      (global as any).__DEV__ = false;
      jest.resetModules();
      mockPlayerRef.current = createMockPlayer();
      const media = require('expo-media-library');
      media.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      const releaseService = require('../MusicService').musicService;

      const result = await releaseService.scanMusicFiles();

      expect(result.tracks).toHaveLength(0);
      expect(result.notice).toMatch(/Settings/i);
    });

    it('falls back to clearly labelled sample tracks in development', async () => {
      mediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await service.scanMusicFiles();

      expect(result.tracks.length).toBeGreaterThan(0);
      expect(result.notice).toMatch(/sample tracks/i);
    });

    it('returns an empty library without a notice when no audio files exist', async () => {
      mediaLibrary.getAssetsAsync.mockResolvedValue({ assets: [] });

      const result = await service.scanMusicFiles();

      expect(result.tracks).toHaveLength(0);
      expect(result.notice).toBeNull();
    });
  });
});

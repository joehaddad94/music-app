import {
  AudioPlayer,
  AudioSource,
  AudioStatus,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';
import * as MediaLibrary from 'expo-media-library';
import { PermissionsAndroid, Platform } from 'react-native';
import { MusicTrack, PlaybackState, ShuffleMode } from '../types/MusicTypes';
import { makeTrackId } from '../utils/trackId';
import { downloadService } from './DownloadService';
import { recentlyPlayed } from './RecentlyPlayed';
import { interleave, smartShuffle } from './SmartShuffle';

/** Android 13 (API 33) is where POST_NOTIFICATIONS became a runtime permission. */
const ANDROID_TIRAMISU = 33;

/**
 * Result of a library scan. `notice` carries a non-fatal, user-facing
 * explanation (permission denied, sample data in use) so the UI can say what
 * happened instead of silently substituting fake tracks.
 */
export interface ScanResult {
  tracks: MusicTrack[];
  notice: string | null;
}

/**
 * expo-audio reports time in SECONDS; the rest of this app works in
 * milliseconds (MediaLibrary durations, `formatDuration`, the 3s
 * restart-vs-previous threshold). Convert only at the expo-audio boundary.
 */
const toMs = (seconds: number | undefined | null): number =>
  typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
    ? Math.round(seconds * 1000)
    : 0;

const toSeconds = (milliseconds: number): number =>
  Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds / 1000 : 0;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

type StatusSubscription = ReturnType<AudioPlayer['addListener']>;

class MusicService {
  private player: AudioPlayer | null = null;
  private statusSubscription: StatusSubscription | null = null;

  /**
   * Incremented on every load. A load that finishes after a newer one started
   * is stale and must not clobber `currentTrack` — this is what makes rapid
   * track tapping safe.
   */
  private loadToken = 0;

  /** Guards against a duplicate `didJustFinish` double-advancing the queue. */
  private advancing = false;

  /** Guards against overlapping smart-shuffle refills. */
  private refilling = false;

  /** Ensures the Android notification permission is only ever prompted once. */
  private notificationPermissionRequested = false;

  private audioModeReady: Promise<void>;

  private playbackState: PlaybackState = {
    isPlaying: false,
    isBuffering: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 1.0,
    repeatMode: 'none',
    shuffleMode: 'off',
    queue: [],
    currentIndex: -1,
    originalQueue: [],
  };
  private listeners: ((state: PlaybackState) => void)[] = [];

  constructor() {
    this.audioModeReady = this.initializeAudio();
  }

  private async initializeAudio(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        // Keeps playback alive when the app is backgrounded. Paired with the
        // iOS `UIBackgroundModes: ["audio"]` entitlement and the Android
        // foreground-service permissions declared in app.json.
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
        allowsRecording: false,
      });
    } catch (error) {
      console.error('Failed to initialize audio mode:', error);
    }
  }

  private getMockMusicData(): MusicTrack[] {
    // Sample tracks used only in development when the media library is
    // unavailable (for example, running in Expo Go without a dev build).
    // These stream from the network and are never shown in a release build.
    const samples: [title: string, artist: string, album: string, durationMs: number][] = [
      ['Summer Breeze', 'The Relaxers', 'Chill Vibes Vol. 1', 234000],
      ['Electric Dreams', 'Synth Masters', 'Digital Waves', 198000],
      ['Midnight Jazz', 'Cool Cats Quartet', 'Late Night Sessions', 267000],
      ['Mountain Echo', 'Nature Sounds', 'Peaceful Landscapes', 312000],
      ['Urban Rhythm', 'City Beats', 'Street Life', 189000],
      ['Ocean Waves', 'Ambient Collective', 'Serenity', 276000],
      ['Rock Anthem', 'The Thunder', 'Greatest Hits', 243000],
      ['Classical Suite', 'Orchestra Ensemble', 'Timeless Classics', 298000],
    ];

    // Tagged as `local` because they stand in for the device library, not for
    // a streaming source — the Discover tab is where remote tracks come from.
    return samples.map(([title, artist, album, duration], index) => ({
      id: makeTrackId('local', `mock-${index + 1}`),
      source: 'local' as const,
      title,
      artist,
      album,
      duration,
      uri: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${index + 1}.mp3`,
    }));
  }

  async requestPermissions(): Promise<boolean> {
    // Ask only for audio. Without the granular list this requests photo and
    // video access too, so the system prompt would say "photos and videos" —
    // alarming, and irrelevant for a music player. Mirrors the
    // `granularPermissions: ["audio"]` setting for the plugin in app.json.
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
    return status === 'granted';
  }

  /**
   * Scans the device for audio files.
   *
   * Never silently substitutes sample data: if permission is denied the caller
   * gets an empty list plus a `notice` explaining why, and only a development
   * build falls back to the sample tracks (clearly labelled as such).
   */
  async scanMusicFiles(): Promise<ScanResult> {
    let hasPermission: boolean;
    try {
      hasPermission = await this.requestPermissions();
    } catch (error: any) {
      // Expo Go cannot declare the media permissions this app needs.
      if (error?.message?.includes('not declared in AndroidManifest')) {
        if (__DEV__) {
          return {
            tracks: this.getMockMusicData(),
            notice:
              'Expo Go can’t read your media library — showing sample tracks. Run "npx expo run:android" for a development build.',
          };
        }
        throw new Error('This build is missing the media library permissions required to scan for music.');
      }
      throw error;
    }

    if (!hasPermission) {
      if (__DEV__) {
        return {
          tracks: this.getMockMusicData(),
          notice: 'Media library permission denied — showing sample tracks (development build only).',
        };
      }
      return {
        tracks: [],
        notice: 'Media library permission denied. Grant music access in Settings to see your library.',
      };
    }

    const media = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 5000,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    const audioExtensions = ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.mp4'];
    const audioAssets = media.assets.filter(asset => {
      const filename = asset.filename.toLowerCase();
      return audioExtensions.some(ext => filename.endsWith(ext));
    });

    // Build tracks synchronously. We deliberately do NOT fetch album art
    // per-track here: it previously issued one MediaLibrary query per file
    // (thousands on a large library) and queried the photo album bucket,
    // which never matches audio anyway. The UI falls back to a note icon.
    const tracks: MusicTrack[] = audioAssets.map(asset => ({
      id: makeTrackId('local', asset.id),
      source: 'local',
      title: asset.filename.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: asset.duration && asset.duration > 0 ? asset.duration * 1000 : 0,
      uri: asset.uri,
    }));

    // An empty library is not an error — the UI has a dedicated empty state.
    return { tracks, notice: null };
  }

  // Queue Management

  /**
   * Replaces the queue.
   *
   * `anchorTrack` is the track that is about to play. When shuffle is on the
   * shuffled queue is pinned around this track — passing it explicitly is what
   * keeps `currentIndex` pointing at the right entry. Without it the shuffle
   * would pin around the *previously* playing track and next/previous would
   * navigate from the wrong position.
   */
  setQueue(tracks: MusicTrack[], startIndex: number = 0, anchorTrack?: MusicTrack | null): void {
    this.playbackState.queue = tracks;
    this.playbackState.originalQueue = [...tracks];
    this.playbackState.currentIndex = startIndex;

    if (this.playbackState.shuffleMode !== 'off') {
      this.shuffleQueue(anchorTrack ?? tracks[startIndex] ?? this.playbackState.currentTrack);
    }

    // A new queue may have no seedable track, in which case smart shuffle
    // silently degrades to plain shuffle rather than pretending to work.
    if (this.playbackState.shuffleMode === 'smart' && !this.canSmartShuffle()) {
      this.playbackState.shuffleMode = 'on';
    }

    this.notifyListeners();

    if (this.playbackState.shuffleMode === 'smart') {
      void this.extendQueueWithRecommendations();
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /** Shuffles the queue, keeping `anchor` (if present) at index 0. */
  private shuffleQueue(anchor: MusicTrack | null | undefined): void {
    if (this.playbackState.originalQueue.length === 0) return;

    const shuffled = this.shuffleArray(this.playbackState.originalQueue);

    if (anchor) {
      const anchorIndex = shuffled.findIndex(t => t.id === anchor.id);
      if (anchorIndex > 0) {
        [shuffled[0], shuffled[anchorIndex]] = [shuffled[anchorIndex], shuffled[0]];
      }
      if (anchorIndex >= 0) {
        this.playbackState.currentIndex = 0;
      }
    }

    this.playbackState.queue = shuffled;
  }

  private unshuffleQueue(): void {
    if (this.playbackState.originalQueue.length === 0) return;

    const currentTrack = this.playbackState.currentTrack;
    this.playbackState.queue = [...this.playbackState.originalQueue];

    if (currentTrack) {
      const index = this.playbackState.queue.findIndex(t => t.id === currentTrack.id);
      this.playbackState.currentIndex = index >= 0 ? index : 0;
    }
  }

  /**
   * True when the queue contains something a recommendation can be seeded
   * from. Local files have no id the catalogue would recognise, so a
   * local-only queue never offers smart shuffle rather than offering it and
   * quietly doing nothing.
   */
  canSmartShuffle(): boolean {
    return this.playbackState.originalQueue.some(track => track.source === 'jamendo');
  }

  /** off → on → smart → off, skipping smart when nothing in the queue can seed it. */
  cycleShuffleMode(): void {
    const order: ShuffleMode[] = this.canSmartShuffle()
      ? ['off', 'on', 'smart']
      : ['off', 'on'];
    const next = order[(order.indexOf(this.playbackState.shuffleMode) + 1) % order.length];
    this.setShuffleMode(next);
  }

  setShuffleMode(mode: ShuffleMode): void {
    // Guard against smart being set on a queue that cannot seed it.
    const resolved: ShuffleMode = mode === 'smart' && !this.canSmartShuffle() ? 'on' : mode;
    this.playbackState.shuffleMode = resolved;

    if (resolved === 'off') {
      this.unshuffleQueue();
    } else {
      this.shuffleQueue(this.playbackState.currentTrack);
    }

    this.notifyListeners();

    if (resolved === 'smart') {
      void this.extendQueueWithRecommendations();
    }
  }

  /** Kept for callers that only need on/off. */
  toggleShuffle(): void {
    this.setShuffleMode(this.playbackState.shuffleMode === 'off' ? 'on' : 'off');
  }

  /**
   * Appends recommendations seeded by the most recent Jamendo track,
   * interleaved so the queue still feels like the user's own.
   *
   * Deliberately additive: it never reorders or removes what is already
   * queued, so turning smart shuffle on cannot lose the thing you were about
   * to hear.
   */
  private async extendQueueWithRecommendations(): Promise<void> {
    if (this.playbackState.shuffleMode !== 'smart') return;
    if (this.refilling) return;

    const seed = this.seedTrack();
    if (!seed) return;

    this.refilling = true;
    try {
      const suggestions = await smartShuffle.recommendationsFor(seed);
      // The mode may have been turned off while the request was in flight.
      if (this.playbackState.shuffleMode !== 'smart') return;

      const known = new Set(this.playbackState.queue.map(track => track.id));
      const fresh = suggestions.filter(track => !known.has(track.id));
      if (fresh.length === 0) return;

      this.playbackState.queue = interleave(
        this.playbackState.queue,
        fresh,
        this.playbackState.currentIndex
      );
      this.notifyListeners();
    } catch (error) {
      // A failed refill is not a playback failure — the existing queue plays on.
      console.warn('Smart shuffle could not extend the queue:', error);
    } finally {
      this.refilling = false;
    }
  }

  /** The most recently played track that a recommendation can be seeded from. */
  private seedTrack(): MusicTrack | null {
    const current = this.playbackState.currentTrack;
    if (current?.source === 'jamendo') return current;
    return (
      [...this.playbackState.queue]
        .slice(0, Math.max(0, this.playbackState.currentIndex) + 1)
        .reverse()
        .find(track => track.source === 'jamendo') ?? null
    );
  }

  setRepeatMode(mode: 'none' | 'one' | 'all'): void {
    this.playbackState.repeatMode = mode;
    // Repeat-one uses the native loop flag so the track restarts gaplessly
    // instead of round-tripping through a JS-driven reload.
    if (this.player) {
      this.player.loop = mode === 'one';
    }
    this.notifyListeners();
  }

  async playNext(): Promise<void> {
    if (this.playbackState.queue.length === 0) return;

    let nextIndex = this.playbackState.currentIndex + 1;

    if (nextIndex >= this.playbackState.queue.length) {
      if (this.playbackState.repeatMode === 'all') {
        nextIndex = 0;
      } else if (this.playbackState.repeatMode === 'one') {
        nextIndex = this.playbackState.currentIndex;
      } else {
        await this.stop();
        return;
      }
    }

    this.playbackState.currentIndex = nextIndex;
    const nextTrack = this.playbackState.queue[nextIndex];

    if (nextTrack) {
      await this.loadTrack(nextTrack);
      await this.play();
    }
  }

  async playPrevious(): Promise<void> {
    // More than 3 seconds in, "previous" restarts the current track.
    if (this.playbackState.position > 3000) {
      await this.seekTo(0);
      return;
    }

    if (this.playbackState.queue.length === 0) return;

    let prevIndex = this.playbackState.currentIndex - 1;

    if (prevIndex < 0) {
      if (this.playbackState.repeatMode === 'all') {
        prevIndex = this.playbackState.queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    this.playbackState.currentIndex = prevIndex;
    const prevTrack = this.playbackState.queue[prevIndex];

    if (prevTrack) {
      await this.loadTrack(prevTrack);
      await this.play();
    }
  }

  /**
   * Handles a status tick from the native player. Bound as a field so it can be
   * subscribed/unsubscribed without losing `this`.
   */
  private handleStatusUpdate = (status: AudioStatus): void => {
    this.playbackState.position = toMs(status.currentTime);

    // Prefer the player's reported duration, but keep the value scanned from
    // the media library while the track is still loading (duration reads 0).
    const reportedDuration = toMs(status.duration);
    if (reportedDuration > 0) {
      this.playbackState.duration = reportedDuration;
    }

    this.playbackState.isPlaying = status.playing;

    // Treat "not loaded yet" as buffering too: on a streamed track the gap
    // between tapping and the first sample is the part that needs a spinner,
    // and `isBuffering` alone doesn't cover the initial fetch.
    this.playbackState.isBuffering = status.isBuffering || !status.isLoaded;

    // `loop` covers repeat-one natively, so only advance when not looping.
    if (status.didJustFinish && !status.loop) {
      void this.handleTrackFinished();
    }

    this.notifyListeners();
  };

  private async handleTrackFinished(): Promise<void> {
    if (this.advancing) return;
    this.advancing = true;
    try {
      await this.playNext();
    } catch (error) {
      console.error('Failed to advance to next track:', error);
    } finally {
      this.advancing = false;
    }
  }

  /**
   * Returns the shared player, creating it on first use. Subsequent loads
   * reuse the same native object via `replace()` so the audio session — and
   * with it background playback and the lock screen — survives track changes.
   */
  private acquirePlayer(source: AudioSource): AudioPlayer {
    if (!this.player) {
      this.player = createAudioPlayer(source, {
        updateInterval: 500,
        // Keeps the audio session alive between tracks so backgrounded
        // playback isn't torn down on every transition.
        keepAudioSessionActive: true,
      });
      this.statusSubscription = this.player.addListener(
        'playbackStatusUpdate',
        this.handleStatusUpdate
      );
    } else {
      this.player.replace(source);
    }
    return this.player;
  }

  async loadTrack(track: MusicTrack): Promise<void> {
    await this.audioModeReady;

    const token = ++this.loadToken;

    try {
      // Prefer an offline copy. This lives here rather than at the tap site so
      // that auto-advance and next/previous get it too — those load tracks
      // without going back through the UI.
      //
      // Hydration is awaited rather than assumed. The registry was otherwise
      // only loaded when a screen using `useDownloads` mounted, so a track
      // played before that — a cold start on the Library tab — streamed even
      // though a local copy existed, and failed outright when offline. The
      // call is memoised, so it costs nothing after the first load.
      await downloadService.hydrate();
      const localUri = downloadService.localUriFor(track.id);
      const player = this.acquirePlayer({ uri: localUri ?? track.uri });

      // A newer load started while this one was in flight — abandon this one.
      if (token !== this.loadToken) return;

      // `replace()` resets per-source state, so reapply our settings.
      player.volume = this.playbackState.volume;
      player.loop = this.playbackState.repeatMode === 'one';

      this.playbackState.currentTrack = track;
      this.playbackState.duration = track.duration;
      this.playbackState.position = 0;
      // Assume a streamed track is buffering until the first status tick says
      // otherwise. Files on disk load effectively instantly, so claiming they
      // buffer would just flash a spinner on every tap — and a downloaded
      // track is a file on disk regardless of where it came from.
      this.playbackState.isBuffering = track.source !== 'local' && !localUri;

      // Publish now-playing info to the lock screen / notification shade.
      player.setActiveForLockScreen(
        true,
        {
          title: track.title,
          artist: track.artist,
          albumTitle: track.album,
          artworkUrl: track.albumArt,
        },
        { showSeekForward: true, showSeekBackward: true }
      );

      this.notifyListeners();

      // Fire-and-forget: a failure to record history must never stop playback.
      void recentlyPlayed.record(track).catch(() => {});
    } catch (error) {
      console.error('Failed to load track:', error);
      throw error instanceof Error ? error : new Error('Failed to load track');
    }
  }

  /**
   * On Android 13+ the media-playback notification (and with it the lock
   * screen controls) needs POST_NOTIFICATIONS. Requested lazily on first play
   * rather than at launch, so the prompt has obvious context. Fire-and-forget:
   * playback must not wait on the dialog, and a refusal only costs the
   * notification, not the audio.
   */
  private async ensureNotificationPermission(): Promise<void> {
    if (this.notificationPermissionRequested) return;
    this.notificationPermissionRequested = true;

    if (Platform.OS !== 'android') return;
    if (typeof Platform.Version !== 'number' || Platform.Version < ANDROID_TIRAMISU) return;

    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch (error) {
      console.warn('Notification permission request failed:', error);
    }
  }

  async play(): Promise<void> {
    await this.audioModeReady;
    void this.ensureNotificationPermission();
    this.player?.play();
  }

  async pause(): Promise<void> {
    this.player?.pause();
  }

  /**
   * Stops playback and tears down the now-playing state. Clearing
   * `currentTrack` is what dismisses the mini-player when a queue runs out
   * with repeat off — previously it lingered showing a track that had ended.
   */
  async stop(): Promise<void> {
    try {
      if (this.player) {
        this.player.pause();
        await this.player.seekTo(0);
        this.player.clearLockScreenControls();
      }
    } catch (error) {
      console.error('Failed to stop:', error);
    }

    this.playbackState.isPlaying = false;
    this.playbackState.isBuffering = false;
    this.playbackState.currentTrack = null;
    this.playbackState.position = 0;
    this.playbackState.duration = 0;
    this.playbackState.currentIndex = -1;
    this.notifyListeners();
  }

  /** @param position Position in milliseconds. */
  async seekTo(position: number): Promise<void> {
    if (!this.player) return;
    await this.player.seekTo(toSeconds(position));
    this.playbackState.position = Math.max(0, position);
    this.notifyListeners();
  }

  /** @param volume 0.0 – 1.0 */
  async setVolume(volume: number): Promise<void> {
    const next = clamp01(volume);
    this.playbackState.volume = next;
    if (this.player) {
      this.player.volume = next;
    }
    this.notifyListeners();
  }

  addListener(listener: (state: PlaybackState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: PlaybackState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.playbackState }));
  }

  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  async cleanup(): Promise<void> {
    this.statusSubscription?.remove();
    this.statusSubscription = null;

    if (this.player) {
      try {
        this.player.clearLockScreenControls();
      } catch {
        // The player may already be released; nothing to clear.
      }
      this.player.remove();
      this.player = null;
    }
  }
}

export const musicService = new MusicService();

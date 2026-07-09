import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { musicService } from '../services/MusicService';
import { MusicTrack, PlaybackState } from '../types/MusicTypes';

interface MusicContextType {
  tracks: MusicTrack[];
  playbackState: PlaybackState;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  loadTracks: () => Promise<void>;
  playTrack: (track: MusicTrack, tracksQueue?: MusicTrack[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  toggleShuffle: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
}

interface PlaybackProgress {
  position: number;
  duration: number;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);
const PlaybackProgressContext = createContext<PlaybackProgress>({ position: 0, duration: 0 });

interface MusicProviderProps {
  children: ReactNode;
}

const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  currentTrack: null,
  position: 0,
  duration: 0,
  volume: 1.0,
  repeatMode: 'none',
  shuffleMode: false,
  queue: [],
  currentIndex: -1,
  originalQueue: [],
};

// Fields that, when changed, should trigger a re-render of the wider UI.
// `position` is intentionally excluded — it ticks ~2x/second and is served
// through the separate PlaybackProgressContext so the track list and
// controls don't re-render on every tick.
const metaChanged = (a: PlaybackState, b: PlaybackState): boolean =>
  a.isPlaying !== b.isPlaying ||
  a.currentTrack?.id !== b.currentTrack?.id ||
  a.duration !== b.duration ||
  a.volume !== b.volume ||
  a.repeatMode !== b.repeatMode ||
  a.shuffleMode !== b.shuffleMode ||
  a.currentIndex !== b.currentIndex ||
  a.queue !== b.queue;

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(initialPlaybackState);
  const [progress, setProgress] = useState<PlaybackProgress>({ position: 0, duration: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePlaybackStateChange = (state: PlaybackState) => {
      setProgress(prev =>
        prev.position !== state.position || prev.duration !== state.duration
          ? { position: state.position, duration: state.duration }
          : prev
      );
      setPlaybackState(prev => (metaChanged(prev, state) ? state : prev));
    };

    musicService.addListener(handlePlaybackStateChange);

    return () => {
      musicService.removeListener(handlePlaybackStateChange);
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const musicTracks = await musicService.scanMusicFiles();
      setTracks(musicTracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load music tracks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const playTrack = useCallback(async (track: MusicTrack, tracksQueue?: MusicTrack[]) => {
    try {
      // If a queue is provided, use it; otherwise use all tracks
      const queue = tracksQueue || tracks;
      const trackIndex = queue.findIndex(t => t.id === track.id);

      // Set up the queue
      musicService.setQueue(queue, trackIndex >= 0 ? trackIndex : 0);

      await musicService.loadTrack(track);
      await musicService.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play track');
    }
  }, [tracks]);

  const play = useCallback(async () => {
    try {
      await musicService.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play');
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await musicService.pause();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause');
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await musicService.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop');
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    try {
      await musicService.seekTo(position);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seek');
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      await musicService.setVolume(volume);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set volume');
    }
  }, []);

  const setRepeatMode = useCallback((mode: 'none' | 'one' | 'all') => {
    musicService.setRepeatMode(mode);
  }, []);

  const toggleShuffle = useCallback(() => {
    musicService.toggleShuffle();
  }, []);

  const playNext = useCallback(async () => {
    try {
      await musicService.playNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play next track');
    }
  }, []);

  const playPrevious = useCallback(async () => {
    try {
      await musicService.playPrevious();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play previous track');
    }
  }, []);

  const value = useMemo<MusicContextType>(() => ({
    tracks,
    playbackState,
    isLoading,
    error,
    clearError,
    loadTracks,
    playTrack,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setRepeatMode,
    toggleShuffle,
    playNext,
    playPrevious,
  }), [
    tracks, playbackState, isLoading, error, clearError, loadTracks, playTrack,
    play, pause, stop, seekTo, setVolume, setRepeatMode, toggleShuffle, playNext, playPrevious,
  ]);

  return (
    <MusicContext.Provider value={value}>
      <PlaybackProgressContext.Provider value={progress}>
        {children}
      </PlaybackProgressContext.Provider>
    </MusicContext.Provider>
  );
};

export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export const usePlaybackProgress = (): PlaybackProgress => useContext(PlaybackProgressContext);

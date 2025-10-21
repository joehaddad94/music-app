import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { musicService } from '../services/MusicService';
import { MusicTrack, PlaybackState } from '../types/MusicTypes';

interface MusicContextType {
  tracks: MusicTrack[];
  playbackState: PlaybackState;
  isLoading: boolean;
  error: string | null;
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

const MusicContext = createContext<MusicContextType | undefined>(undefined);

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePlaybackStateChange = (state: PlaybackState) => {
      setPlaybackState(state);
    };

    musicService.addListener(handlePlaybackStateChange);

    return () => {
      musicService.removeListener(handlePlaybackStateChange);
    };
  }, []);

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

  const play = async () => {
    try {
      await musicService.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play');
    }
  };

  const pause = async () => {
    try {
      await musicService.pause();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const stop = async () => {
    try {
      await musicService.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop');
    }
  };

  const seekTo = async (position: number) => {
    try {
      await musicService.seekTo(position);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seek');
    }
  };

  const setVolume = async (volume: number) => {
    try {
      await musicService.setVolume(volume);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set volume');
    }
  };

  const setRepeatMode = (mode: 'none' | 'one' | 'all') => {
    musicService.setRepeatMode(mode);
  };

  const toggleShuffle = () => {
    musicService.toggleShuffle();
  };

  const playNext = async () => {
    try {
      await musicService.playNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play next track');
    }
  };

  const playPrevious = async () => {
    try {
      await musicService.playPrevious();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play previous track');
    }
  };

  const value: MusicContextType = {
    tracks,
    playbackState,
    isLoading,
    error,
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
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
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

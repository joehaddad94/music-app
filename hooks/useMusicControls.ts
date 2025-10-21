import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { useMusic } from '../contexts/MusicContext';

export const useMusicControls = () => {
  const { playbackState, playTrack, pause, play, setRepeatMode, toggleShuffle, playNext, playPrevious } = useMusic();

  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (playbackState.isPlaying) {
      pause();
    } else {
      if (playbackState.currentTrack) {
        play();
      }
    }
  }, [playbackState.isPlaying, playbackState.currentTrack, play, pause]);

  const handlePrevious = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await playPrevious();
  }, [playPrevious]);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await playNext();
  }, [playNext]);

  const handleRepeat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMode = playbackState.repeatMode === 'none' ? 'one' :
                    playbackState.repeatMode === 'one' ? 'all' : 'none';
    setRepeatMode(nextMode);
  }, [playbackState.repeatMode, setRepeatMode]);

  const handleShuffle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleShuffle();
  }, [toggleShuffle]);

  return {
    playbackState,
    handlePlayPause,
    handlePrevious,
    handleNext,
    handleRepeat,
    handleShuffle,
  };
};

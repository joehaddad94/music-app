import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { useMusic } from '../contexts/MusicContext';

export const useMusicControls = () => {
  const { playbackState, playTrack, pause, setRepeatMode, setShuffleMode } = useMusic();

  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (playbackState.isPlaying) {
      pause();
    } else {
      if (playbackState.currentTrack) {
        playTrack(playbackState.currentTrack);
      }
    }
  }, [playbackState.isPlaying, playbackState.currentTrack, playTrack, pause]);

  const handlePrevious = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement previous track logic
    console.log('Previous track');
  }, []);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement next track logic
    console.log('Next track');
  }, []);

  const handleRepeat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMode = playbackState.repeatMode === 'none' ? 'one' : 
                    playbackState.repeatMode === 'one' ? 'all' : 'none';
    setRepeatMode(nextMode);
  }, [playbackState.repeatMode, setRepeatMode]);

  const handleShuffle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShuffleMode(!playbackState.shuffleMode);
  }, [playbackState.shuffleMode, setShuffleMode]);

  return {
    playbackState,
    handlePlayPause,
    handlePrevious,
    handleNext,
    handleRepeat,
    handleShuffle,
  };
};

import { useCallback, useEffect, useState } from 'react';
import { useMusic, usePlaybackProgress } from '../contexts/MusicContext';
import { formatDuration } from '../utils/musicUtils';

export const useMusicPlayer = () => {
  const { seekTo, setVolume } = useMusic();
  const { position, duration } = usePlaybackProgress();
  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);

  // Update local position when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalPosition(position);
    }
  }, [position, isDragging]);

  const handleSeek = useCallback((position: number) => {
    seekTo(position);
    setLocalPosition(position);
  }, [seekTo]);

  const handleSeekStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    setVolume(volume);
  }, [setVolume]);

  const formatTime = useCallback((milliseconds: number): string => formatDuration(milliseconds), []);

  return {
    position,
    duration,
    isDragging,
    localPosition,
    handleSeek,
    handleSeekStart,
    handleSeekEnd,
    handleVolumeChange,
    formatTime,
  };
};

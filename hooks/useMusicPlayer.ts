import { useCallback, useEffect, useState } from 'react';
import { useMusic, usePlaybackProgress } from '../contexts/MusicContext';

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

  const formatTime = useCallback((milliseconds: number): string => {
    if (milliseconds === 0 || !milliseconds) {
      return '0:00';
    }
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

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

import { useCallback, useEffect, useState } from 'react';
import { useMusic, usePlaybackProgress } from '../contexts/MusicContext';
import { formatDuration } from '../utils/musicUtils';

/**
 * Seek/progress state for the player's scrubber.
 *
 * Volume is deliberately not handled here: this hook subscribes to the
 * playback progress tick (~2x/second), so a volume control built on it would
 * re-render constantly. `VolumeSlider` talks to the context directly instead.
 */
export const useMusicPlayer = () => {
  const { seekTo } = useMusic();
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

  /**
   * Tracks the thumb while the user drags, without committing a seek. This is
   * what keeps the elapsed-time label moving mid-drag instead of freezing at
   * the last polled position.
   */
  const handleSeekPreview = useCallback((position: number) => {
    setLocalPosition(Math.max(0, position));
  }, []);

  const handleSeekStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const formatTime = useCallback((milliseconds: number): string => formatDuration(milliseconds), []);

  return {
    position,
    duration,
    isDragging,
    localPosition,
    handleSeek,
    handleSeekPreview,
    handleSeekStart,
    handleSeekEnd,
    formatTime,
  };
};

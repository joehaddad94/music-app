import { useEffect, useSyncExternalStore } from 'react';
import { recentlyPlayed } from '../services/RecentlyPlayed';

/**
 * The recently played list.
 *
 * Backed by a plain service rather than a context because the list is written
 * from `MusicService.loadTrack`, which runs outside React — auto-advance never
 * passes through a component.
 */
export const useRecentlyPlayed = () => {
  const tracks = useSyncExternalStore(
    recentlyPlayed.subscribe,
    recentlyPlayed.getSnapshot,
    recentlyPlayed.getSnapshot
  );

  useEffect(() => {
    void recentlyPlayed.hydrate();
  }, []);

  return {
    tracks,
    clear: recentlyPlayed.clear.bind(recentlyPlayed),
  };
};

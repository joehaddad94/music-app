import { useCallback, useMemo, useState } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { MusicTrack } from '../types/MusicTypes';

export const useMusicLibrary = () => {
  const { tracks, playbackState, isLoading, loadTracks, playTrack } = useMusic();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tracks based on search query
  const filteredTracks = useMemo<MusicTrack[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return tracks;
    }
    return tracks.filter(track =>
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      (track.album || '').toLowerCase().includes(query)
    );
  }, [tracks, searchQuery]);

  const handleTrackPress = useCallback((track: MusicTrack) => {
    playTrack(track);
  }, [playTrack]);

  const handleRefresh = useCallback(() => {
    loadTracks();
  }, [loadTracks]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    tracks: filteredTracks,
    totalTracks: tracks.length,
    playbackState,
    isLoading,
    searchQuery,
    setSearchQuery,
    handleTrackPress,
    handleRefresh,
    clearSearch,
  };
};

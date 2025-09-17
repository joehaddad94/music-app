import { useCallback, useEffect, useState } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { MusicTrack } from '../types/MusicTypes';

export const useMusicLibrary = () => {
  const { tracks, playbackState, isLoading, loadTracks, playTrack } = useMusic();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTracks, setFilteredTracks] = useState<MusicTrack[]>([]);

  // Filter tracks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(tracks);
    } else {
      const filtered = tracks.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.album || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTracks(filtered);
    }
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
    playbackState,
    isLoading,
    searchQuery,
    setSearchQuery,
    handleTrackPress,
    handleRefresh,
    clearSearch,
  };
};

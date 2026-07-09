import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StorageService } from '../services/StorageService';
import { Playlist } from '../types/MusicTypes';

const FAVORITES_KEY = 'favorites';
const PLAYLISTS_KEY = 'playlists';

interface LibraryContextType {
  ready: boolean;
  favorites: string[];
  playlists: Playlist[];
  isFavorite: (trackId: string) => boolean;
  toggleFavorite: (trackId: string) => void;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [ready, setReady] = useState(false);

  // Load persisted data once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [favs, lists] = await Promise.all([
        StorageService.load<string[]>(FAVORITES_KEY, []),
        StorageService.load<Playlist[]>(PLAYLISTS_KEY, []),
      ]);
      if (!cancelled) {
        setFavorites(favs);
        setPlaylists(lists);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change. Gated on `ready` so we never overwrite stored data
  // with the empty defaults before the initial load has populated state.
  useEffect(() => {
    if (!ready) return;
    StorageService.save(FAVORITES_KEY, favorites);
  }, [favorites, ready]);

  useEffect(() => {
    if (!ready) return;
    StorageService.save(PLAYLISTS_KEY, playlists);
  }, [playlists, ready]);

  const isFavorite = useCallback(
    (trackId: string) => favorites.includes(trackId),
    [favorites]
  );

  const toggleFavorite = useCallback((trackId: string) => {
    setFavorites(prev =>
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const playlist: Playlist = {
      id: genId(),
      name: name.trim() || 'Untitled Playlist',
      trackIds: [],
      createdAt: Date.now(),
    };
    setPlaylists(prev => [playlist, ...prev]);
    return playlist;
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
  }, []);

  const addToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p
      )
    );
  }, []);

  const removeFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId) } : p
      )
    );
  }, []);

  const value = useMemo<LibraryContextType>(() => ({
    ready,
    favorites,
    playlists,
    isFavorite,
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
  }), [ready, favorites, playlists, isFavorite, toggleFavorite, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

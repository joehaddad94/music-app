import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  FAVORITES_KEY,
  PLAYLISTS_KEY,
  loadAndMigrateLibrary,
} from '../services/LibraryMigrations';
import { toDurableTrack } from '../services/MusicSources';
import { StorageService } from '../services/StorageService';
import { MusicTrack, Playlist } from '../types/MusicTypes';

const KNOWN_TRACKS_KEY = 'knownTracks';

interface LibraryContextType {
  ready: boolean;
  favorites: string[];
  playlists: Playlist[];
  isFavorite: (trackId: string) => boolean;
  toggleFavorite: (track: MusicTrack) => void;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  addToPlaylist: (playlistId: string, track: MusicTrack) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  /**
   * Metadata for a referenced track that isn't in the on-device library.
   * Favorites and playlists persist ids only, which is fine for local files
   * (always re-scannable) but leaves a streamed track unreconstructable.
   */
  getKnownTrack: (trackId: string) => MusicTrack | undefined;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [knownTracks, setKnownTracks] = useState<Record<string, MusicTrack>>({});
  const [ready, setReady] = useState(false);

  // Load persisted data once on mount, migrating it if an older schema wrote it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [library, cached] = await Promise.all([
        loadAndMigrateLibrary(),
        StorageService.load<Record<string, MusicTrack>>(KNOWN_TRACKS_KEY, {}),
      ]);
      if (!cancelled) {
        setFavorites(library.favorites);
        setPlaylists(library.playlists);
        setKnownTracks(cached);
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

  // Only keep metadata for tracks something still points at, so the cache
  // can't grow without bound as playlists come and go.
  useEffect(() => {
    if (!ready) return;
    const referenced = new Set([...favorites, ...playlists.flatMap(p => p.trackIds)]);
    const pruned = Object.fromEntries(
      Object.entries(knownTracks).filter(([id]) => referenced.has(id))
    );
    StorageService.save(KNOWN_TRACKS_KEY, pruned);
  }, [knownTracks, favorites, playlists, ready]);

  /**
   * Local tracks are deliberately not cached: they come back on every scan,
   * so storing them would duplicate the library for no benefit.
   *
   * Remote tracks are stored in durable form — their stream URLs are signed
   * and expire, so what we keep has to be a permanently resolvable address.
   */
  const remember = useCallback((track: MusicTrack) => {
    if (track.source === 'local') return;
    const durable = toDurableTrack(track);
    setKnownTracks(prev => (prev[durable.id] ? prev : { ...prev, [durable.id]: durable }));
  }, []);

  const isFavorite = useCallback(
    (trackId: string) => favorites.includes(trackId),
    [favorites]
  );

  const toggleFavorite = useCallback((track: MusicTrack) => {
    remember(track);
    setFavorites(prev =>
      prev.includes(track.id) ? prev.filter(id => id !== track.id) : [...prev, track.id]
    );
  }, [remember]);

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

  const addToPlaylist = useCallback((playlistId: string, track: MusicTrack) => {
    remember(track);
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId && !p.trackIds.includes(track.id)
          ? { ...p, trackIds: [...p.trackIds, track.id] }
          : p
      )
    );
  }, [remember]);

  const removeFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId) } : p
      )
    );
  }, []);

  const getKnownTrack = useCallback(
    (trackId: string) => knownTracks[trackId],
    [knownTracks]
  );

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
    getKnownTrack,
  }), [ready, favorites, playlists, isFavorite, toggleFavorite, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, getKnownTrack]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

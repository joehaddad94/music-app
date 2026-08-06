import { MusicTrack } from '../types/MusicTypes';
import { StorageService } from './StorageService';
import { toDurableTrack } from './MusicSources';

/**
 * The last handful of tracks played, most recent first.
 *
 * Capped rather than unbounded: this is a convenience for getting back to
 * something you just heard, not a listening history, and an ever-growing file
 * of stream metadata would be a poor trade for that.
 */

const KEY = 'recentlyPlayed';
const LIMIT = 30;

let cache: MusicTrack[] | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());

export const recentlyPlayed = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): MusicTrack[] {
    return cache ?? [];
  },

  async hydrate(): Promise<MusicTrack[]> {
    if (cache) return cache;
    cache = await StorageService.load<MusicTrack[]>(KEY, []);
    notify();
    return cache;
  },

  /** Moves a track to the front, de-duplicating by id. */
  async record(track: MusicTrack): Promise<void> {
    const current = await this.hydrate();
    // Stored tracks outlive the signed stream URL a search response carries.
    const durable = toDurableTrack(track);
    cache = [durable, ...current.filter(entry => entry.id !== durable.id)].slice(0, LIMIT);
    notify();
    await StorageService.save(KEY, cache);
  },

  async clear(): Promise<void> {
    cache = [];
    notify();
    await StorageService.remove(KEY);
  },
};

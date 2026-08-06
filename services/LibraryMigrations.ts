import { Playlist } from '../types/MusicTypes';
import { namespaceLegacyId } from '../utils/trackId';
import { StorageService } from './StorageService';

export const FAVORITES_KEY = 'favorites';
export const PLAYLISTS_KEY = 'playlists';
export const SCHEMA_VERSION_KEY = 'librarySchemaVersion';

/**
 * 0 → data written before track ids were namespaced (bare MediaLibrary ids).
 * 1 → ids are `local:<id>` / `jamendo:<id>`.
 */
export const CURRENT_SCHEMA_VERSION = 1;

export interface LibraryData {
  favorites: string[];
  playlists: Playlist[];
}

const dedupe = (ids: string[]): string[] => Array.from(new Set(ids));

/**
 * v0 → v1. Everything stored before namespacing came from the device, so bare
 * ids become `local:<id>`. Ids that are already namespaced are left alone,
 * which is what lets this run twice without corrupting anything — and it will
 * run twice if a write fails between migrating and recording the version.
 */
const namespaceIds = (data: LibraryData): LibraryData => ({
  favorites: dedupe(data.favorites.map(namespaceLegacyId)),
  playlists: data.playlists.map(playlist => ({
    ...playlist,
    trackIds: dedupe(playlist.trackIds.map(namespaceLegacyId)),
  })),
});

/**
 * Pure migration step, exported for tests: brings `data` from `fromVersion` up
 * to `CURRENT_SCHEMA_VERSION`.
 */
export const migrateLibraryData = (fromVersion: number, data: LibraryData): LibraryData => {
  let result = data;
  if (fromVersion < 1) {
    result = namespaceIds(result);
  }
  return result;
};

/**
 * Loads persisted favorites and playlists, migrating them if they were written
 * by an older schema. Writes back only when something actually changed, so a
 * normal launch costs two reads and no writes.
 */
export const loadAndMigrateLibrary = async (): Promise<LibraryData> => {
  const [version, favorites, playlists] = await Promise.all([
    StorageService.load<number>(SCHEMA_VERSION_KEY, 0),
    StorageService.load<string[]>(FAVORITES_KEY, []),
    StorageService.load<Playlist[]>(PLAYLISTS_KEY, []),
  ]);

  if (version >= CURRENT_SCHEMA_VERSION) {
    return { favorites, playlists };
  }

  const migrated = migrateLibraryData(version, { favorites, playlists });

  // Data first, then the version marker. If the app dies between the two the
  // migration simply runs again, which is harmless; the reverse order could
  // mark unmigrated data as migrated.
  await Promise.all([
    StorageService.save(FAVORITES_KEY, migrated.favorites),
    StorageService.save(PLAYLISTS_KEY, migrated.playlists),
  ]);
  await StorageService.save(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);

  return migrated;
};

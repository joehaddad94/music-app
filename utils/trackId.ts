import { TrackSource } from '../types/MusicTypes';

/**
 * Track ids are namespaced as `<source>:<nativeId>`.
 *
 * Without this a MediaLibrary asset id and a Jamendo track id — both plain
 * numbers — can collide, and since favorites and playlists persist ids alone,
 * a collision would silently point at the wrong song.
 */

const SOURCES: TrackSource[] = ['local', 'jamendo'];
const SEPARATOR = ':';

export const makeTrackId = (source: TrackSource, nativeId: string | number): string =>
  `${source}${SEPARATOR}${nativeId}`;

/** True for ids that already carry a known source prefix. */
export const isNamespacedId = (id: string): boolean =>
  SOURCES.some(source => id.startsWith(`${source}${SEPARATOR}`));

/** The source an id belongs to, or null if it is not namespaced. */
export const sourceOfId = (id: string): TrackSource | null =>
  SOURCES.find(source => id.startsWith(`${source}${SEPARATOR}`)) ?? null;

/**
 * The id as the originating platform knows it — what you send back to an API.
 * Returns the input unchanged when it carries no prefix.
 */
export const nativeIdOf = (id: string): string => {
  const source = sourceOfId(id);
  return source ? id.slice(source.length + SEPARATOR.length) : id;
};

/**
 * Upgrades an id persisted before namespacing existed. Everything stored back
 * then came from the device, so a bare id is by definition local. Already
 * namespaced ids pass through untouched, which is what makes the migration
 * safe to run more than once.
 */
export const namespaceLegacyId = (id: string): string =>
  isNamespacedId(id) ? id : makeTrackId('local', id);

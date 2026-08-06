import { MusicTrack, TrackSource } from '../types/MusicTypes';
import { JamendoClient, TrackPage, streamUrlFor } from './JamendoClient';
import { nativeIdOf } from '../utils/trackId';

/**
 * A browsable catalogue of tracks somewhere on the network.
 *
 * The Discover UI talks to this interface rather than to `JamendoClient`
 * directly, so adding a second provider later is a registry entry rather than
 * a rewrite of the screen.
 *
 * The on-device library deliberately does *not* implement this. Local search
 * is a synchronous filter over an array that is already in memory; forcing it
 * behind an async, paginated, cancellable interface would add indirection
 * without removing any duplication. `useMusicLibrary` keeps its own path.
 */
export interface RemoteMusicSource {
  id: TrackSource;
  label: string;
  /** Attribution line required by the provider's terms, shown under listings. */
  credit: string;
  /** False when the source lacks configuration (e.g. a missing API key). */
  isConfigured(): boolean;
  /** Default listing for an empty search box. */
  browse(page: number, signal?: AbortSignal): Promise<TrackPage>;
  search(query: string, page: number, signal?: AbortSignal): Promise<TrackPage>;
  tagged(tag: string, page: number, signal?: AbortSignal): Promise<TrackPage>;
}

export const jamendoSource: RemoteMusicSource = {
  id: 'jamendo',
  label: 'Jamendo',
  credit: 'Music provided by Jamendo',
  isConfigured: () => JamendoClient.isConfigured(),
  browse: (page, signal) => JamendoClient.popularTracks(page, signal),
  search: (query, page, signal) => JamendoClient.searchTracks(query, page, signal),
  tagged: (tag, page, signal) => JamendoClient.tracksByTag(tag, page, signal),
};

export const remoteSources: RemoteMusicSource[] = [jamendoSource];

/**
 * Rewrites a track into a form that is safe to store.
 *
 * Jamendo hands out pre-signed stream URLs whose token is regenerated on every
 * request, so persisting one produces a favourite that plays today and fails
 * next week. Anything we keep gets the permanent redirect endpoint instead.
 * Local files are already durable and pass through untouched.
 */
export const toDurableTrack = (track: MusicTrack): MusicTrack => {
  if (track.source !== 'jamendo') return track;
  try {
    return { ...track, uri: streamUrlFor(nativeIdOf(track.id)) };
  } catch {
    // Unconfigured client: keep the original URL rather than losing the track.
    return track;
  }
};

/** Genre tags offered as browse shortcuts on the Discover tab. */
export const BROWSE_TAGS = [
  'rock',
  'electronic',
  'jazz',
  'classical',
  'hiphop',
  'pop',
  'ambient',
  'lounge',
  'metal',
  'folk',
] as const;

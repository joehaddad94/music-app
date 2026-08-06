import { MusicTrack } from '../types/MusicTypes';
import { makeTrackId, nativeIdOf } from '../utils/trackId';
import { StorageService } from './StorageService';

/**
 * Client for the Jamendo v3.0 API.
 *
 * Constraints this file exists to enforce, from Jamendo's API terms and docs:
 *
 * - The free tier is **non-commercial only** and allows 35,000 requests per
 *   month. That is why every read goes through a TTL cache and why callers are
 *   expected to debounce — an unthrottled search-as-you-type would burn the
 *   month's quota in days.
 * - `audioformat` defaults to `mp31`, which is 96 kbps. We always ask for
 *   `mp32` (VBR); the default sounds noticeably rough.
 * - Artists can forbid downloads individually. `audiodownload_allowed` is
 *   mapped onto `MusicTrack.downloadAllowed`, and the download URL comes back
 *   as an empty string when it is false.
 * - Every track must link back to its page on Jamendo, so `shareurl` is mapped
 *   to `MusicTrack.sourceUrl` and treated as required for display.
 */

const API_BASE = 'https://api.jamendo.com/v3.0';
const AUDIO_FORMAT = 'mp32';
const IMAGE_SIZE = '300';

/** Jamendo caps `limit` at 200; fetch generously to keep request count down. */
export const PAGE_SIZE = 50;

const CACHE_PREFIX = 'jamendoCache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Jamendo intermittently answers `success` with an empty result set for a
 * query that returns data moments later — measured at roughly one call in
 * three on 2026-08-06, on plain popular-tracks listings as well as id
 * lookups. Left alone, that surfaces as "no results" at random.
 *
 * So an empty response is retried rather than believed, and never written to
 * the cache: a cached flake would pin the empty answer for the whole TTL.
 */
const EMPTY_RESPONSE_RETRIES = 2;
const RETRY_DELAY_MS = 350;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enough tags to characterise a track without narrowing the match to nothing.
 * `fuzzytags` is an OR search, so more tags widens rather than narrows — but
 * past a handful the ranking drifts away from what the seed actually sounded like.
 */
const MAX_SEED_TAGS = 5;

export class JamendoConfigError extends Error {
  constructor() {
    super(
      'Jamendo is not configured. Add EXPO_PUBLIC_JAMENDO_CLIENT_ID to your .env and restart the bundler.'
    );
    this.name = 'JamendoConfigError';
  }
}

export class JamendoRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'JamendoRequestError';
    this.status = status;
  }
}

/** Shape of a track in a Jamendo API response. Everything here is optional in practice. */
interface JamendoTrackPayload {
  id?: string | number;
  name?: string;
  artist_name?: string;
  album_name?: string;
  duration?: number; // seconds
  artist_id?: string | number;
  musicinfo?: {
    tags?: {
      genres?: string[];
      instruments?: string[];
      vartags?: string[];
    };
  };
  audio?: string;
  audiodownload?: string;
  audiodownload_allowed?: boolean;
  image?: string;
  album_image?: string;
  shareurl?: string;
  shorturl?: string;
  license_ccurl?: string;
}

interface JamendoResponse<T> {
  headers?: { status?: string; error_message?: string; results_count?: number };
  results?: T[];
}

export interface TrackPage {
  tracks: MusicTrack[];
  /** True when the API returned a full page, so another may exist. */
  hasMore: boolean;
}

export const getClientId = (): string | undefined =>
  process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID?.trim() || undefined;

export const isConfigured = (): boolean => Boolean(getClientId());

/**
 * Jamendo reports durations in seconds; this app works in milliseconds
 * everywhere above the audio layer.
 */
const toMs = (seconds: number | undefined): number =>
  typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
    ? Math.round(seconds * 1000)
    : 0;

export const mapTrack = (payload: JamendoTrackPayload): MusicTrack | null => {
  // Without an id or a stream URL there is nothing playable to show.
  if (payload.id === undefined || payload.id === null || !payload.audio) return null;

  const downloadAllowed = payload.audiodownload_allowed === true;
  const downloadUri = payload.audiodownload?.trim();

  return {
    id: makeTrackId('jamendo', payload.id),
    source: 'jamendo',
    title: payload.name?.trim() || 'Untitled',
    artist: payload.artist_name?.trim() || 'Unknown Artist',
    album: payload.album_name?.trim() || undefined,
    duration: toMs(payload.duration),
    uri: payload.audio,
    albumArt: payload.image || payload.album_image || undefined,
    artistId: payload.artist_id === undefined ? undefined : String(payload.artist_id),
    // The artist-tracks endpoint nests tracks and omits `shareurl`, but the
    // backlink is contractually required, so fall back to the canonical track
    // page — verified to be exactly the form `shareurl` returns.
    sourceUrl: payload.shareurl || payload.shorturl || `https://www.jamendo.com/track/${payload.id}`,
    licenseUrl: payload.license_ccurl || undefined,
    downloadAllowed,
    // Empty string when the artist has opted out, so only keep a real URL —
    // and only when the flag agrees, since the endpoint 404s otherwise.
    downloadUri: downloadAllowed && downloadUri ? downloadUri : undefined,
  };
};

interface CacheEntry {
  savedAt: number;
  payload: JamendoTrackPayload[];
}

const cacheKeyFor = (path: string, params: Record<string, string>): string => {
  const stable = Object.keys(params)
    .filter(key => key !== 'client_id')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  // Only safe filename characters: this becomes a file name in StorageService.
  return `${CACHE_PREFIX}_${path}_${stable}`.replace(/[^a-zA-Z0-9_-]/g, '_');
};

const readCache = async (key: string): Promise<JamendoTrackPayload[] | null> => {
  const entry = await StorageService.load<CacheEntry | null>(key, null);
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL_MS) return null;
  return entry.payload;
};

const writeCache = async (key: string, payload: JamendoTrackPayload[]): Promise<void> => {
  await StorageService.save<CacheEntry>(key, { savedAt: Date.now(), payload });
};

/**
 * Performs a request, serving from the TTL cache when possible.
 *
 * @param signal Abort signal — the search hook uses it to cancel superseded
 *               keystrokes so a slow earlier response can't overwrite newer results.
 */
const fetchOnce = async (
  path: string,
  query: URLSearchParams,
  signal?: AbortSignal
): Promise<JamendoTrackPayload[]> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${path}/?${query.toString()}`, { signal });
  } catch (error) {
    // Rethrow aborts untouched so callers can distinguish "cancelled" from "failed".
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new JamendoRequestError(
      'Could not reach Jamendo. Check your connection and try again.'
    );
  }

  if (!response.ok) {
    throw new JamendoRequestError(
      response.status === 429
        ? 'Too many requests to Jamendo. Try again in a moment.'
        : `Jamendo returned an error (${response.status}).`,
      response.status
    );
  }

  const body = (await response.json()) as JamendoResponse<JamendoTrackPayload>;

  // Jamendo signals failure in the body with HTTP 200, so the status header
  // has to be checked separately.
  if (body.headers?.status && body.headers.status !== 'success') {
    throw new JamendoRequestError(body.headers.error_message || 'Jamendo rejected the request.');
  }

  return body.results ?? [];
};

const request = async (
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal
): Promise<JamendoTrackPayload[]> => {
  const clientId = getClientId();
  if (!clientId) throw new JamendoConfigError();

  const cacheKey = cacheKeyFor(path, params);
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const query = new URLSearchParams({
    client_id: clientId,
    format: 'json',
    audioformat: AUDIO_FORMAT,
    imagesize: IMAGE_SIZE,
    ...params,
  });

  let results = await fetchOnce(path, query, signal);

  // An empty result is more often a Jamendo hiccup than a real absence, so
  // ask again before believing it. A genuinely empty query costs the extra
  // calls, which is an acceptable trade against showing "no results" at random.
  for (let attempt = 0; results.length === 0 && attempt < EMPTY_RESPONSE_RETRIES; attempt++) {
    if (signal?.aborted) return results;
    await delay(RETRY_DELAY_MS);
    if (signal?.aborted) return results;
    results = await fetchOnce(path, query, signal);
  }

  // Never cache an empty result: a cached flake would pin it for the full TTL.
  if (results.length > 0) {
    await writeCache(cacheKey, results);
  }
  return results;
};

const toPage = (payload: JamendoTrackPayload[], limit: number): TrackPage => ({
  tracks: payload.map(mapTrack).filter((track): track is MusicTrack => track !== null),
  hasMore: payload.length >= limit,
});

/**
 * A stable stream URL for a track.
 *
 * The `audio` field in a search response is a pre-signed URL carrying a token
 * that is regenerated on every request, so it cannot be stored — a favourite
 * played back a week later would be pointing at a stale signature. This
 * endpoint is permanent and 302s to a freshly signed file on each request,
 * and both ExoPlayer and AVPlayer follow the redirect.
 *
 * Only used for tracks we persist: a fresh search result plays its signed URL
 * directly, which costs no extra request.
 */
export const streamUrlFor = (nativeId: string): string => {
  const clientId = getClientId();
  if (!clientId) throw new JamendoConfigError();
  const query = new URLSearchParams({
    client_id: clientId,
    id: nativeId,
    audioformat: AUDIO_FORMAT,
    action: 'stream',
  });
  return `${API_BASE}/tracks/file/?${query.toString()}`;
};

export const JamendoClient = {
  isConfigured,
  streamUrlFor,

  /** Free-text search across track names. */
  async searchTracks(query: string, page = 0, signal?: AbortSignal): Promise<TrackPage> {
    const trimmed = query.trim();
    if (!trimmed) return { tracks: [], hasMore: false };

    const payload = await request(
      'tracks',
      {
        namesearch: trimmed,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        order: 'popularity_total',
      },
      signal
    );
    return toPage(payload, PAGE_SIZE);
  },

  /** The Discover tab's default listing. */
  async popularTracks(page = 0, signal?: AbortSignal): Promise<TrackPage> {
    const payload = await request(
      'tracks',
      {
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        order: 'popularity_month',
      },
      signal
    );
    return toPage(payload, PAGE_SIZE);
  },

  /**
   * The descriptive tags Jamendo holds for a track — the seed for smart shuffle.
   */
  async trackTags(nativeTrackId: string, signal?: AbortSignal): Promise<string[]> {
    const payload = await request(
      'tracks',
      { id: nativeTrackId, include: 'musicinfo', limit: '1' },
      signal
    );

    const tags = payload[0]?.musicinfo?.tags;
    if (!tags) return [];

    // Genres first because they discriminate most, then moods. Instruments are
    // left out: "synthesizer" matches half the catalogue and washes the
    // recommendation out.
    return [...(tags.genres ?? []), ...(tags.vartags ?? [])]
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, MAX_SEED_TAGS);
  },

  /**
   * Tracks resembling a seed track, used by smart shuffle.
   *
   * Built on tags rather than Jamendo's `/tracks/similar` endpoint. That
   * endpoint is documented and answers `success`, but returns zero results for
   * every track tested (2026-08-06) — it appears to be decommissioned. Tags
   * come from `include=musicinfo` and are matched with `fuzzytags`, which is an
   * OR search that ranks full matches first, so the closest things surface at
   * the top and the tail degrades gracefully.
   *
   * Costs two requests per refill instead of one; against 35,000/month, and
   * refilling roughly every ten tracks, that is not worth optimising.
   */
  async similarTracks(
    nativeTrackId: string,
    options: { limit?: number } = {},
    signal?: AbortSignal
  ): Promise<MusicTrack[]> {
    const { limit = 30 } = options;

    const tags = await this.trackTags(nativeTrackId, signal);
    // No tags means nothing to reason from. An arbitrary popular track would
    // be worse than simply not extending the queue.
    if (tags.length === 0) return [];

    const payload = await request(
      'tracks',
      {
        fuzzytags: tags.join('+'),
        limit: String(limit),
        order: 'popularity_month',
      },
      signal
    );

    return payload
      .map(mapTrack)
      .filter((track): track is MusicTrack => track !== null)
      .filter(track => nativeIdOf(track.id) !== nativeTrackId);
  },

  /**
   * Everything by one artist, for the artist page.
   *
   * This endpoint nests an artist's whole catalogue under a single artist
   * entry — `limit` counts artists, not tracks, so one request returns the lot
   * (530 tracks for a prolific artist in testing). There is therefore nothing
   * to page through, and `hasMore` is always false. The obvious alternative,
   * `/tracks?artist_id=`, does page but proved far more prone to the
   * empty-response flake described above.
   */
  async artistTracks(artistId: string, signal?: AbortSignal): Promise<TrackPage> {
    const payload = await request(
      'artists/tracks',
      { id: artistId, limit: '1' },
      signal
    );
    // This endpoint nests tracks under the artist rather than returning them flat.
    const flattened = payload.flatMap(entry => {
      const artistEntry = entry as JamendoTrackPayload & {
        name?: string;
        tracks?: JamendoTrackPayload[];
      };
      return (artistEntry.tracks ?? []).map(track => ({
        ...track,
        artist_name: track.artist_name ?? artistEntry.name,
        artist_id: track.artist_id ?? artistEntry.id,
      }));
    });
    return {
      tracks: flattened.map(mapTrack).filter((track): track is MusicTrack => track !== null),
      hasMore: false,
    };
  },

  /** Tracks for a genre/mood tag, e.g. `rock`, `chillout`. */
  async tracksByTag(tag: string, page = 0, signal?: AbortSignal): Promise<TrackPage> {
    const payload = await request(
      'tracks',
      {
        fuzzytags: tag,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        order: 'popularity_month',
      },
      signal
    );
    return toPage(payload, PAGE_SIZE);
  },
};

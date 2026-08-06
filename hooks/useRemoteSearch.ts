import { useCallback, useEffect, useRef, useState } from 'react';
import { JamendoConfigError } from '../services/JamendoClient';
import { RemoteMusicSource } from '../services/MusicSources';
import { MusicTrack } from '../types/MusicTypes';

/**
 * Long enough that typing a word costs one request rather than one per letter.
 * The free Jamendo tier allows 35,000 requests a month — search-as-you-type
 * without this would spend that in days.
 */
const DEBOUNCE_MS = 400;

export type BrowseMode =
  | { kind: 'popular' }
  | { kind: 'tag'; tag: string }
  | { kind: 'search'; query: string };

const sameMode = (a: BrowseMode, b: BrowseMode): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'tag' && b.kind === 'tag') return a.tag === b.tag;
  if (a.kind === 'search' && b.kind === 'search') return a.query === b.query;
  return true;
};

const fetchFor = (
  source: RemoteMusicSource,
  mode: BrowseMode,
  page: number,
  signal: AbortSignal
) => {
  switch (mode.kind) {
    case 'search':
      return source.search(mode.query, page, signal);
    case 'tag':
      return source.tagged(mode.tag, page, signal);
    default:
      return source.browse(page, signal);
  }
};

const isAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const messageFor = (error: unknown): string => {
  if (error instanceof JamendoConfigError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong loading tracks.';
};

/**
 * Drives the Discover tab: debounced search, tag browsing, paging and the
 * loading/empty/error states around them.
 */
export const useRemoteSearch = (source: RemoteMusicSource) => {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [mode, setMode] = useState<BrowseMode>({ kind: 'popular' });

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Cancels the in-flight request whenever a newer one supersedes it, so a
  // slow earlier response can't land after newer results.
  const controllerRef = useRef<AbortController | null>(null);

  // Debounce only the typed query. Tag taps and the initial browse are
  // deliberate single actions and shouldn't wait.
  useEffect(() => {
    const trimmed = query.trim();
    const next: BrowseMode = trimmed
      ? { kind: 'search', query: trimmed }
      : tag
        ? { kind: 'tag', tag }
        : { kind: 'popular' };

    if (!trimmed) {
      setMode(current => (sameMode(current, next) ? current : next));
      return;
    }

    const timer = setTimeout(() => {
      setMode(current => (sameMode(current, next) ? current : next));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, tag]);

  // Load page 0 whenever the mode changes or a retry is requested.
  useEffect(() => {
    if (!source.isConfigured()) {
      setTracks([]);
      setError(new JamendoConfigError().message);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetchFor(source, mode, 0, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setTracks(result.tracks);
        setHasMore(result.hasMore);
        setPage(0);
      })
      .catch(err => {
        if (isAbort(err) || controller.signal.aborted) return;
        setTracks([]);
        setHasMore(false);
        setError(messageFor(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [source, mode, retryToken]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || error) return;

    const controller = new AbortController();
    setIsLoadingMore(true);

    fetchFor(source, mode, page + 1, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        // De-duplicate: paging by offset can repeat a track if the underlying
        // ordering shifts between requests.
        setTracks(current => {
          const seen = new Set(current.map(track => track.id));
          return [...current, ...result.tracks.filter(track => !seen.has(track.id))];
        });
        setHasMore(result.hasMore);
        setPage(current => current + 1);
      })
      .catch(err => {
        if (isAbort(err)) return;
        // A failed page-2 keeps what's already on screen; only the "load more"
        // affordance goes away.
        setHasMore(false);
      })
      .finally(() => setIsLoadingMore(false));
  }, [source, mode, page, hasMore, isLoading, isLoadingMore, error]);

  const retry = useCallback(() => setRetryToken(token => token + 1), []);

  const selectTag = useCallback((next: string | null) => {
    setQuery('');
    setTag(current => (current === next ? null : next));
  }, []);

  return {
    query,
    setQuery,
    tag,
    selectTag,
    mode,
    tracks,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    retry,
  };
};

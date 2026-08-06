import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { downloadService } from '../services/DownloadService';
import { MusicTrack } from '../types/MusicTypes';

/**
 * Subscribes to the download registry.
 *
 * The registry lives in a plain service rather than a context because
 * `MusicService` needs to consult it when resolving a track to play, and that
 * happens outside React — auto-advance never passes through a component.
 */
export const useDownloads = () => {
  const snapshot = useSyncExternalStore(
    downloadService.subscribe,
    downloadService.getSnapshot,
    downloadService.getSnapshot
  );

  useEffect(() => {
    void downloadService.hydrate();
  }, []);

  const entries = useMemo(
    () =>
      Object.values(snapshot.entries).sort((a, b) => b.downloadedAt - a.downloadedAt),
    [snapshot.entries]
  );

  const totalBytes = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.bytes, 0),
    [entries]
  );

  const download = useCallback((track: MusicTrack) => downloadService.download(track), []);
  const cancel = useCallback((trackId: string) => downloadService.cancel(trackId), []);
  const remove = useCallback((trackId: string) => downloadService.remove(trackId), []);
  const removeAll = useCallback(() => downloadService.removeAll(), []);

  return {
    ready: snapshot.ready,
    entries,
    totalBytes,
    isDownloaded: (trackId: string) => Boolean(snapshot.entries[trackId]),
    progressFor: (trackId: string) => snapshot.active[trackId],
    canDownload: downloadService.canDownload,
    download,
    cancel,
    remove,
    removeAll,
  };
};

import * as FileSystem from 'expo-file-system/legacy';
import { MusicTrack } from '../types/MusicTypes';
import { nativeIdOf, sourceOfId } from '../utils/trackId';
import { StorageService } from './StorageService';

/**
 * Offline copies of streamed tracks.
 *
 * Scope is deliberately narrow, and that is a licensing constraint rather than
 * a technical one. Jamendo's API terms say applications "must not be
 * specifically designed to cache the content nor offering an offline access to
 * the content", while `audiodownload_allowed` exists to signal whether an app
 * may "propose the possibility to download the track". The reading those two
 * reconcile to: a per-track download the user asks for is fine; an app that
 * hoards the catalogue is not.
 *
 * So: one track at a time, only on explicit request, only where the artist
 * allows it. No bulk download, no downloading favorites automatically, no
 * background sync. Please keep it that way.
 */

const REGISTRY_KEY = 'downloads';
const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ''}downloads/`;

export interface DownloadEntry {
  track: MusicTrack;
  /** `file://` location of the downloaded audio. */
  localUri: string;
  bytes: number;
  downloadedAt: number;
}

export interface DownloadProgress {
  trackId: string;
  /** 0–1, or null while the server has not reported a total size. */
  ratio: number | null;
}

export interface DownloadSnapshot {
  entries: Record<string, DownloadEntry>;
  active: Record<string, DownloadProgress>;
  ready: boolean;
}

const emptySnapshot: DownloadSnapshot = { entries: {}, active: {}, ready: false };

/** Filenames are derived from the id so they survive a metadata change. */
const fileNameFor = (track: MusicTrack): string => {
  const source = sourceOfId(track.id) ?? 'track';
  const native = nativeIdOf(track.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${source}-${native}.mp3`;
};

class DownloadService {
  private snapshot: DownloadSnapshot = emptySnapshot;
  private listeners = new Set<() => void>();
  private tasks = new Map<string, FileSystem.DownloadResumable>();
  private hydrating: Promise<void> | null = null;

  getSnapshot = (): DownloadSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(next: Partial<DownloadSnapshot>): void {
    // Replaced rather than mutated: `useSyncExternalStore` compares by identity.
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach(listener => listener());
  }

  private clearActive(trackId: string): void {
    if (!this.snapshot.active[trackId]) return;
    const active = { ...this.snapshot.active };
    delete active[trackId];
    this.emit({ active });
  }

  /** Loads the registry from disk. Safe to call repeatedly. */
  hydrate(): Promise<void> {
    if (!this.hydrating) {
      this.hydrating = (async () => {
        const entries = await StorageService.load<Record<string, DownloadEntry>>(
          REGISTRY_KEY,
          {}
        );
        // Drop entries whose file has gone — the OS can clear app storage, and
        // a registry pointing at a missing file would fail at playback time.
        const verified: Record<string, DownloadEntry> = {};
        await Promise.all(
          Object.entries(entries).map(async ([id, entry]) => {
            try {
              const info = await FileSystem.getInfoAsync(entry.localUri);
              if (info.exists) verified[id] = entry;
            } catch {
              // Unreadable counts as missing.
            }
          })
        );
        this.emit({ entries: verified, ready: true });
        if (Object.keys(verified).length !== Object.keys(entries).length) {
          await this.persist(verified);
        }
      })();
    }
    return this.hydrating;
  }

  private async persist(entries: Record<string, DownloadEntry>): Promise<void> {
    await StorageService.save(REGISTRY_KEY, entries);
  }

  isDownloaded = (trackId: string): boolean => Boolean(this.snapshot.entries[trackId]);

  /** The on-disk copy, if there is one. */
  localUriFor = (trackId: string): string | undefined =>
    this.snapshot.entries[trackId]?.localUri;

  isDownloading = (trackId: string): boolean => Boolean(this.snapshot.active[trackId]);

  /**
   * True when the app may offer to download this track: the rights holder has
   * to have allowed it, and there has to be a URL to fetch.
   */
  canDownload = (track: MusicTrack): boolean =>
    track.source !== 'local' && track.downloadAllowed === true && Boolean(track.downloadUri);

  async download(track: MusicTrack): Promise<void> {
    await this.hydrate();

    if (!this.canDownload(track)) {
      throw new Error('This artist has not made this track available for download.');
    }
    if (this.isDownloaded(track.id) || this.isDownloading(track.id)) return;

    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true }).catch(() => {
      // Already exists.
    });

    const target = `${DOWNLOAD_DIR}${fileNameFor(track)}`;

    const task = FileSystem.createDownloadResumable(
      track.downloadUri as string,
      target,
      {},
      progress => {
        const total = progress.totalBytesExpectedToWrite;
        this.emit({
          active: {
            ...this.snapshot.active,
            [track.id]: {
              trackId: track.id,
              // The server does not always send a length; show an
              // indeterminate spinner rather than a fake percentage.
              ratio: total > 0 ? Math.min(1, progress.totalBytesWritten / total) : null,
            },
          },
        });
      }
    );

    this.tasks.set(track.id, task);
    this.emit({
      active: { ...this.snapshot.active, [track.id]: { trackId: track.id, ratio: 0 } },
    });

    try {
      const result = await task.downloadAsync();
      // Undefined means the download was cancelled rather than finished.
      if (!result) return;

      const info = await FileSystem.getInfoAsync(result.uri);
      const entries = {
        ...this.snapshot.entries,
        [track.id]: {
          // Store the track as handed in, so the Downloads screen can list and
          // play it without the library or the network.
          track,
          localUri: result.uri,
          bytes: info.exists && 'size' in info ? info.size : 0,
          downloadedAt: Date.now(),
        },
      };
      this.emit({ entries });
      await this.persist(entries);
    } finally {
      this.tasks.delete(track.id);
      this.clearActive(track.id);
    }
  }

  async cancel(trackId: string): Promise<void> {
    const task = this.tasks.get(trackId);
    if (!task) return;
    try {
      await task.cancelAsync();
    } catch (error) {
      console.warn('Failed to cancel download:', error);
    }
    this.tasks.delete(trackId);
    this.clearActive(trackId);
  }

  async remove(trackId: string): Promise<void> {
    const entry = this.snapshot.entries[trackId];
    if (!entry) return;

    try {
      await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete downloaded file:', error);
    }

    const entries = { ...this.snapshot.entries };
    delete entries[trackId];
    this.emit({ entries });
    await this.persist(entries);
  }

  async removeAll(): Promise<void> {
    await Promise.all(Object.keys(this.snapshot.entries).map(id => this.remove(id)));
  }

  /** Total bytes on disk, for the storage line on the Downloads screen. */
  totalBytes = (): number =>
    Object.values(this.snapshot.entries).reduce((sum, entry) => sum + entry.bytes, 0);
}

export const downloadService = new DownloadService();

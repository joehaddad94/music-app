/**
 * Where a track came from. Tracks from different sources can share a native
 * id (a MediaLibrary asset id and a Jamendo track id are both just numbers),
 * so `MusicTrack.id` is always namespaced — see `utils/trackId.ts`.
 */
export type TrackSource = 'local' | 'jamendo';

export interface MusicTrack {
  /** Namespaced: `local:<assetId>` or `jamendo:<trackId>`. Never a bare id. */
  id: string;
  source: TrackSource;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  uri: string;
  albumArt?: string;
  /** Native artist id on the source platform, for "more by this artist". */
  artistId?: string;
  /**
   * The track's page on the source platform. Jamendo's API terms require a
   * direct backlink from each track in the app to its Jamendo page, so this
   * is not decorative — see `components/music/Attribution.tsx`.
   */
  sourceUrl?: string;
  /** Creative Commons deed for the track, when the source publishes one. */
  licenseUrl?: string;
  /**
   * Whether the rights holder permits downloading this track. Jamendo lets
   * artists opt out individually (`audiodownload_allowed`), and the download
   * endpoint 404s when they have.
   */
  downloadAllowed?: boolean;
  /** Direct download URL, only present when `downloadAllowed` is true. */
  downloadUri?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  /**
   * True while the player is fetching data rather than playing it. Always
   * false for local files in practice; it exists for streamed tracks, where
   * playback is not instant and silence without a spinner reads as a bug.
   */
  isBuffering: boolean;
  currentTrack: MusicTrack | null;
  position: number;
  duration: number;
  volume: number;
  repeatMode: 'none' | 'one' | 'all';
  shuffleMode: ShuffleMode;
  queue: MusicTrack[];
  currentIndex: number;
  originalQueue: MusicTrack[]; // For shuffle mode
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number; // epoch ms, JSON-friendly for persistence
}

/**
 * `smart` extends the queue with recommendations seeded from the current
 * track. It is only ever offered when the queue holds a track that can seed
 * one — a local file has no id the recommendation API would recognise.
 */
export type ShuffleMode = 'off' | 'on' | 'smart';

export type RepeatMode = 'none' | 'one' | 'all';
export type SortOption = 'title' | 'artist' | 'album' | 'duration';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  uri: string;
  albumArt?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  position: number;
  duration: number;
  volume: number;
  repeatMode: 'none' | 'one' | 'all';
  shuffleMode: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  createdAt: Date;
  updatedAt: Date;
}

export type RepeatMode = 'none' | 'one' | 'all';
export type SortOption = 'title' | 'artist' | 'album' | 'duration';

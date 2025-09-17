import { MusicTrack } from '../types/MusicTypes';

export const formatDuration = (milliseconds: number): string => {
  if (milliseconds === 0 || !milliseconds) {
    return '0:00';
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isAudioFile = (filename: string): boolean => {
  const audioExtensions = ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.mp4'];
  return audioExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/\.[^/.]+$/, ''); // Remove file extension
};

export const groupTracksByAlbum = (tracks: MusicTrack[]): Record<string, MusicTrack[]> => {
  return tracks.reduce((groups, track) => {
    const album = track.album || 'Unknown Album';
    if (!groups[album]) {
      groups[album] = [];
    }
    groups[album].push(track);
    return groups;
  }, {} as Record<string, MusicTrack[]>);
};

export const groupTracksByArtist = (tracks: MusicTrack[]): Record<string, MusicTrack[]> => {
  return tracks.reduce((groups, track) => {
    const artist = track.artist || 'Unknown Artist';
    if (!groups[artist]) {
      groups[artist] = [];
    }
    groups[artist].push(track);
    return groups;
  }, {} as Record<string, MusicTrack[]>);
};

export const sortTracks = (tracks: MusicTrack[], sortBy: 'title' | 'artist' | 'album' | 'duration'): MusicTrack[] => {
  return [...tracks].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'artist':
        return a.artist.localeCompare(b.artist);
      case 'album':
        return (a.album || '').localeCompare(b.album || '');
      case 'duration':
        return a.duration - b.duration;
      default:
        return 0;
    }
  });
};

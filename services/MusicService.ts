import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { MusicTrack, PlaybackState } from '../types/MusicTypes';

// Configure audio for background playback
Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});

class MusicService {
  private sound: Audio.Sound | null = null;
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 1.0,
    repeatMode: 'none',
    shuffleMode: false,
  };
  private listeners: ((state: PlaybackState) => void)[] = [];
  private positionUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  async scanMusicFiles(): Promise<MusicTrack[]> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Media library permission not granted');
      }

      // Get audio files with increased limit
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 5000, // Increased limit to get more files
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      // Filter for audio files (including MP4 audio)
      const audioExtensions = ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.mp4'];
      const audioAssets = media.assets.filter(asset => {
        const filename = asset.filename.toLowerCase();
        return audioExtensions.some(ext => filename.endsWith(ext));
      });

      console.log(`Found ${audioAssets.length} audio files out of ${media.assets.length} total media files`);

      const tracks: MusicTrack[] = await Promise.all(
        audioAssets.map(async (asset) => {
          // Try to get duration from the asset, fallback to 0 if not available
          let duration = 0;
          if (asset.duration && asset.duration > 0) {
            duration = asset.duration * 1000; // Convert seconds to milliseconds
          }
          
          return {
            id: asset.id,
            title: asset.filename.replace(/\.[^/.]+$/, ''), // Remove file extension
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: duration,
            uri: asset.uri,
            albumArt: asset.albumId ? await this.getAlbumArt(asset.albumId) : undefined,
          };
        })
      );

      return tracks;
    } catch (error) {
      console.error('Failed to scan music files:', error);
      return [];
    }
  }

  private async getAlbumArt(albumId: string): Promise<string | undefined> {
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        album: albumId,
        first: 1, // just get the first asset as cover
        mediaType: MediaLibrary.MediaType.photo,
      });
  
      return assets.assets[0]?.uri;
    } catch (error) {
      console.error('Failed to get album art:', error);
      return undefined;
    }
  }
  
  async loadTrack(track: MusicTrack): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: false, volume: this.playbackState.volume }
      );

      this.sound = sound;
      this.playbackState.currentTrack = track;
      this.playbackState.duration = track.duration;

      // Set up status update listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.playbackState.position = status.positionMillis || 0;
          this.playbackState.duration = status.durationMillis || 0;
          this.playbackState.isPlaying = status.isPlaying || false;
          this.notifyListeners();
        }
      });

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load track:', error);
    }
  }

  async play(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.playAsync();
        this.startPositionUpdates();
      } catch (error) {
        console.error('Failed to play:', error);
      }
    }
  }

  async pause(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.pauseAsync();
        this.stopPositionUpdates();
      } catch (error) {
        console.error('Failed to pause:', error);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        this.stopPositionUpdates();
        this.playbackState.position = 0;
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to stop:', error);
      }
    }
  }

  async seekTo(position: number): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.setPositionAsync(position);
      } catch (error) {
        console.error('Failed to seek:', error);
      }
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(volume);
        this.playbackState.volume = volume;
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to set volume:', error);
      }
    }
  }

  private startPositionUpdates(): void {
    this.stopPositionUpdates();
    this.positionUpdateInterval = setInterval(() => {
      if (this.sound) {
        this.sound.getStatusAsync().then((status) => {
          if (status.isLoaded) {
            const newPosition = status.positionMillis || 0;
            const newDuration = status.durationMillis || 0;
            const newIsPlaying = status.isPlaying || false;
            
            // Only update if values have actually changed
            if (
              this.playbackState.position !== newPosition ||
              this.playbackState.duration !== newDuration ||
              this.playbackState.isPlaying !== newIsPlaying
            ) {
              this.playbackState.position = newPosition;
              this.playbackState.duration = newDuration;
              this.playbackState.isPlaying = newIsPlaying;
              this.notifyListeners();
            }
          }
        });
      }
    }, 1000);
  }

  private stopPositionUpdates(): void {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
  }

  addListener(listener: (state: PlaybackState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: PlaybackState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.playbackState }));
  }

  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  async cleanup(): Promise<void> {
    this.stopPositionUpdates();
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export const musicService = new MusicService();

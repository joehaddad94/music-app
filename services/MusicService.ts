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
    queue: [],
    currentIndex: -1,
    originalQueue: [],
  };
  private listeners: ((state: PlaybackState) => void)[] = [];
  private positionUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeAudio();
  }

  private getMockMusicData(): MusicTrack[] {
    // Mock data for testing when permissions are not available
    return [
      {
        id: 'mock-1',
        title: 'Summer Breeze',
        artist: 'The Relaxers',
        album: 'Chill Vibes Vol. 1',
        duration: 234000, // 3:54
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      },
      {
        id: 'mock-2',
        title: 'Electric Dreams',
        artist: 'Synth Masters',
        album: 'Digital Waves',
        duration: 198000, // 3:18
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      },
      {
        id: 'mock-3',
        title: 'Midnight Jazz',
        artist: 'Cool Cats Quartet',
        album: 'Late Night Sessions',
        duration: 267000, // 4:27
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      },
      {
        id: 'mock-4',
        title: 'Mountain Echo',
        artist: 'Nature Sounds',
        album: 'Peaceful Landscapes',
        duration: 312000, // 5:12
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      },
      {
        id: 'mock-5',
        title: 'Urban Rhythm',
        artist: 'City Beats',
        album: 'Street Life',
        duration: 189000, // 3:09
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      },
      {
        id: 'mock-6',
        title: 'Ocean Waves',
        artist: 'Ambient Collective',
        album: 'Serenity',
        duration: 276000, // 4:36
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      },
      {
        id: 'mock-7',
        title: 'Rock Anthem',
        artist: 'The Thunder',
        album: 'Greatest Hits',
        duration: 243000, // 4:03
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      },
      {
        id: 'mock-8',
        title: 'Classical Suite',
        artist: 'Orchestra Ensemble',
        album: 'Timeless Classics',
        duration: 298000, // 4:58
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      },
    ];
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
      if (status !== 'granted') {
        console.warn('Media library permission denied. Status:', status);
      }
      return status === 'granted';
    } catch (error: any) {
      console.error('Permission request failed:', error);

      // Check if this is an Expo Go limitation
      if (error?.message?.includes('not declared in AndroidManifest')) {
        console.error('⚠️  Expo Go Limitation: This app requires a development build to access the full media library.');
        console.error('📱 To test with full functionality, create a development build:');
        console.error('   npx expo run:android');
        console.error('   or follow: https://docs.expo.dev/develop/development-builds/create-a-build/');
      }

      return false;
    }
  }

  async scanMusicFiles(): Promise<MusicTrack[]> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️  Using mock data for testing. To access your real music library, create a development build.');
        console.log('📱 Run: npx expo run:android');
        return this.getMockMusicData();
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

      // If no real music files found, offer mock data as fallback
      if (audioAssets.length === 0) {
        console.warn('⚠️  No music files found on device. Using mock data for testing.');
        return this.getMockMusicData();
      }

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
      console.warn('⚠️  Falling back to mock data due to error.');
      return this.getMockMusicData();
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
  
  // Queue Management
  setQueue(tracks: MusicTrack[], startIndex: number = 0): void {
    this.playbackState.queue = tracks;
    this.playbackState.originalQueue = [...tracks];
    this.playbackState.currentIndex = startIndex;

    if (this.playbackState.shuffleMode) {
      this.shuffleQueue();
    }

    this.notifyListeners();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private shuffleQueue(): void {
    if (this.playbackState.queue.length === 0) return;

    const currentTrack = this.playbackState.currentTrack;
    const shuffled = this.shuffleArray(this.playbackState.originalQueue);

    // If there's a current track, make sure it's first in the shuffled queue
    if (currentTrack) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        [shuffled[0], shuffled[currentIndex]] = [shuffled[currentIndex], shuffled[0]];
      }
      this.playbackState.currentIndex = 0;
    }

    this.playbackState.queue = shuffled;
  }

  private unshuffleQueue(): void {
    if (this.playbackState.originalQueue.length === 0) return;

    const currentTrack = this.playbackState.currentTrack;
    this.playbackState.queue = [...this.playbackState.originalQueue];

    // Find the current track in the original queue
    if (currentTrack) {
      const index = this.playbackState.queue.findIndex(t => t.id === currentTrack.id);
      this.playbackState.currentIndex = index >= 0 ? index : 0;
    }
  }

  toggleShuffle(): void {
    this.playbackState.shuffleMode = !this.playbackState.shuffleMode;

    if (this.playbackState.shuffleMode) {
      this.shuffleQueue();
    } else {
      this.unshuffleQueue();
    }

    this.notifyListeners();
  }

  setRepeatMode(mode: 'none' | 'one' | 'all'): void {
    this.playbackState.repeatMode = mode;
    this.notifyListeners();
  }

  async playNext(): Promise<void> {
    if (this.playbackState.queue.length === 0) return;

    let nextIndex = this.playbackState.currentIndex + 1;

    // Handle repeat modes
    if (nextIndex >= this.playbackState.queue.length) {
      if (this.playbackState.repeatMode === 'all') {
        nextIndex = 0; // Loop to start
      } else if (this.playbackState.repeatMode === 'one') {
        nextIndex = this.playbackState.currentIndex; // Replay current
      } else {
        // No more tracks and no repeat
        await this.stop();
        return;
      }
    }

    this.playbackState.currentIndex = nextIndex;
    const nextTrack = this.playbackState.queue[nextIndex];

    if (nextTrack) {
      await this.loadTrack(nextTrack);
      await this.play();
    }
  }

  async playPrevious(): Promise<void> {
    // If we're more than 3 seconds into the song, restart it
    if (this.playbackState.position > 3000) {
      await this.seekTo(0);
      return;
    }

    if (this.playbackState.queue.length === 0) return;

    let prevIndex = this.playbackState.currentIndex - 1;

    // Handle wraparound for repeat all
    if (prevIndex < 0) {
      if (this.playbackState.repeatMode === 'all') {
        prevIndex = this.playbackState.queue.length - 1;
      } else {
        prevIndex = 0; // Stay at first track
      }
    }

    this.playbackState.currentIndex = prevIndex;
    const prevTrack = this.playbackState.queue[prevIndex];

    if (prevTrack) {
      await this.loadTrack(prevTrack);
      await this.play();
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

      // Set up status update listener with track end detection
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.playbackState.position = status.positionMillis || 0;
          this.playbackState.duration = status.durationMillis || 0;
          this.playbackState.isPlaying = status.isPlaying || false;

          // Auto-play next track when current track finishes
          if (status.didJustFinish && !status.isLooping) {
            if (this.playbackState.repeatMode === 'one') {
              // Replay the same track
              this.play();
            } else {
              // Play next track
              this.playNext();
            }
          }

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

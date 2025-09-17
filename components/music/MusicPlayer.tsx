import React, { memo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useMusicPlayerDisplay } from '../../hooks/useMusicPlayerDisplay';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { IconSymbol } from '../ui/IconSymbol';
import MusicControls from './MusicControls';
import ProgressBar from './ProgressBar';

const { width } = Dimensions.get('window');

const MusicPlayer: React.FC = memo(() => {
  const { playbackState, shouldShowPlayer } = useMusicPlayerDisplay();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (!shouldShowPlayer || !playbackState.currentTrack) {
    return null;
  }

  const { currentTrack } = playbackState;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={styles.trackInfo}>
        <View style={styles.albumArtContainer}>
          {currentTrack.albumArt ? (
            <IconSymbol 
              size={80} 
              name="music.note" 
              color={colors.playingIndicator}
              style={styles.albumArt}
            />
          ) : (
            <IconSymbol 
              size={80} 
              name="music.note" 
              color={colors.playingIndicator}
              style={styles.albumArt}
            />
          )}
        </View>
        
        <View style={styles.trackDetails}>
          <ThemedText type="subtitle" numberOfLines={1} style={styles.title}>
            {currentTrack.title}
          </ThemedText>
          <ThemedText type="default" numberOfLines={1} style={styles.artist}>
            {currentTrack.artist}
          </ThemedText>
          {currentTrack.album && (
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.album}>
              {currentTrack.album}
            </ThemedText>
          )}
        </View>
      </View>

      <ProgressBar />

      <MusicControls />
    </ThemedView>
  );
});

MusicPlayer.displayName = 'MusicPlayer';

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderTopWidth: 1,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  albumArtContainer: {
    marginRight: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  albumArt: {
    borderRadius: 8,
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  artist: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  album: {
    fontSize: 12,
    opacity: 0.5,
  },
});

export default MusicPlayer;

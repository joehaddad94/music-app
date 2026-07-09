import React, { memo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useLibrary } from '../../contexts/LibraryContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useMusicPlayerDisplay } from '../../hooks/useMusicPlayerDisplay';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { IconSymbol } from '../ui/IconSymbol';
import MusicControls from './MusicControls';
import PlaylistPickerModal from './PlaylistPickerModal';
import ProgressBar from './ProgressBar';

const MusicPlayer: React.FC = memo(() => {
  const { playbackState, shouldShowPlayer } = useMusicPlayerDisplay();
  const { isFavorite, toggleFavorite } = useLibrary();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!shouldShowPlayer || !playbackState.currentTrack) {
    return null;
  }

  const { currentTrack } = playbackState;
  const favorited = isFavorite(currentTrack.id);

  return (
    <ThemedView style={[
      styles.container,
      {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 10), // Ensure it's above bottom notch
      }
    ]}>
      <View style={styles.trackInfo}>
        <View style={[styles.albumArtContainer, { backgroundColor: colors.tint + '20' }]}>
          {currentTrack.albumArt ? (
            <Image
              source={{ uri: currentTrack.albumArt }}
              style={styles.albumArt}
              resizeMode="cover"
            />
          ) : (
            <IconSymbol
              size={48}
              name="music.note"
              color={colors.playingIndicator}
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

        <View style={styles.trackActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleFavorite(currentTrack.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityState={{ selected: favorited }}
            accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <IconSymbol
              size={24}
              name={favorited ? 'heart.fill' : 'heart'}
              color={favorited ? colors.secondary : colors.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPickerOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Add to playlist"
          >
            <IconSymbol size={24} name="music.note.list" color={colors.icon} />
          </TouchableOpacity>
        </View>
      </View>

      <ProgressBar />

      <MusicControls />

      <PlaylistPickerModal
        visible={pickerOpen}
        trackId={currentTrack.id}
        onClose={() => setPickerOpen(false)}
      />
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
    width: 80,
    height: 80,
    marginRight: 15,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArt: {
    width: 80,
    height: 80,
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
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

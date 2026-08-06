import React, { memo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { MusicTrack } from '../../types/MusicTypes';
import { formatDuration } from '../../utils/musicUtils';
import { ThemedText } from '../ThemedText';
import { IconSymbol } from '../ui/IconSymbol';

/** Fixed so FlatList can use `getItemLayout` in both the library and Discover. */
export const TRACK_ITEM_HEIGHT = 74;

interface TrackRowProps {
  track: MusicTrack;
  isCurrent: boolean;
  isPlaying: boolean;
  onPress: (track: MusicTrack) => void;
}

/**
 * One track in a list. Shared by the on-device library and Discover so a
 * streamed track and a local file look and behave identically.
 */
const TrackRow: React.FC<TrackRowProps> = memo(({ track, isCurrent, isPlaying, onPress }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[
        styles.trackItem,
        { borderBottomColor: colors.border },
        isCurrent && { backgroundColor: colors.tint + '15' },
      ]}
      onPress={() => onPress(track)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Play ${track.title} by ${track.artist}`}
    >
      <View style={styles.trackInfo}>
        <View style={[styles.albumArtContainer, { backgroundColor: colors.tint + '15' }]}>
          {track.albumArt ? (
            <Image source={{ uri: track.albumArt }} style={styles.albumArtImage} resizeMode="cover" />
          ) : (
            <IconSymbol
              size={28}
              name="music.note"
              color={isCurrent ? colors.playingIndicator : colors.icon}
            />
          )}
        </View>

        <View style={styles.trackDetails}>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={1}
            style={[styles.trackTitle, isCurrent && { color: colors.playingIndicator }]}
          >
            {track.title}
          </ThemedText>
          <ThemedText type="default" numberOfLines={1} style={styles.trackArtist}>
            {track.artist}
          </ThemedText>
          {track.album && (
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.trackAlbum}>
              {track.album}
            </ThemedText>
          )}
        </View>
      </View>

      <View style={styles.trackMeta}>
        <ThemedText type="defaultSemiBold" style={styles.duration}>
          {formatDuration(track.duration)}
        </ThemedText>
        {isCurrent && isPlaying && (
          <IconSymbol
            size={16}
            name="speaker.wave.2.fill"
            color={colors.playingIndicator}
            style={styles.playingIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );
});

TrackRow.displayName = 'TrackRow';

const styles = StyleSheet.create({
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TRACK_ITEM_HEIGHT,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArtContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArtImage: {
    width: 50,
    height: 50,
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 1,
  },
  trackAlbum: {
    fontSize: 12,
    opacity: 0.5,
  },
  trackMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  duration: {
    fontSize: 12,
    opacity: 0.6,
  },
  playingIcon: {
    marginTop: 4,
  },
});

export default TrackRow;

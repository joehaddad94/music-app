import { router } from 'expo-router';
import React, { memo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useLibrary } from '../../contexts/LibraryContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useDownloads } from '../../hooks/useDownloads';
import { MusicTrack } from '../../types/MusicTypes';
import { formatDuration } from '../../utils/musicUtils';
import { ThemedText } from '../ThemedText';
import { IconSymbol } from '../ui/IconSymbol';
import DownloadButton from './DownloadButton';

/** Fixed so FlatList can use `getItemLayout` in every listing. */
export const TRACK_ITEM_HEIGHT = 74;

interface TrackRowProps {
  track: MusicTrack;
  isCurrent: boolean;
  isPlaying: boolean;
  onPress: (track: MusicTrack) => void;
  /**
   * Streamed track that cannot be played right now — offline with no local
   * copy. Dimmed and inert rather than hidden, so the list does not
   * reshuffle itself the moment a connection drops.
   */
  unavailable?: boolean;
  /**
   * Hides the favourite and download controls. Used where the row already
   * sits beside its own actions, such as the Downloads screen.
   */
  hideActions?: boolean;
}

/**
 * One track in a list. Shared by every listing so a streamed track and a
 * local file look and behave identically.
 *
 * The favourite and download controls live here rather than only in the
 * player, because deciding what to keep is something you do while browsing —
 * previously you had to play a track before you could save it.
 */
const TrackRow: React.FC<TrackRowProps> = memo(
  ({ track, isCurrent, isPlaying, onPress, unavailable, hideActions }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { isFavorite, toggleFavorite } = useLibrary();
    const { isDownloaded } = useDownloads();

    const favorited = isFavorite(track.id);
    const downloaded = isDownloaded(track.id);

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          { borderBottomColor: colors.border },
          isCurrent && { backgroundColor: colors.tint + '15' },
          unavailable && styles.unavailable,
        ]}
        onPress={() => onPress(track)}
        activeOpacity={0.7}
        disabled={unavailable}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(unavailable) }}
        accessibilityLabel={
          unavailable
            ? `${track.title} by ${track.artist}, unavailable offline`
            : `Play ${track.title} by ${track.artist}`
        }
      >
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

          <View style={styles.subtitleRow}>
            {track.artistId ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/artist/[id]',
                    params: { id: track.artistId as string, name: track.artist },
                  })
                }
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                accessibilityRole="link"
                accessibilityLabel={`More by ${track.artist}`}
              >
                <ThemedText numberOfLines={1} style={[styles.trackArtist, { color: colors.tint }]}>
                  {track.artist}
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <ThemedText numberOfLines={1} style={styles.trackArtist}>
                {track.artist}
              </ThemedText>
            )}

            {downloaded && (
              <IconSymbol
                size={12}
                name="arrow.down.circle.fill"
                color={colors.success}
                style={styles.downloadedMark}
              />
            )}
          </View>

          <ThemedText style={styles.duration}>{formatDuration(track.duration)}</ThemedText>
        </View>

        {isCurrent && isPlaying && (
          <IconSymbol
            size={16}
            name="speaker.wave.2.fill"
            color={colors.playingIndicator}
            style={styles.playingIcon}
          />
        )}

        {!hideActions && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => toggleFavorite(track)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={styles.action}
              accessibilityRole="button"
              accessibilityState={{ selected: favorited }}
              accessibilityLabel={
                favorited
                  ? `Remove ${track.title} from favorites`
                  : `Add ${track.title} to favorites`
              }
            >
              <IconSymbol
                size={20}
                name={favorited ? 'heart.fill' : 'heart'}
                color={favorited ? colors.secondary : colors.icon}
              />
            </TouchableOpacity>

            <DownloadButton track={track} compact />
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

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
    fontSize: 15,
    fontWeight: '600',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  trackArtist: {
    fontSize: 13,
    opacity: 0.8,
    flexShrink: 1,
  },
  downloadedMark: {
    marginLeft: 6,
  },
  duration: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 1,
  },
  playingIcon: {
    marginRight: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    paddingHorizontal: 4,
  },
  unavailable: {
    opacity: 0.4,
  },
});

export default TrackRow;

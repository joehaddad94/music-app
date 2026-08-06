import React, { memo, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useMusic } from '../../contexts/MusicContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { formatDuration } from '../../utils/musicUtils';
import { ThemedText } from '../ThemedText';
import { IconSymbol } from '../ui/IconSymbol';

/**
 * What is playing next.
 *
 * Exists mainly because of smart shuffle: once the app starts inserting
 * tracks the user did not pick, there has to be somewhere to see what they
 * are and that they came from a recommendation. Otherwise the queue changes
 * under you for no visible reason.
 */
const QueueList: React.FC = memo(() => {
  const { playbackState, playTrack } = useMusic();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { queue, currentIndex, recommendedTrackIds } = playbackState;
  const recommended = useMemo(() => new Set(recommendedTrackIds), [recommendedTrackIds]);

  const upcoming = useMemo(
    () => queue.slice(Math.max(0, currentIndex)),
    [queue, currentIndex]
  );

  if (upcoming.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="default" style={styles.emptyText}>
          Nothing queued.
        </ThemedText>
      </View>
    );
  }

  return (
    <View>
      {upcoming.map((track, offset) => {
        const isCurrent = offset === 0 && currentIndex >= 0;
        const isRecommended = recommended.has(track.id);

        return (
          <TouchableOpacity
            key={`${track.id}-${offset}`}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => playTrack(track, queue)}
            disabled={isCurrent}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              `${isCurrent ? 'Now playing' : 'Play'} ${track.title} by ${track.artist}` +
              (isRecommended ? ', recommended' : '')
            }
          >
            <View style={styles.leading}>
              {isCurrent ? (
                <IconSymbol size={16} name="speaker.wave.2.fill" color={colors.playingIndicator} />
              ) : (
                <ThemedText style={styles.position}>{offset}</ThemedText>
              )}
            </View>

            <View style={styles.details}>
              <ThemedText
                type="defaultSemiBold"
                numberOfLines={1}
                style={[styles.title, isCurrent && { color: colors.playingIndicator }]}
              >
                {track.title}
              </ThemedText>
              <View style={styles.subtitleRow}>
                <ThemedText numberOfLines={1} style={styles.artist}>
                  {track.artist}
                </ThemedText>
                {isRecommended && (
                  <View style={[styles.badge, { backgroundColor: colors.accent + '25' }]}>
                    <ThemedText style={[styles.badgeText, { color: colors.accent }]}>
                      Recommended
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            <ThemedText style={styles.duration}>{formatDuration(track.duration)}</ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

QueueList.displayName = 'QueueList';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leading: {
    width: 28,
    alignItems: 'center',
  },
  position: {
    fontSize: 12,
    opacity: 0.5,
  },
  details: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 15,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  artist: {
    fontSize: 12,
    opacity: 0.7,
    flexShrink: 1,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  duration: {
    fontSize: 12,
    opacity: 0.5,
    marginLeft: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    opacity: 0.6,
  },
});

export default QueueList;

import { router } from 'expo-router';
import React, { memo } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useMusic } from '../../contexts/MusicContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';
import { IconSymbol } from '../ui/IconSymbol';

/** Height of the bar itself, before safe-area padding. */
export const MINI_PLAYER_HEIGHT = 64;

/**
 * The persistent playback bar.
 *
 * Deliberately small. The previous player showed artwork, three text lines,
 * attribution, a scrubber, a volume slider and five controls on every screen —
 * roughly 40% of a phone display, permanently, with no way to dismiss it. That
 * left very little room for the browsing it sat on top of.
 *
 * This shows only what is needed to know what is playing and to stop it. Tap
 * to open the full player.
 */
const MiniPlayer: React.FC = memo(() => {
  const { playbackState, play, pause, stop } = useMusic();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const { currentTrack, isPlaying, isBuffering } = playbackState;
  if (!currentTrack) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom > 0 ? 6 : 0,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.main}
        onPress={() => router.push('/player')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Now playing ${currentTrack.title} by ${currentTrack.artist}. Open player.`}
      >
        <View style={[styles.artwork, { backgroundColor: colors.tint + '20' }]}>
          {currentTrack.albumArt ? (
            <Image source={{ uri: currentTrack.albumArt }} style={styles.artworkImage} />
          ) : (
            <IconSymbol size={22} name="music.note" color={colors.playingIndicator} />
          )}
          {isBuffering && (
            <View style={[styles.buffering, { backgroundColor: colors.card + 'CC' }]}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          )}
        </View>

        <View style={styles.text}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
            {currentTrack.title}
          </ThemedText>
          <ThemedText type="default" numberOfLines={1} style={styles.artist}>
            {currentTrack.artist}
          </ThemedText>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => (isPlaying ? pause() : play())}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      >
        <IconSymbol size={28} name={isPlaying ? 'pause.fill' : 'play.fill'} color={colors.text} />
      </TouchableOpacity>

      {/* The only way out. `stop()` existed from the start but nothing called
          it, so the player could never be dismissed once it appeared. */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => stop()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Stop and close player"
      >
        <IconSymbol size={22} name="xmark" color={colors.icon} />
      </TouchableOpacity>
    </View>
  );
});

MiniPlayer.displayName = 'MiniPlayer';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MINI_PLAYER_HEIGHT,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  artworkImage: {
    width: 44,
    height: 44,
  },
  buffering: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 14,
  },
  artist: {
    fontSize: 12,
    opacity: 0.7,
  },
  button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});

export default MiniPlayer;

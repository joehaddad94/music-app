import { TrackAttribution } from '@/components/music/Attribution';
import DownloadButton from '@/components/music/DownloadButton';
import MusicControls from '@/components/music/MusicControls';
import PlaylistPickerModal from '@/components/music/PlaylistPickerModal';
import ProgressBar from '@/components/music/ProgressBar';
import QueueList from '@/components/music/QueueList';
import VolumeSlider from '@/components/music/VolumeSlider';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useLibrary } from '@/contexts/LibraryContext';
import { useMusic } from '@/contexts/MusicContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * The full player, opened from the mini bar.
 *
 * Everything that used to sit permanently at the bottom of every screen lives
 * here instead: artwork, scrubber, volume, attribution, and the queue.
 */
export default function PlayerScreen() {
  const { playbackState } = useMusic();
  const { isFavorite, toggleFavorite } = useLibrary();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const { currentTrack, isBuffering } = playbackState;

  // Stopping playback from elsewhere (or the queue running out) leaves nothing
  // to show, so close rather than sit on an empty screen.
  useEffect(() => {
    if (!currentTrack && router.canGoBack()) {
      router.back();
    }
  }, [currentTrack]);

  if (!currentTrack) return null;

  const favorited = isFavorite(currentTrack.id);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: showQueue ? 'Up Next' : 'Now Playing' }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showQueue ? (
          <QueueList />
        ) : (
          <>
            <View style={[styles.artwork, { backgroundColor: colors.tint + '18' }]}>
              {currentTrack.albumArt ? (
                <Image source={{ uri: currentTrack.albumArt }} style={styles.artworkImage} resizeMode="cover" />
              ) : (
                <IconSymbol size={96} name="music.note" color={colors.playingIndicator} />
              )}
              {isBuffering && (
                <View style={[styles.buffering, { backgroundColor: colors.card + 'CC' }]}>
                  <ActivityIndicator size="large" color={colors.tint} />
                </View>
              )}
            </View>

            <View style={styles.meta}>
              <ThemedText type="title" numberOfLines={2} style={styles.title}>
                {currentTrack.title}
              </ThemedText>

              {currentTrack.artistId ? (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/artist/[id]',
                      params: { id: currentTrack.artistId as string, name: currentTrack.artist },
                    })
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`More by ${currentTrack.artist}`}
                >
                  <ThemedText numberOfLines={1} style={[styles.artist, { color: colors.tint }]}>
                    {currentTrack.artist}
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                <ThemedText numberOfLines={1} style={styles.artist}>
                  {currentTrack.artist}
                </ThemedText>
              )}

              {currentTrack.album && (
                <ThemedText numberOfLines={1} style={styles.album}>
                  {currentTrack.album}
                </ThemedText>
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.action}
                onPress={() => toggleFavorite(currentTrack)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityState={{ selected: favorited }}
                accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <IconSymbol
                  size={26}
                  name={favorited ? 'heart.fill' : 'heart'}
                  color={favorited ? colors.secondary : colors.icon}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.action}
                onPress={() => setPickerOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Add to playlist"
              >
                <IconSymbol size={26} name="music.note.list" color={colors.icon} />
              </TouchableOpacity>

              <DownloadButton track={currentTrack} />
            </View>

            <TrackAttribution track={currentTrack} />
            <ProgressBar />
            <VolumeSlider />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <MusicControls />

        <TouchableOpacity
          style={styles.queueToggle}
          onPress={() => setShowQueue(value => !value)}
          accessibilityRole="button"
          accessibilityState={{ selected: showQueue }}
          accessibilityLabel={showQueue ? 'Show now playing' : 'Show queue'}
        >
          <IconSymbol size={20} name="music.note.list" color={showQueue ? colors.tint : colors.icon} />
          <ThemedText style={[styles.queueToggleText, showQueue && { color: colors.tint }]}>
            {showQueue ? 'Now Playing' : 'Up Next'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <PlaylistPickerModal
        visible={pickerOpen}
        track={currentTrack}
        onClose={() => setPickerOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 8,
  },
  artwork: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  buffering: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  artist: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  album: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  action: {
    padding: 6,
    marginRight: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 12,
  },
  queueToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
  },
  queueToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

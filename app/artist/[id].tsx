import { SourceCredit } from '@/components/music/Attribution';
import MiniPlayer, { MINI_PLAYER_HEIGHT } from '@/components/music/MiniPlayer';
import TrackRow, { TRACK_ITEM_HEIGHT } from '@/components/music/TrackRow';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useMusic } from '@/contexts/MusicContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { JamendoClient } from '@/services/JamendoClient';
import { jamendoSource } from '@/services/MusicSources';
import { MusicTrack } from '@/types/MusicTypes';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

export default function ArtistScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { playbackState, playTrack } = useMusic();

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    JamendoClient.artistTracks(id, 0, controller.signal)
      .then(page => {
        if (controller.signal.aborted) return;
        setTracks(page.tracks);
      })
      .catch(err => {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        setError(err instanceof Error ? err.message : 'Could not load this artist.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, attempt]);

  const handlePress = useCallback(
    (track: MusicTrack) => {
      playTrack(track, tracks);
    },
    [playTrack, tracks]
  );

  const renderItem = useCallback(
    ({ item }: { item: MusicTrack }) => (
      <TrackRow
        track={item}
        isCurrent={playbackState.currentTrack?.id === item.id}
        isPlaying={playbackState.isPlaying}
        onPress={handlePress}
      />
    ),
    [handlePress, playbackState.currentTrack?.id, playbackState.isPlaying]
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: name || 'Artist' }} />

      {isLoading ? (
        <ThemedView style={styles.state}>
          <ActivityIndicator size="large" color={colors.tint} />
        </ThemedView>
      ) : error ? (
        <ThemedView style={styles.state}>
          <IconSymbol size={44} name="exclamationmark.triangle.fill" color={colors.warning} />
          <ThemedText type="default" style={styles.stateText}>
            {error}
          </ThemedText>
          <TouchableOpacity
            style={[styles.retry, { backgroundColor: colors.tint }]}
            onPress={() => setAttempt(value => value + 1)}
            accessibilityRole="button"
          >
            <ThemedText style={styles.retryText}>Try again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <ThemedView style={styles.state}>
              <ThemedText type="default" style={styles.stateText}>
                No tracks found for this artist.
              </ThemedText>
            </ThemedView>
          }
          ListFooterComponent={
            tracks.length > 0 ? <SourceCredit label={jamendoSource.credit} /> : null
          }
          contentContainerStyle={[
            styles.list,
            playbackState.currentTrack && styles.listWithPlayer,
          ]}
          getItemLayout={(_, index) => ({
            length: TRACK_ITEM_HEIGHT,
            offset: TRACK_ITEM_HEIGHT * index,
            index,
          })}
        />
      )}

      <MiniPlayer />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingBottom: 20,
  },
  listWithPlayer: {
    paddingBottom: MINI_PLAYER_HEIGHT + 20,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  stateText: {
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.75,
  },
  retry: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
});

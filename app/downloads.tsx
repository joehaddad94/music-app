import TrackRow, { TRACK_ITEM_HEIGHT } from '@/components/music/TrackRow';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useMusic } from '@/contexts/MusicContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDownloads } from '@/hooks/useDownloads';
import { DownloadEntry } from '@/services/DownloadService';
import { MusicTrack } from '@/types/MusicTypes';
import { Stack } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`;
};

export default function DownloadsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { playbackState, playTrack } = useMusic();
  const { entries, totalBytes, remove, removeAll } = useDownloads();

  const tracks = entries.map(entry => entry.track);

  const handlePlay = useCallback(
    (track: MusicTrack) => {
      playTrack(track, tracks);
    },
    [playTrack, tracks]
  );

  const confirmRemove = useCallback(
    (entry: DownloadEntry) => {
      Alert.alert('Remove download', `Delete the offline copy of “${entry.track.title}”?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(entry.track.id) },
      ]);
    },
    [remove]
  );

  const confirmRemoveAll = useCallback(() => {
    Alert.alert('Remove all downloads', `Delete all ${entries.length} offline copies?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: () => void removeAll() },
    ]);
  }, [entries.length, removeAll]);

  const renderItem = useCallback(
    ({ item }: { item: DownloadEntry }) => (
      <View style={styles.row}>
        <View style={styles.rowTrack}>
          <TrackRow
            track={item.track}
            isCurrent={playbackState.currentTrack?.id === item.track.id}
            isPlaying={playbackState.isPlaying}
            onPress={handlePlay}
          />
        </View>
        <TouchableOpacity
          style={styles.rowAction}
          onPress={() => confirmRemove(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Delete offline copy of ${item.track.title}`}
        >
          <IconSymbol size={20} name="trash" color={colors.icon} />
        </TouchableOpacity>
      </View>
    ),
    [playbackState.currentTrack?.id, playbackState.isPlaying, handlePlay, confirmRemove, colors.icon]
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Downloads' }} />

      <ThemedView style={[styles.summary, { borderBottomColor: colors.border }]}>
        <ThemedText type="default" style={styles.summaryText}>
          {entries.length === 0
            ? 'No offline tracks'
            : `${entries.length} ${entries.length === 1 ? 'track' : 'tracks'} · ${formatBytes(totalBytes)}`}
        </ThemedText>
        {entries.length > 0 && (
          <TouchableOpacity onPress={confirmRemoveAll} accessibilityRole="button">
            <ThemedText style={[styles.clearAll, { color: colors.secondary }]}>Remove all</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={entry => entry.track.id}
        ListEmptyComponent={
          <ThemedView style={styles.empty}>
            <IconSymbol size={48} name="arrow.down.circle" color={colors.icon} />
            <ThemedText type="default" style={styles.emptyText}>
              Tracks you save for offline listening appear here. Use the download button on
              the player — it shows only for tracks the artist has allowed downloading.
            </ThemedText>
          </ThemedView>
        }
        getItemLayout={(_, index) => ({
          length: TRACK_ITEM_HEIGHT,
          offset: TRACK_ITEM_HEIGHT * index,
          index,
        })}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 14,
    opacity: 0.7,
  },
  clearAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTrack: {
    flex: 1,
  },
  rowAction: {
    paddingHorizontal: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
});

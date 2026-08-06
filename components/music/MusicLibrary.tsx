import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { MusicTrack } from '../../types/MusicTypes';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { IconSymbol } from '../ui/IconSymbol';
import SearchBar from './SearchBar';
import TrackRow, { TRACK_ITEM_HEIGHT } from './TrackRow';

interface MusicLibraryProps {
  onTrackSelect?: (track: MusicTrack) => void;
  hasPlayer?: boolean;
}

const MusicLibrary: React.FC<MusicLibraryProps> = memo(({ onTrackSelect, hasPlayer }) => {
  const {
    tracks,
    totalTracks,
    playbackState,
    isLoading,
    searchQuery,
    setSearchQuery,
    handleTrackPress,
    handleRefresh,
  } = useMusicLibrary();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const onTrackPress = useCallback((track: MusicTrack) => {
    handleTrackPress(track);
    onTrackSelect?.(track);
  }, [handleTrackPress, onTrackSelect]);

  const renderTrackItem = useCallback(({ item }: { item: MusicTrack }) => (
    <TrackRow
      track={item}
      isCurrent={playbackState.currentTrack?.id === item.id}
      isPlaying={playbackState.isPlaying}
      onPress={onTrackPress}
    />
  ), [onTrackPress, playbackState.currentTrack?.id, playbackState.isPlaying]);


  const keyExtractor = useCallback((item: MusicTrack) => item.id, []);

  if (isLoading && totalTracks === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText type="default" style={styles.loadingText}>
          Scanning for music files...
        </ThemedText>
      </ThemedView>
    );
  }

  if (totalTracks === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <IconSymbol size={64} name="music.note" color={colors.text} />
        <ThemedText type="title" style={styles.emptyTitle}>
          No Music Found
        </ThemedText>
        <ThemedText type="default" style={styles.emptySubtitle}>
          Make sure you have music files (.mp3, .mp4, .m4a, etc.) on your device and grant the necessary permissions.
        </ThemedText>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.tint }]}
          onPress={handleRefresh}
        >
          <ThemedText style={styles.refreshButtonText}>Scan Again</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <FlatList
        data={tracks}
        renderItem={renderTrackItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <ThemedView style={styles.noResultsContainer}>
            <IconSymbol size={40} name="magnifyingglass" color={colors.icon} />
            <ThemedText type="default" style={styles.noResultsText}>
              No matches for “{searchQuery.trim()}”
            </ThemedText>
          </ThemedView>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer,
          hasPlayer && { paddingBottom: 240 } // Add padding when player is visible
        ]}
        getItemLayout={(data, index) => ({
          length: TRACK_ITEM_HEIGHT,
          offset: TRACK_ITEM_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={12}
      />
    </ThemedView>
  );
});

MusicLibrary.displayName = 'MusicLibrary';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  noResultsText: {
    marginTop: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  refreshButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default MusicLibrary;

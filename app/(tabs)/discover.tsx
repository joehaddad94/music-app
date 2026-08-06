import { SourceCredit } from '@/components/music/Attribution';
import MusicPlayer from '@/components/music/MusicPlayer';
import SearchBar from '@/components/music/SearchBar';
import TrackRow, { TRACK_ITEM_HEIGHT } from '@/components/music/TrackRow';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useMusic } from '@/contexts/MusicContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDownloads } from '@/hooks/useDownloads';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useRemoteSearch } from '@/hooks/useRemoteSearch';
import { BROWSE_TAGS, jamendoSource } from '@/services/MusicSources';
import { MusicTrack } from '@/types/MusicTypes';
import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { playbackState, playTrack } = useMusic();
  const isOffline = useIsOffline();
  const { isDownloaded } = useDownloads();
  const {
    query,
    setQuery,
    tag,
    selectTag,
    tracks,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    retry,
  } = useRemoteSearch(jamendoSource);

  // Queue the whole visible result set, so next/previous walk the listing the
  // user is actually looking at rather than their on-device library.
  const handleTrackPress = useCallback(
    (track: MusicTrack) => {
      playTrack(track, tracks);
    },
    [playTrack, tracks]
  );

  const renderTrack = useCallback(
    ({ item }: { item: MusicTrack }) => (
      <TrackRow
        track={item}
        isCurrent={playbackState.currentTrack?.id === item.id}
        isPlaying={playbackState.isPlaying}
        onPress={handleTrackPress}
        // A downloaded track plays from disk, so it stays available offline.
        unavailable={isOffline && !isDownloaded(item.id)}
      />
    ),
    [handleTrackPress, playbackState.currentTrack?.id, playbackState.isPlaying, isOffline, isDownloaded]
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    if (error) {
      return (
        <ThemedView style={styles.stateContainer}>
          <IconSymbol size={44} name="exclamationmark.triangle.fill" color={colors.warning} />
          <ThemedText type="default" style={styles.stateText}>
            {error}
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={retry}
            accessibilityRole="button"
          >
            <ThemedText style={styles.retryText}>Try again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.stateContainer}>
        <IconSymbol size={44} name="magnifyingglass" color={colors.icon} />
        <ThemedText type="default" style={styles.stateText}>
          {query.trim() ? `No results for “${query.trim()}”` : 'Nothing to show yet.'}
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ThemedView style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText type="title" style={[styles.headerTitle, { color: colors.tint }]}>
          Discover
        </ThemedText>
      </ThemedView>

      {isOffline && (
        <ThemedView style={[styles.offlineBanner, { backgroundColor: colors.warning + '22' }]}>
          <IconSymbol size={16} name="exclamationmark.triangle.fill" color={colors.warning} />
          <ThemedText type="default" style={styles.offlineText}>
            You’re offline. Downloaded tracks still play.
          </ThemedText>
        </ThemedView>
      )}

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search Jamendo for songs and artists"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRow}
        style={styles.tagScroll}
      >
        {BROWSE_TAGS.map(item => {
          const selected = tag === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => selectTag(item)}
              style={[
                styles.tag,
                { borderColor: colors.border, backgroundColor: selected ? colors.tint : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <ThemedText style={[styles.tagText, selected && styles.tagTextSelected]}>
                {item}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ThemedView style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </ThemedView>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            <View>
              {isLoadingMore && <ActivityIndicator style={styles.footerSpinner} color={colors.tint} />}
              {tracks.length > 0 && <SourceCredit label={jamendoSource.credit} />}
            </View>
          }
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            playbackState.currentTrack && styles.listContentWithPlayer,
          ]}
          getItemLayout={(_, index) => ({
            length: TRACK_ITEM_HEIGHT,
            offset: TRACK_ITEM_HEIGHT * index,
            index,
          })}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={12}
        />
      )}

      {playbackState.currentTrack && (
        <ThemedView
          style={[
            styles.playerContainer,
            {
              borderTopColor: colors.border,
              backgroundColor: colorScheme === 'dark' ? colors.background : 'rgba(255,255,255,0.98)',
            },
          ]}
        >
          <MusicPlayer />
        </ThemedView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  offlineText: {
    fontSize: 13,
    flexShrink: 1,
  },
  tagScroll: {
    flexGrow: 0,
  },
  tagRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentWithPlayer: {
    paddingBottom: 240,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  stateText: {
    marginTop: 12,
    opacity: 0.75,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  footerSpinner: {
    marginVertical: 16,
  },
  playerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});

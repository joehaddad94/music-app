import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { MusicTrack } from '../../types/MusicTypes';
import { formatDuration } from '../../utils/musicUtils';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { IconSymbol } from '../ui/IconSymbol';

interface MusicLibraryProps {
  onTrackSelect?: (track: MusicTrack) => void;
}

const MusicLibrary: React.FC<MusicLibraryProps> = memo(({ onTrackSelect }) => {
  const { tracks, playbackState, isLoading, handleTrackPress, handleRefresh } = useMusicLibrary();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const onTrackPress = useCallback((track: MusicTrack) => {
    handleTrackPress(track);
    onTrackSelect?.(track);
  }, [handleTrackPress, onTrackSelect]);

  const renderTrackItem = useCallback(({ item }: { item: MusicTrack }) => {
    const isCurrentTrack = playbackState.currentTrack?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          isCurrentTrack && { backgroundColor: colors.tint + '20' }
        ]}
        onPress={() => onTrackPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.trackInfo}>
          <View style={styles.albumArtContainer}>
            <IconSymbol
              size={40}
              name="music.note"
              color={isCurrentTrack ? colors.tint : colors.text}
            />
          </View>
          
          <View style={styles.trackDetails}>
            <ThemedText 
              type="defaultSemiBold" 
              numberOfLines={1}
              style={[
                styles.trackTitle,
                isCurrentTrack && { color: colors.tint }
              ]}
            >
              {item.title}
            </ThemedText>
            <ThemedText 
              type="default" 
              numberOfLines={1}
              style={styles.trackArtist}
            >
              {item.artist}
            </ThemedText>
            {item.album && (
              <ThemedText 
                type="defaultSemiBold" 
                numberOfLines={1}
                style={styles.trackAlbum}
              >
                {item.album}
              </ThemedText>
            )}
          </View>
        </View>
        
        <View style={styles.trackMeta}>
          <ThemedText type="defaultSemiBold" style={styles.duration}>
            {formatDuration(item.duration)}
          </ThemedText>
          {isCurrentTrack && playbackState.isPlaying && (
            <IconSymbol
              size={16}
              name="speaker.wave.2.fill"
              color={colors.tint}
              style={styles.playingIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [onTrackPress, playbackState, colors]);


  const keyExtractor = useCallback((item: MusicTrack) => item.id, []);

  if (isLoading && tracks.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText type="default" style={styles.loadingText}>
          Scanning for music files...
        </ThemedText>
      </ThemedView>
    );
  }

  if (tracks.length === 0) {
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
      <FlatList
        data={tracks}
        renderItem={renderTrackItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
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
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArtContainer: {
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
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

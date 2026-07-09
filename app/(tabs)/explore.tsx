import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TextPromptModal from '@/components/music/TextPromptModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useLibrary } from '@/contexts/LibraryContext';
import { useMusic } from '@/contexts/MusicContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MusicTrack, Playlist } from '@/types/MusicTypes';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlaylistsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { tracks, playTrack } = useMusic();
  const { favorites, playlists, createPlaylist, deletePlaylist } = useLibrary();
  const [creating, setCreating] = useState(false);

  const trackMap = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);

  const resolve = (ids: string[]): MusicTrack[] =>
    ids.map(id => trackMap.get(id)).filter((t): t is MusicTrack => Boolean(t));

  const playQueue = (queue: MusicTrack[]) => {
    if (queue.length === 0) return;
    playTrack(queue[0], queue);
  };

  const handlePlayFavorites = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const queue = resolve(favorites);
    if (queue.length === 0) {
      Alert.alert('No favorites yet', 'Tap the heart on a playing track to add it to your favorites.');
      return;
    }
    playQueue(queue);
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const queue = resolve(playlist.trackIds);
    if (queue.length === 0) {
      Alert.alert('Empty playlist', 'Add songs from the player’s “add to playlist” button.');
      return;
    }
    playQueue(queue);
  };

  const handleShuffleAll = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tracks.length === 0) return;
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playQueue(shuffled);
  };

  const handleCreate = (name: string) => {
    createPlaylist(name);
    setCreating(false);
  };

  const confirmDelete = (playlist: Playlist) => {
    Alert.alert('Delete playlist', `Delete “${playlist.name}”? This can’t be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(playlist.id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Playlists
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Smart Playlists
          </ThemedText>

          <TouchableOpacity
            style={[styles.playlistItem, { borderBottomColor: colors.border }]}
            onPress={handlePlayFavorites}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Play favorites, ${favorites.length} songs`}
          >
            <View style={styles.playlistInfo}>
              <View style={[styles.playlistIcon, { backgroundColor: colors.secondary + '20' }]}>
                <IconSymbol size={24} name="heart.fill" color={colors.secondary} />
              </View>
              <View style={styles.playlistDetails}>
                <ThemedText type="defaultSemiBold" style={styles.playlistName}>
                  Favorites
                </ThemedText>
                <ThemedText type="default" style={styles.playlistCount}>
                  {favorites.length} {favorites.length === 1 ? 'song' : 'songs'}
                </ThemedText>
              </View>
            </View>
            <IconSymbol size={20} name="play.fill" color={colors.icon} style={styles.chevron} />
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Playlists
          </ThemedText>

          {playlists.length === 0 ? (
            <ThemedText type="default" style={styles.emptyText}>
              No playlists yet. Create one below, or use the “add to playlist” button on the player.
            </ThemedText>
          ) : (
            playlists.map(playlist => (
              <TouchableOpacity
                key={playlist.id}
                style={[styles.playlistItem, { borderBottomColor: colors.border }]}
                onPress={() => handlePlayPlaylist(playlist)}
                onLongPress={() => confirmDelete(playlist)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Play ${playlist.name}, ${playlist.trackIds.length} songs. Long press to delete.`}
              >
                <View style={styles.playlistInfo}>
                  <View style={[styles.playlistIcon, { backgroundColor: colors.playingIndicator + '20' }]}>
                    <IconSymbol size={24} name="music.note.list" color={colors.playingIndicator} />
                  </View>
                  <View style={styles.playlistDetails}>
                    <ThemedText type="defaultSemiBold" style={styles.playlistName} numberOfLines={1}>
                      {playlist.name}
                    </ThemedText>
                    <ThemedText type="default" style={styles.playlistCount}>
                      {playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'song' : 'songs'}
                    </ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => confirmDelete(playlist)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${playlist.name}`}
                >
                  <IconSymbol size={20} name="trash" color={colors.icon} style={styles.chevron} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCreating(true);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <IconSymbol size={20} name="plus" color="white" />
            <ThemedText style={styles.actionButtonText}>Create New Playlist</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.tint, borderWidth: 1 }]}
            onPress={handleShuffleAll}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <IconSymbol size={20} name="shuffle" color={colors.tint} />
            <ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>Shuffle All</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>

      <TextPromptModal
        visible={creating}
        title="New Playlist"
        placeholder="Playlist name"
        onSubmit={handleCreate}
        onCancel={() => setCreating(false)}
      />
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyText: {
    opacity: 0.6,
    lineHeight: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  playlistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playlistDetails: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  playlistCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  chevron: {
    opacity: 0.5,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});

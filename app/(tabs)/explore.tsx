import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function PlaylistsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const playlists = [
    { id: '1', name: 'Recently Added', count: 12, icon: 'clock' },
    { id: '2', name: 'Favorites', count: 8, icon: 'heart' },
    { id: '3', name: 'Workout Mix', count: 25, icon: 'figure.run' },
    { id: '4', name: 'Chill Vibes', count: 18, icon: 'leaf' },
    { id: '5', name: 'Party Hits', count: 32, icon: 'party.popper' },
  ];

  const handlePlaylistPress = async (playlist: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement playlist functionality
    console.log('Playlist pressed:', playlist.name);
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
            Your Playlists
          </ThemedText>
          
          {playlists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={[styles.playlistItem, { borderBottomColor: colors.icon }]}
              onPress={() => handlePlaylistPress(playlist)}
              activeOpacity={0.7}
            >
              <View style={styles.playlistInfo}>
                <View style={[styles.playlistIcon, { backgroundColor: colors.tint + '20' }]}>
                  <IconSymbol
                    size={24}
                    name={playlist.icon as any}
                    color={colors.tint}
                  />
                </View>
                
                <View style={styles.playlistDetails}>
                  <ThemedText type="defaultSemiBold" style={styles.playlistName}>
                    {playlist.name}
                  </ThemedText>
                  <ThemedText type="default" style={styles.playlistCount}>
                    {playlist.count} songs
                  </ThemedText>
                </View>
              </View>
              
              <IconSymbol
                size={20}
                name="chevron.right"
                color={colors.text}
                style={styles.chevron}
              />
            </TouchableOpacity>
          ))}
        </ThemedView>
        
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Implement create playlist functionality
            }}
            activeOpacity={0.8}
          >
            <IconSymbol size={20} name="plus" color="white" />
            <ThemedText style={styles.actionButtonText}>Create New Playlist</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.tint, borderWidth: 1 }]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Implement shuffle all functionality
            }}
            activeOpacity={0.8}
          >
            <IconSymbol size={20} name="shuffle" color={colors.tint} />
            <ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>Shuffle All</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
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

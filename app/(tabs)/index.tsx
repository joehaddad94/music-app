import ErrorBanner from '@/components/music/ErrorBanner';
import MusicLibrary from '@/components/music/MusicLibrary';
import MusicPlayer from '@/components/music/MusicPlayer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useMusic } from '@/contexts/MusicContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LibraryScreen() {
  // The initial scan runs once in AppContent; the library reads tracks from
  // context here and can re-scan via pull-to-refresh.
  const { playbackState } = useMusic();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ThemedView style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText type="title" style={[styles.headerTitle, { color: colors.tint }]}>
          Music Library
        </ThemedText>
      </ThemedView>

      <ErrorBanner />

      <ThemedView style={styles.content}>
        <MusicLibrary hasPlayer={!!playbackState.currentTrack} />
      </ThemedView>

      {playbackState.currentTrack && (
        <ThemedView style={[styles.playerContainer, {
          borderTopColor: colors.border,
          backgroundColor: colorScheme === 'dark' ? colors.background : 'rgba(255,255,255,0.98)'
        }]}>
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
  content: {
    flex: 1,
  },
  playerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});

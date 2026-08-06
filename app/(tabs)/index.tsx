import ErrorBanner from '@/components/music/ErrorBanner';
import MiniPlayer from '@/components/music/MiniPlayer';
import MusicLibrary from '@/components/music/MusicLibrary';
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

      <MiniPlayer />
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
});

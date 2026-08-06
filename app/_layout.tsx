import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import LoadingScreen from '@/components/LoadingScreen';
import { LibraryProvider } from '@/contexts/LibraryContext';
import { MusicProvider, useMusic } from '@/contexts/MusicContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { downloadService } from '@/services/DownloadService';
import { recentlyPlayed } from '@/services/RecentlyPlayed';
import React, { useEffect, useState } from 'react';

// Minimum time the branded loading screen stays up so it doesn't flash on
// fast devices. The screen is otherwise dismissed as soon as the first
// library scan resolves — not on a fixed timer.
const MIN_SPLASH_MS = 1000;

function AppContent() {
  const colorScheme = useColorScheme();
  const { loadTracks } = useMusic();
  const [scanDone, setScanDone] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    // Hydrate the download registry here rather than leaving it to whichever
    // screen happens to mount `useDownloads` first. MusicService consults the
    // registry when resolving a track to play, and that can happen before any
    // of those screens exist — in which case a downloaded track would stream
    // instead of playing from disk, which fails outright when offline.
    void downloadService.hydrate();
    void recentlyPlayed.hydrate();

    loadTracks().finally(() => setScanDone(true));
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [loadTracks]);

  if (!scanDone || !minTimePassed) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="player"
          options={{ title: 'Now Playing', presentation: 'modal' }}
        />
        <Stack.Screen name="downloads" options={{ title: 'Downloads' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <MusicProvider>
      <LibraryProvider>
        <AppContent />
      </LibraryProvider>
    </MusicProvider>
  );
}

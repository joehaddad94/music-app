import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import LoadingScreen from '@/components/LoadingScreen';
import { MusicProvider, useMusic } from '@/contexts/MusicContext';
import { useAppState } from '@/hooks/useAppState';
import { useColorScheme } from '@/hooks/useColorScheme';
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

  // Initialize app state handling for background audio
  useAppState();

  useEffect(() => {
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
      <AppContent />
    </MusicProvider>
  );
}

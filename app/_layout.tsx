import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import LoadingScreen from '@/components/LoadingScreen';
import { MusicProvider } from '@/contexts/MusicContext';
import { useAppState } from '@/hooks/useAppState';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';

function AppContent() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize app state handling for background audio
  useAppState();

  const handleLoadingFinish = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingScreen onFinish={handleLoadingFinish} />;
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

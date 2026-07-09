import React, { memo, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useMusic } from '../../contexts/MusicContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';
import { IconSymbol } from '../ui/IconSymbol';

const ErrorBanner: React.FC = memo(() => {
  const { error, clearError } = useMusic();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Auto-dismiss after a few seconds so a transient failure doesn't linger.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 5000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  if (!error) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.error }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <IconSymbol size={18} name="exclamationmark.triangle.fill" color="white" />
      <ThemedText style={styles.message} numberOfLines={2}>
        {error}
      </ThemedText>
      <TouchableOpacity
        onPress={clearError}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss error"
      >
        <IconSymbol size={18} name="xmark" color="white" />
      </TouchableOpacity>
    </View>
  );
});

ErrorBanner.displayName = 'ErrorBanner';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  message: {
    flex: 1,
    marginHorizontal: 10,
    color: 'white',
    fontSize: 14,
  },
});

export default ErrorBanner;

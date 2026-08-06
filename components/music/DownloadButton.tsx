import React, { memo, useCallback } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useDownloads } from '../../hooks/useDownloads';
import { MusicTrack } from '../../types/MusicTypes';
import { ThemedText } from '../ThemedText';
import { IconSymbol } from '../ui/IconSymbol';

interface DownloadButtonProps {
  track: MusicTrack;
}

/**
 * Save-offline control for a single track.
 *
 * Renders nothing when the rights holder has not allowed downloads — hidden
 * rather than disabled, because a greyed-out button invites the user to keep
 * poking at something that will never work. Around 2% of the Jamendo
 * catalogue is in that state, so it is worth handling gracefully.
 */
const DownloadButton: React.FC<DownloadButtonProps> = memo(({ track }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { canDownload, isDownloaded, progressFor, download, cancel, remove } = useDownloads();

  const downloaded = isDownloaded(track.id);
  const progress = progressFor(track.id);

  const handlePress = useCallback(() => {
    if (progress) {
      void cancel(track.id);
      return;
    }

    if (downloaded) {
      Alert.alert('Remove download', `Delete the offline copy of “${track.title}”?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(track.id) },
      ]);
      return;
    }

    download(track).catch(error => {
      Alert.alert('Download failed', error instanceof Error ? error.message : 'Please try again.');
    });
  }, [progress, downloaded, track, download, cancel, remove]);

  if (!canDownload(track) && !downloaded) return null;

  const percent = progress?.ratio == null ? null : Math.round(progress.ratio * 100);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={
        progress
          ? `Cancel download${percent === null ? '' : `, ${percent} percent`}`
          : downloaded
            ? 'Remove offline copy'
            : 'Save for offline listening'
      }
    >
      {progress ? (
        <View style={styles.progress}>
          <ActivityIndicator size="small" color={colors.tint} />
          {percent !== null && (
            <ThemedText style={styles.percent}>{percent}%</ThemedText>
          )}
        </View>
      ) : (
        <IconSymbol
          size={24}
          name={downloaded ? 'checkmark.circle.fill' : 'arrow.down.circle'}
          color={downloaded ? colors.success : colors.icon}
        />
      )}
    </TouchableOpacity>
  );
});

DownloadButton.displayName = 'DownloadButton';

const styles = StyleSheet.create({
  button: {
    padding: 6,
    marginLeft: 4,
  },
  progress: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
  },
  percent: {
    fontSize: 9,
    opacity: 0.7,
    marginTop: 1,
  },
});

export default DownloadButton;

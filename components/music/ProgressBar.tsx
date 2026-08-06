import Slider from '@react-native-community/slider';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

const ProgressBar: React.FC = memo(() => {
  const {
    position,
    duration,
    isDragging,
    localPosition,
    handleSeek,
    handleSeekPreview,
    handleSeekStart,
    handleSeekEnd,
    formatTime
  } = useMusicPlayer();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Fires continuously as the thumb moves. Updating the preview here is what
  // makes the elapsed-time label track the drag.
  const handleValueChange = (value: number) => {
    handleSeekPreview(value * duration);
  };

  const handleSlidingComplete = (value: number) => {
    handleSeek(value * duration);
    handleSeekEnd();
  };

  // While dragging this equals the slider's own value, so feeding it back is a
  // no-op rather than a fight with the thumb.
  const currentPosition = duration > 0
    ? (isDragging ? localPosition : position) / duration
    : 0;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.timeContainer}>
        <ThemedText type="defaultSemiBold" style={styles.timeText}>
          {formatTime(isDragging ? localPosition : position)}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.timeText}>
          {formatTime(duration)}
        </ThemedText>
      </View>
      
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={currentPosition}
          onSlidingStart={handleSeekStart}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          disabled={duration <= 0}
          minimumTrackTintColor={colors.progressBar}
          maximumTrackTintColor={colors.progressBarBackground}
          thumbTintColor={colors.progressBar}
          accessibilityLabel="Playback position"
        />
      </View>
    </ThemedView>
  );
});

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  sliderContainer: {
    paddingHorizontal: 5,
  },
  slider: {
    height: 20,
  },
});

export default ProgressBar;

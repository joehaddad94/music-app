import Slider from '@react-native-community/slider';
import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useMusic } from '../../contexts/MusicContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

const ProgressBar: React.FC = memo(() => {
  const { playbackState, seekTo } = useMusic();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleValueChange = (value: number) => {
    setIsDragging(true);
  };

  const handleSlidingComplete = async (value: number) => {
    setIsDragging(false);
    const newPosition = value * playbackState.duration;
    await seekTo(newPosition);
  };

  const currentPosition = playbackState.duration > 0 
    ? playbackState.position / playbackState.duration 
    : 0;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.timeContainer}>
        <ThemedText type="defaultSemiBold" style={styles.timeText}>
          {formatTime(playbackState.position)}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.timeText}>
          {formatTime(playbackState.duration)}
        </ThemedText>
      </View>
      
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={isDragging ? undefined : currentPosition}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.icon}
          thumbTintColor={colors.tint}
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
  track: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ProgressBar;

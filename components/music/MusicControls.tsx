import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useMusicControls } from '../../hooks/useMusicControls';
import { ThemedView } from '../ThemedView';
import { IconSymbol } from '../ui/IconSymbol';

const MusicControls: React.FC = memo(() => {
  const { 
    playbackState, 
    handlePlayPause, 
    handlePrevious, 
    handleNext, 
    handleRepeat, 
    handleShuffle 
  } = useMusicControls();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getRepeatIcon = () => {
    switch (playbackState.repeatMode) {
      case 'all':
        return 'repeat';
      case 'one':
        return 'repeat.1';
      default:
        return 'repeat';
    }
  };

  const getRepeatColor = () => {
    return playbackState.repeatMode !== 'none' ? colors.playingIndicator : colors.icon;
  };

  const getShuffleColor = () => {
    return playbackState.shuffleMode ? colors.playingIndicator : colors.icon;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.controlsRow}>
        {/* Shuffle Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleShuffle}
          activeOpacity={0.7}
        >
          <IconSymbol
            size={24}
            name="shuffle"
            color={getShuffleColor()}
          />
        </TouchableOpacity>

        {/* Previous Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePrevious}
          activeOpacity={0.7}
        >
          <IconSymbol
            size={28}
            name="backward.fill"
            color={colors.icon}
          />
        </TouchableOpacity>

        {/* Play/Pause Button */}
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.tint }]}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <IconSymbol
            size={32}
            name={playbackState.isPlaying ? 'pause.fill' : 'play.fill'}
            color="white"
          />
        </TouchableOpacity>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <IconSymbol
            size={28}
            name="forward.fill"
            color={colors.icon}
          />
        </TouchableOpacity>

        {/* Repeat Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRepeat}
          activeOpacity={0.7}
        >
          <IconSymbol
            size={24}
            name={getRepeatIcon()}
            color={getRepeatColor()}
          />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
});

MusicControls.displayName = 'MusicControls';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    padding: 12,
    marginHorizontal: 8,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    padding: 16,
    marginHorizontal: 12,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
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

export default MusicControls;

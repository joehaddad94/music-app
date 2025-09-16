import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useMusic } from '../../contexts/MusicContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedView } from '../ThemedView';
import { IconSymbol } from '../ui/IconSymbol';

const MusicControls: React.FC = memo(() => {
  const { playbackState, play, pause, setRepeatMode, setShuffleMode } = useMusic();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePlayPause = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (playbackState.isPlaying) {
        await pause();
      } else {
        await play();
      }
    } catch (error) {
      console.error('Play/pause error:', error);
    }
  };

  const handleRepeat = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(playbackState.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShuffle = () => {
    setShuffleMode(!playbackState.shuffleMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
    return playbackState.repeatMode !== 'none' ? colors.tint : colors.text;
  };

  const getShuffleColor = () => {
    return playbackState.shuffleMode ? colors.tint : colors.text;
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
          onPress={() => {
            // TODO: Implement previous track functionality
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <IconSymbol
            size={28}
            name="backward.fill"
            color={colors.text}
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
          onPress={() => {
            // TODO: Implement next track functionality
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <IconSymbol
            size={28}
            name="forward.fill"
            color={colors.text}
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

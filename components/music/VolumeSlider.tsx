import Slider from '@react-native-community/slider';
import React, { memo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useMusic } from '../../contexts/MusicContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { IconSymbol } from '../ui/IconSymbol';

/**
 * In-app volume control.
 *
 * The slider owns its value locally and pushes it straight to the audio
 * player. Volume is deliberately *not* part of the re-render contract in
 * `MusicContext` (see `metaChanged`), so dragging this doesn't re-render the
 * track list on every tick — the same reason playback position is kept out.
 */
const VolumeSlider: React.FC = memo(() => {
  const { playbackState, setVolume } = useMusic();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [volume, setLocalVolume] = useState(playbackState.volume);
  const [mutedAt, setMutedAt] = useState<number | null>(null);

  const apply = (next: number) => {
    setLocalVolume(next);
    setVolume(next);
  };

  const handleChange = (next: number) => {
    if (mutedAt !== null) {
      setMutedAt(null);
    }
    apply(next);
  };

  // Mute remembers the previous level so tapping again restores it.
  const toggleMute = () => {
    if (mutedAt !== null) {
      apply(mutedAt);
      setMutedAt(null);
    } else {
      setMutedAt(volume > 0 ? volume : 1);
      apply(0);
    }
  };

  const isMuted = volume === 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleMute}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityState={{ selected: isMuted }}
        accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
      >
        <IconSymbol
          size={20}
          name={isMuted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
          color={colors.icon}
        />
      </TouchableOpacity>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={volume}
        onValueChange={handleChange}
        minimumTrackTintColor={colors.progressBar}
        maximumTrackTintColor={colors.progressBarBackground}
        thumbTintColor={colors.progressBar}
        accessibilityLabel="Volume"
      />
    </View>
  );
});

VolumeSlider.displayName = 'VolumeSlider';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginBottom: 12,
  },
  slider: {
    flex: 1,
    height: 20,
    marginLeft: 8,
  },
});

export default VolumeSlider;

import { useMusic } from '../contexts/MusicContext';

export const useMusicPlayerDisplay = () => {
  const { playbackState } = useMusic();

  const shouldShowPlayer = playbackState.currentTrack !== null;

  return {
    playbackState,
    shouldShowPlayer,
  };
};

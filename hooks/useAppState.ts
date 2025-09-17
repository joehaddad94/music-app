import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMusic } from '../contexts/MusicContext';

export const useAppState = () => {
  const { stop } = useMusic();

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // App is going to background - music will continue playing
        console.log('App went to background - music continues');
      } else if (nextAppState === 'inactive') {
        // App is becoming inactive (e.g., phone call, notification)
        console.log('App became inactive');
      } else if (nextAppState === 'active') {
        // App is becoming active again
        console.log('App became active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [stop]);

  // Handle app termination
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Stop music when app is being terminated
      stop();
    };

    // For React Native, we'll handle this in the service cleanup
    return () => {
      handleBeforeUnload();
    };
  }, [stop]);
};

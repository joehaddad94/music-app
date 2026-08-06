import { useNetworkState } from 'expo-network';

/**
 * Whether the device currently has no usable internet connection.
 *
 * Deliberately conservative: both `isConnected` and `isInternetReachable` are
 * optional and are `undefined` before the first reading, and on web
 * `isInternetReachable` is not always meaningful. Treating unknown as offline
 * would hide streamed tracks on a perfectly good connection, which is far
 * worse than briefly offering a track that then fails with a retry — so
 * anything short of an explicit "no" counts as online.
 */
export const useIsOffline = (): boolean => {
  const state = useNetworkState();

  if (state.isConnected === false) return true;
  if (state.isConnected === true && state.isInternetReachable === false) return true;
  return false;
};

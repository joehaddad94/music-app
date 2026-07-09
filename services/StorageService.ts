import * as FileSystem from 'expo-file-system/legacy';

/**
 * Tiny JSON persistence layer backed by the app's document directory.
 *
 * We use expo-file-system (already a dependency) rather than AsyncStorage so
 * no new native module — and therefore no native rebuild — is required.
 * On platforms without a document directory (web), reads return the fallback
 * and writes are no-ops.
 */
const dir = FileSystem.documentDirectory;

const pathFor = (key: string): string | null =>
  dir ? `${dir}${key}.json` : null;

export const StorageService = {
  async load<T>(key: string, fallback: T): Promise<T> {
    const path = pathFor(key);
    if (!path) return fallback;
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return fallback;
      const contents = await FileSystem.readAsStringAsync(path);
      return JSON.parse(contents) as T;
    } catch (error) {
      console.warn(`StorageService: failed to load "${key}"`, error);
      return fallback;
    }
  },

  async save<T>(key: string, value: T): Promise<void> {
    const path = pathFor(key);
    if (!path) return;
    try {
      await FileSystem.writeAsStringAsync(path, JSON.stringify(value));
    } catch (error) {
      console.warn(`StorageService: failed to save "${key}"`, error);
    }
  },
};

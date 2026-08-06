# Music App

A modern music application built with React Native and Expo, featuring a beautiful interface and smooth user experience.

## Features

- 🎵 **Music Library**: Scan and access downloaded music files from your device
- 🎮 **Music Player**: Full-featured audio player with play/pause, seek, and volume controls
- 🔒 **Background Playback**: Keeps playing when the app is backgrounded, with lock screen
  and notification-shade controls
- 📱 **Cross-platform**: Works on iOS, Android, and Web
- 🎨 **Modern UI**: Beautiful interface with adaptive theming (light/dark mode)
- ⚡ **High Performance**: Optimized with memoization, lazy loading, and efficient rendering
- 🔄 **Real-time Updates**: Smooth animations and responsive controls
- 📋 **Playlists**: Favorites and custom playlists, persisted on device
- 🎛️ **Advanced Controls**: Repeat modes, shuffle, and progress tracking

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/build/setup/) (for building APKs)

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd music-app
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Start the development server

```bash
npm start
# or
yarn start
```

This will start the Expo development server. You can then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Press `w` to open in web browser
- Scan the QR code with Expo Go app on your phone

## Using the Music App

### First Launch
1. **Grant Permissions**: The app will request access to your media library to scan for music files
2. **Scan Music**: The app automatically scans your device for audio files (MP3, M4A, etc.)
3. **Browse Library**: View all your music files in the Library tab

If permission is denied, the app tells you so in a banner rather than failing silently.
In a **development** build it falls back to a handful of clearly-labelled sample tracks so
you can still exercise the player (useful in Expo Go, which cannot declare the media
permissions this app needs). **Release** builds never show sample data — they show the
empty state and explain that access is required.

### Music Player Features
- **Play/Pause**: Tap any track to start playing
- **Seek**: Drag the progress bar to jump to any position in the track
- **Volume Control**: In-app volume slider with tap-to-mute (remembers your previous level)
- **Repeat Modes**: Cycle through no repeat, repeat all, and repeat one
- **Shuffle**: Enable shuffle mode for random playback
- **Background Playback**: Audio continues when you leave the app. Play/pause and seek are
  available from the lock screen and notification shade

> On Android 13+ the app asks for notification permission the first time you press play.
> Declining it only hides the media notification — playback itself still works.

### Playlists
- **Favorites**: Tap the heart on the player to favourite the current track
- **Create Playlists**: Organize your music into custom playlists
- **Add to Playlist**: Use the playlist button on the player
- **Quick Actions**: Shuffle all music or create new playlists
- **Persistence**: Favorites and playlists are stored on-device as JSON via `expo-file-system`

## Building APK for Android Installation

### Method 1: Using EAS Build (Recommended)

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to your Expo account**:
   ```bash
   eas login
   ```

3. **Build APK for preview/testing**:
   ```bash
   eas build --platform android --profile preview
   ```

4. **Build APK for production**:
   ```bash
   eas build --platform android --profile production
   ```

5. **Download the APK**: Once the build completes, you'll get a download link. Download the APK file to your computer.

### Method 2: Local Build (Advanced)

1. **Install Android Studio** and set up Android SDK
2. **Configure environment variables**:
   ```bash
   export ANDROID_HOME=/path/to/android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

3. **Build locally**:
   ```bash
   npx expo run:android --variant release
   ```

## Installing APK on Android Phone

### Option 1: Direct Installation

1. **Transfer the APK** to your Android device (via USB, email, cloud storage, etc.)
2. **Enable Unknown Sources**:
   - Go to Settings > Security > Install unknown apps
   - Enable installation from the source you're using (e.g., File Manager, Chrome)
3. **Install the APK**:
   - Open the APK file on your device
   - Tap "Install" when prompted
   - Wait for installation to complete

### Option 2: Using ADB (Advanced)

1. **Enable Developer Options** on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. **Enable USB Debugging**:
   - Go to Settings > Developer Options
   - Enable "USB Debugging"
3. **Install via ADB**:
   ```bash
   adb install path/to/your/app.apk
   ```

## Development

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `eas build --platform android --profile preview` - Build APK

### Project Structure

```
music-app/
├── app/                    # App routes and screens (expo-router)
│   ├── (tabs)/            # Tab navigation: index = Library, explore = Playlists
│   └── _layout.tsx        # Root layout, providers, initial scan
├── components/            # Reusable components
│   ├── music/             # Player, library list, search, modals
│   └── ui/                # Icon and tab-bar primitives
├── contexts/              # MusicContext (playback), LibraryContext (favorites/playlists)
├── services/              # MusicService (audio + queue), StorageService (persistence)
├── hooks/                 # Custom React hooks
├── types/                 # Shared TypeScript types
├── utils/                 # Small helpers (duration formatting)
├── constants/             # Colors and other app constants
├── assets/                # Images, fonts, and other assets
└── eas.json               # EAS Build configuration
```

### Architecture notes

- **`services/MusicService.ts`** is the single source of playback truth: it owns the
  `expo-audio` player, the queue, shuffle/repeat state, and broadcasts to subscribers.
  Everything in React is a subscriber.
- **`contexts/MusicContext.tsx`** deliberately splits into two contexts. Playback *position*
  ticks twice a second and is served through a separate `PlaybackProgressContext`, so the
  track list doesn't re-render on every tick. Volume is excluded from the re-render contract
  for the same reason.
- **Units**: `expo-audio` reports seconds; this app works in milliseconds throughout
  (matching MediaLibrary durations). Conversion happens only at the `MusicService` boundary.

### Native projects (CNG)

`android/` and `ios/` are **not** checked in. They are generated from `app.json` by
[Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/),
which makes `app.json` the single source of truth for permissions and plugin config.
EAS Build runs prebuild for you. To generate them locally:

```bash
npx expo prebuild --clean
```

## Configuration

The app is configured with:
- **Package Name**: `com.joehaddad94.musicapp`
- **Version**: 1.0.0
- **Expo SDK**: ~54.0.36
- **React Native**: 0.81.5
- **Audio engine**: `expo-audio` (`expo-av` was deprecated in SDK 54 and is removed in SDK 55)

### Permissions

| Permission | Why |
| --- | --- |
| `READ_MEDIA_AUDIO` / `READ_EXTERNAL_STORAGE` | Scan the device for music files |
| `WAKE_LOCK` | Keep playing with the screen off |
| `POST_NOTIFICATIONS` | Show the media notification and lock screen controls (Android 13+) |
| `MODIFY_AUDIO_SETTINGS` | Required by `expo-audio` |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Merged in automatically from `expo-audio`'s library manifest, which also registers the media3 `AudioControlsService` that drives the lock screen |

The permission surface is deliberately narrow for a music app:

- **Audio only.** `expo-media-library` defaults to requesting *photo, video and audio*.
  This app pins it to `granularPermissions: ["audio"]` in `app.json` and calls
  `requestPermissionsAsync(false, ['audio'])` at runtime, so the system prompt asks for
  music and audio rather than photos and videos.
- **No microphone.** The `expo-audio` plugin is configured with `microphonePermission: false`
  and `recordAudioAndroid: false`, so `RECORD_AUDIO` is never declared.
- **No location, no writes.** `ACCESS_MEDIA_LOCATION` is disabled, and
  `WRITE_EXTERNAL_STORAGE` / `READ_MEDIA_VISUAL_USER_SELECTED` are stripped via
  `android.blockedPermissions`. Favorites and playlists are written to the app's own
  document directory, which needs no permission.

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **Build failures**: Ensure all dependencies are installed with `npm install`
3. **APK installation blocked**: Check Android security settings for unknown sources
4. **EAS Build errors**: Verify your Expo account has build credits
5. **Dependency version drift**: Run `npx expo install --check` to see whether any package
   has drifted from what the installed SDK expects, and `npx expo install --fix` to correct it
6. **Native config changes not applying**: `android/`/`ios/` are generated. After editing
   `app.json`, re-run `npx expo prebuild --clean` (or let EAS Build do it)
7. **No lock screen controls on Android**: Check that notifications are enabled for the app
   in system settings

### Getting Help

- Check the [Expo documentation](https://docs.expo.dev/)
- Visit the [React Native documentation](https://reactnative.dev/)
- Join the [Expo Discord community](https://chat.expo.dev/)

## License

This project is private and proprietary.

---

**Note**: This app requires Android 5.0 (API level 21) or higher for optimal performance.
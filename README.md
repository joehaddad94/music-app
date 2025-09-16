# Music App

A modern music application built with React Native and Expo, featuring a beautiful interface and smooth user experience.

## Features

- 🎵 **Music Library**: Scan and access downloaded music files from your device
- 🎮 **Music Player**: Full-featured audio player with play/pause, seek, and volume controls
- 📱 **Cross-platform**: Works on iOS, Android, and Web
- 🎨 **Modern UI**: Beautiful interface with adaptive theming (light/dark mode)
- ⚡ **High Performance**: Optimized with memoization, lazy loading, and efficient rendering
- 🔄 **Real-time Updates**: Smooth animations and responsive controls
- 📋 **Playlists**: Organize your music with custom playlists
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

### Music Player Features
- **Play/Pause**: Tap any track to start playing
- **Seek**: Drag the progress bar to jump to any position in the track
- **Volume Control**: Adjust volume using the system volume controls
- **Repeat Modes**: Cycle through no repeat, repeat all, and repeat one
- **Shuffle**: Enable shuffle mode for random playback

### Playlists
- **Create Playlists**: Organize your music into custom playlists
- **Quick Actions**: Shuffle all music or create new playlists
- **Smart Playlists**: Pre-made playlists like "Recently Added" and "Favorites"

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

### Project Structure

```
music-app/
├── app/                    # App routes and screens
│   ├── (tabs)/            # Tab navigation screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── constants/             # App constants
├── hooks/                 # Custom React hooks
├── assets/                # Images, fonts, and other assets
└── eas.json              # EAS Build configuration
```

## Configuration

The app is configured with:
- **Package Name**: `com.joehaddad94.musicapp`
- **Version**: 1.0.0
- **Expo SDK**: ~53.0.22
- **React Native**: 0.79.6

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **Build failures**: Ensure all dependencies are installed with `npm install`
3. **APK installation blocked**: Check Android security settings for unknown sources
4. **EAS Build errors**: Verify your Expo account has build credits

### Getting Help

- Check the [Expo documentation](https://docs.expo.dev/)
- Visit the [React Native documentation](https://reactnative.dev/)
- Join the [Expo Discord community](https://chat.expo.dev/)

## License

This project is private and proprietary.

---

**Note**: This app requires Android 5.0 (API level 21) or higher for optimal performance.
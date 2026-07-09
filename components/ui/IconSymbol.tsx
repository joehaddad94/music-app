// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'music.note': 'library-music',
  'music.note.fill': 'library-music',
  'music.note.list': 'queue-music',
  'list.bullet': 'playlist-play',
  'list.bullet.rectangle.fill': 'playlist-play',
  'rectangle.stack': 'view-module',
  'rectangle.stack.fill': 'view-module',
  // Playback controls
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'backward.fill': 'skip-previous',
  'forward.fill': 'skip-next',
  'shuffle': 'shuffle',
  'repeat': 'repeat',
  'repeat.1': 'repeat-one',
  'speaker.wave.2.fill': 'volume-up',
  'speaker.slash.fill': 'volume-off',
  // Library / playlists
  'magnifyingglass': 'search',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'plus': 'add',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'clock': 'schedule',
  'figure.run': 'directions-run',
  'leaf': 'eco',
  'party.popper': 'celebration',
  'trash': 'delete',
  'ellipsis': 'more-horiz',
  'exclamationmark.triangle.fill': 'error-outline',
} as IconMapping;


export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

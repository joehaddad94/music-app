import React, { memo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useLibrary } from '../../contexts/LibraryContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { MusicTrack } from '../../types/MusicTypes';
import { ThemedText } from '../ThemedText';
import { IconSymbol } from '../ui/IconSymbol';
import TextPromptModal from './TextPromptModal';

interface PlaylistPickerModalProps {
  visible: boolean;
  /**
   * The whole track, not just its id: a playlist stores ids, and a streamed
   * track's metadata has to be cached alongside or the entry can never be
   * resolved back into something playable.
   */
  track: MusicTrack | null;
  onClose: () => void;
}

const PlaylistPickerModal: React.FC<PlaylistPickerModalProps> = memo(({ visible, track, onClose }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { playlists, addToPlaylist, createPlaylist } = useLibrary();
  const [creating, setCreating] = useState(false);

  const handlePick = (playlistId: string) => {
    if (track) addToPlaylist(playlistId, track);
    onClose();
  };

  const handleCreate = (name: string) => {
    const playlist = createPlaylist(name);
    if (track) addToPlaylist(playlist.id, track);
    setCreating(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.card }]}>
              <View style={styles.handle} />
              <ThemedText type="subtitle" style={styles.title}>
                Add to Playlist
              </ThemedText>

              <ScrollView style={styles.list}>
                <TouchableOpacity
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => setCreating(true)}
                  accessibilityRole="button"
                >
                  <View style={[styles.iconWrap, { backgroundColor: colors.tint + '20' }]}>
                    <IconSymbol size={22} name="plus" color={colors.tint} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={[styles.rowText, { color: colors.tint }]}>
                    New Playlist
                  </ThemedText>
                </TouchableOpacity>

                {playlists.length === 0 ? (
                  <ThemedText style={styles.empty}>No playlists yet. Create one above.</ThemedText>
                ) : (
                  playlists.map(playlist => {
                    const alreadyIn = track ? playlist.trackIds.includes(track.id) : false;
                    return (
                      <TouchableOpacity
                        key={playlist.id}
                        style={[styles.row, { borderBottomColor: colors.border }]}
                        onPress={() => handlePick(playlist.id)}
                        disabled={alreadyIn}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: alreadyIn }}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: colors.playingIndicator + '20' }]}>
                          <IconSymbol size={22} name="music.note.list" color={colors.playingIndicator} />
                        </View>
                        <ThemedText type="defaultSemiBold" style={styles.rowText} numberOfLines={1}>
                          {playlist.name}
                        </ThemedText>
                        {alreadyIn ? (
                          <ThemedText style={{ color: colors.icon }}>Added</ThemedText>
                        ) : (
                          <ThemedText style={{ color: colors.icon }}>{playlist.trackIds.length}</ThemedText>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
                <ThemedText style={{ color: colors.icon }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      <TextPromptModal
        visible={creating}
        title="New Playlist"
        placeholder="Playlist name"
        onSubmit={handleCreate}
        onCancel={() => setCreating(false)}
      />
    </Modal>
  );
});

PlaylistPickerModal.displayName = 'PlaylistPickerModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    opacity: 0.4,
    marginBottom: 12,
  },
  title: {
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
  },
  empty: {
    opacity: 0.6,
    paddingVertical: 20,
    textAlign: 'center',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
});

export default PlaylistPickerModal;

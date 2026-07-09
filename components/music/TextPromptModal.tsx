import React, { memo, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';

interface TextPromptModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

const TextPromptModal: React.FC<TextPromptModalProps> = memo(
  ({ visible, title, placeholder, submitLabel, onSubmit, onCancel }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [value, setValue] = useState('');

    // Reset the field each time the modal opens.
    useEffect(() => {
      if (visible) setValue('');
    }, [visible]);

    const submit = () => {
      const trimmed = value.trim();
      if (trimmed) onSubmit(trimmed);
    };

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.backdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <TouchableWithoutFeedback>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <ThemedText type="subtitle" style={styles.title}>
                    {title}
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder ?? 'Name'}
                    placeholderTextColor={colors.icon}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    maxLength={60}
                  />
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={onCancel} style={styles.actionBtn} accessibilityRole="button">
                      <ThemedText style={{ color: colors.icon }}>Cancel</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={submit}
                      disabled={!value.trim()}
                      style={styles.actionBtn}
                      accessibilityRole="button"
                    >
                      <ThemedText style={{ color: value.trim() ? colors.tint : colors.icon, fontWeight: '600' }}>
                        {submitLabel ?? 'Create'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }
);

TextPromptModal.displayName = 'TextPromptModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    borderRadius: 14,
    padding: 20,
  },
  title: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
});

export default TextPromptModal;

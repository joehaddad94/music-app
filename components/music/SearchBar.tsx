import React, { memo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { IconSymbol } from '../ui/IconSymbol';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = memo(({ value, onChangeText, placeholder }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconSymbol size={20} name="magnifyingglass" color={colors.icon} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search songs, artists, albums'}
        placeholderTextColor={colors.icon}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel="Search music library"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <IconSymbol size={18} name="xmark.circle.fill" color={colors.icon} />
        </TouchableOpacity>
      )}
    </View>
  );
});

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
  },
});

export default SearchBar;

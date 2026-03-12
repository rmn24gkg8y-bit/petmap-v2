import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type TagChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  compact?: boolean;
};

export function TagChip({ label, active = false, onPress, compact = false }: TagChipProps) {
  const content = (
    <View
      style={[
        styles.base,
        compact ? styles.compact : styles.normal,
        active ? styles.active : styles.inactive,
      ]}>
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radii.pill,
  },
  normal: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  active: {
    backgroundColor: theme.colors.primary,
  },
  inactive: {
    backgroundColor: theme.colors.primarySoft,
  },
  text: {
    fontWeight: '600',
  },
  activeText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  inactiveText: {
    fontSize: 12,
    color: theme.colors.primary,
  },
});

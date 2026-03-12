import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type StatusBadgeVariant =
  | 'system'
  | 'user'
  | 'pending'
  | 'local'
  | 'favorite'
  | 'favoriteInactive';

type StatusBadgeProps = {
  label: string;
  variant: StatusBadgeVariant;
};

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'system' ? styles.system : null,
        variant === 'user' ? styles.user : null,
        variant === 'pending' ? styles.pending : null,
        variant === 'local' ? styles.local : null,
        variant === 'favorite' ? styles.favorite : null,
        variant === 'favoriteInactive' ? styles.favoriteInactive : null,
      ]}>
      <Text
        style={[
          styles.text,
          variant === 'system' ? styles.systemText : null,
          variant === 'user' ? styles.userText : null,
          variant === 'pending' ? styles.pendingText : null,
          variant === 'local' ? styles.localText : null,
          variant === 'favorite' ? styles.favoriteText : null,
          variant === 'favoriteInactive' ? styles.favoriteInactiveText : null,
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  system: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  systemText: {
    color: theme.colors.textSecondary,
  },
  user: {
    backgroundColor: theme.colors.primarySoft,
  },
  userText: {
    color: theme.colors.primary,
  },
  pending: {
    backgroundColor: '#FFEDD5',
  },
  pendingText: {
    color: theme.colors.warning,
  },
  local: {
    backgroundColor: '#DCFCE7',
  },
  localText: {
    color: theme.colors.success,
  },
  favorite: {
    backgroundColor: theme.colors.primarySoft,
  },
  favoriteText: {
    color: theme.colors.primary,
  },
  favoriteInactive: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  favoriteInactiveText: {
    color: theme.colors.textSecondary,
  },
});

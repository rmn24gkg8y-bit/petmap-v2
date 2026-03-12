import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ eyebrow, title, subtitle, style }: SectionHeaderProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  title: {
    marginTop: theme.spacing.xs,
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
});

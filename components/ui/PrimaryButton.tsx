import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type PrimaryButtonVariant = 'primary' | 'secondary' | 'danger';

type PrimaryButtonProps = PressableProps & {
  label: string;
  variant?: PrimaryButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  variant = 'primary',
  style,
  disabled,
  ...rest
}: PrimaryButtonProps) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : null,
        variant === 'secondary' ? styles.secondary : null,
        variant === 'danger' ? styles.danger : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}>
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : null,
          variant === 'secondary' ? styles.secondaryLabel : null,
          variant === 'danger' ? styles.dangerLabel : null,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.chipBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  danger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: theme.colors.textPrimary,
  },
  dangerLabel: {
    color: theme.colors.danger,
  },
});

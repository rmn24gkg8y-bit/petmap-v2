import { Platform } from 'react-native';

export const theme = {
  colors: {
    pageBackground: '#F6F8FB',
    cardBackground: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    primary: '#2563EB',
    primarySoft: '#EAF2FF',
    chipBackground: '#EEF2F7',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  radii: {
    sm: 10,
    md: 14,
    lg: 20,
    pill: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  shadows: {
    card: Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
} as const;

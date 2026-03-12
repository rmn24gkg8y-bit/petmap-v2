import { Platform } from 'react-native';

export const theme = {
  colors: {
    pageBackground: '#F4F7FB',
    cardBackground: '#FFFFFF',
    surfaceMuted: '#F7FAFC',
    textPrimary: '#0B1324',
    textSecondary: '#5F6F86',
    textTertiary: '#8B98AD',
    border: '#DEE6F1',
    divider: '#E9EEF6',
    primary: '#1D4ED8',
    primarySoft: '#EAF1FF',
    accent: '#0EA5A4',
    accentSoft: '#E8FBFA',
    chipBackground: '#F1F5FA',
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
        shadowColor: '#0B1324',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
    floating: Platform.select({
      ios: {
        shadowColor: '#0B1324',
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 7 },
      },
      android: {
        elevation: 5,
      },
      default: {},
    }),
  },
} as const;

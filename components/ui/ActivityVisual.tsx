import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type ActivityVisualVariant = 'card' | 'hero';

type ActivityVisualProps = {
  title: string;
  summary: string;
  statusLabel: string;
  variant?: ActivityVisualVariant;
  style?: StyleProp<ViewStyle>;
};

type ActivityVisualPreset = {
  icon: ComponentProps<typeof SymbolView>['name'];
  chipLabel: string;
  background: string;
  accent: string;
  accentSoft: string;
  orb: string;
};

function getActivityVisualPreset(title: string, statusLabel: string): ActivityVisualPreset {
  const content = `${title} ${statusLabel}`;

  if (content.includes('散步') || content.includes('walk')) {
    return {
      icon: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
      chipLabel: 'City Walk',
      background: '#EEF7F1',
      accent: '#2F9E44',
      accentSoft: '#D9F2E1',
      orb: '#C6E9D1',
    };
  }

  if (content.includes('商家') || content.includes('报名')) {
    return {
      icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
      chipLabel: 'Coming Up',
      background: '#FFF6EA',
      accent: '#C97A1A',
      accentSoft: '#FFE5BF',
      orb: '#FFD59C',
    };
  }

  return {
    icon: { ios: 'star.bubble', android: 'stars', web: 'stars' },
    chipLabel: 'Pet Picks',
    background: '#EEF4FF',
    accent: '#3B82F6',
    accentSoft: '#DCE8FF',
    orb: '#C6D8FF',
  };
}

export function ActivityVisual({
  title,
  summary,
  statusLabel,
  variant = 'card',
  style,
}: ActivityVisualProps) {
  const preset = getActivityVisualPreset(title, statusLabel);
  const isHero = variant === 'hero';

  return (
    <View
      style={[
        styles.base,
        isHero ? styles.heroBase : styles.cardBase,
        { backgroundColor: preset.background },
        style,
      ]}>
      <View style={[styles.orb, styles.orbPrimary, { backgroundColor: preset.orb }]} />
      <View style={[styles.orb, styles.orbSecondary, { backgroundColor: preset.accentSoft }]} />
      <View style={[styles.gridBlock, { backgroundColor: `${preset.accent}14` }]} />

      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: '#FFFFFFCC', borderColor: `${preset.accent}22` }]}>
          <SymbolView name={preset.icon} tintColor={preset.accent} size={isHero ? 19 : 16} />
        </View>
        <View style={[styles.miniChip, { backgroundColor: `${preset.accent}12`, borderColor: `${preset.accent}20` }]}>
          <Text style={[styles.miniChipText, { color: preset.accent }]}>{preset.chipLabel}</Text>
        </View>
      </View>

      {isHero ? (
        <View style={styles.heroContent}>
          <View style={[styles.statusPill, { backgroundColor: '#FFFFFFC7' }]}>
            <Text style={[styles.statusPillText, { color: preset.accent }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroSummary} numberOfLines={3}>
            {summary}
          </Text>
        </View>
      ) : (
        <View style={styles.cardAccentWrap}>
          <View style={[styles.cardAccentLine, { backgroundColor: `${preset.accent}24` }]} />
          <View style={[styles.cardAccentLineShort, { backgroundColor: `${preset.accent}4A` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  cardBase: {
    width: '100%',
    height: 88,
    borderRadius: theme.radii.sm,
    padding: 10,
  },
  heroBase: {
    width: '100%',
    height: 180,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
  },
  orb: {
    position: 'absolute',
    borderRadius: theme.radii.pill,
  },
  orbPrimary: {
    width: 88,
    height: 88,
    right: -18,
    top: -8,
  },
  orbSecondary: {
    width: 72,
    height: 72,
    left: -14,
    bottom: -18,
  },
  gridBlock: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 64,
    height: 28,
    borderRadius: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniChip: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardAccentWrap: {
    marginTop: 'auto',
    gap: 6,
    zIndex: 1,
  },
  cardAccentLine: {
    width: 72,
    height: 4,
    borderRadius: theme.radii.pill,
  },
  cardAccentLineShort: {
    width: 40,
    height: 4,
    borderRadius: theme.radii.pill,
  },
  heroContent: {
    marginTop: 'auto',
    gap: theme.spacing.xs,
    zIndex: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  heroSummary: {
    maxWidth: '78%',
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
});

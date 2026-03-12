import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type MapEmptySheetProps = {
  totalSpots: number;
  favoriteCount: number;
  onPressFavorites: () => void;
  onPressExplore: () => void;
};

export function MapEmptySheet({
  totalSpots,
  favoriteCount,
  onPressFavorites,
  onPressExplore,
}: MapEmptySheetProps) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>地图总览</Text>
        <Text style={styles.title}>PetMap</Text>
        <Text style={styles.description}>查看宠物友好地点，并继续管理你的本地点位。</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSpots}</Text>
            <Text style={styles.statLabel}>当前地点数</Text>
          </View>
          <Pressable onPress={onPressFavorites} style={styles.statCard}>
            <Text style={styles.statValue}>{favoriteCount}</Text>
            <Text style={styles.statLabel}>已收藏</Text>
            <Text style={styles.statAction}>查看我的收藏</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>当前没有选中地点</Text>
        <Text style={styles.emptyDescription}>
          可以先去 Explore 查看地点，或在地图上长按新增一个地点。
        </Text>

        <View style={styles.actions}>
          <Pressable onPress={onPressExplore} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>前往 Explore</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...theme.shadows.card,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statAction: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  emptyCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyDescription: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 16,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

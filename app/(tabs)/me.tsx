import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';

type MeActionItem = {
  key: string;
  label: string;
  onPress: () => void;
  isPlaceholder?: boolean;
};

export default function MeScreen() {
  const { favoriteSpots, userSpots } = usePetMapStore();

  const actionItems: MeActionItem[] = [
    {
      key: 'badges',
      label: '我的勋章',
      onPress: () => router.push('/badges'),
    },
    {
      key: 'settings',
      label: '设置',
      onPress: () => router.push('/settings'),
    },
    {
      key: 'feedback',
      label: '意见反馈',
      onPress: () => router.push('/feedback'),
    },
    {
      key: 'about',
      label: '关于 PetMap',
      onPress: () => router.push('/about'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="个人页"
          title="Me"
          subtitle="记录你的宠物友好生活地图"
          style={styles.pageHeader}
        />

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🐾</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>PetMap 用户</Text>
            <Text style={styles.profileSubtitle}>记录你的宠物友好生活地图</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Pressable
            style={({ pressed }) => [styles.statCard, pressed ? styles.statCardPressed : null]}
            onPress={() => router.push('/my-favorites')}>
            <Text style={styles.statValue}>{favoriteSpots.length}</Text>
            <Text style={styles.statLabel}>我的收藏</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statCard, pressed ? styles.statCardPressed : null]}
            onPress={() => router.push('/my-spots')}>
            <Text style={styles.statValue}>{userSpots.length}</Text>
            <Text style={styles.statLabel}>我的地点</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>功能入口</Text>
          <View style={styles.actionList}>
            {actionItems.map((item) => (
              <Pressable key={item.key} style={styles.actionItem} onPress={item.onPress}>
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Text style={[styles.actionHint, item.isPlaceholder ? styles.placeholderHint : null]}>
                  {item.isPlaceholder ? '即将上线' : '进入'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.mascotCard}>
          <Text style={styles.mascotEyebrow}>本周值班吉祥物</Text>
          <Text style={styles.mascotTitle}>🐶 巡逻狗狗</Text>
          <Text style={styles.mascotDescription}>
            本周由「巡逻狗狗」陪你探索城市宠物友好地点
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + theme.spacing.sm,
    gap: theme.spacing.md,
  },
  pageHeader: {
    marginBottom: 0,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  profileSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  statCardPressed: {
    opacity: 0.88,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sectionCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionList: {
    marginTop: theme.spacing.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  actionHint: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  placeholderHint: {
    color: theme.colors.textSecondary,
  },
  mascotCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentSoft,
    padding: theme.spacing.md,
  },
  mascotEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  mascotTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  mascotDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
});

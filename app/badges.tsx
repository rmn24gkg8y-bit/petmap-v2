import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateCard, SectionHeader } from '@/components/ui';
import { theme } from '@/constants/theme';

const BADGE_PLACEHOLDERS = ['城市探索者', '地点贡献者', '宠物友好发现官'] as const;

export default function BadgesScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '我的勋章' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="成长体系"
          title="我的勋章"
          subtitle="记录你在 PetMap 的探索与贡献"
          style={styles.header}
        />

        <EmptyStateCard
          title="你还没有解锁勋章"
          description="继续收藏地点、添加地点、探索城市，未来可获得专属勋章"
        />

        <View style={styles.placeholderSection}>
          <Text style={styles.sectionTitle}>未来勋章</Text>
          <View style={styles.grid}>
            {BADGE_PLACEHOLDERS.map((badge) => (
              <View key={badge} style={styles.badgeCard}>
                <View style={styles.badgeIcon}>
                  <Text style={styles.badgeIconText}>🏅</Text>
                </View>
                <Text style={styles.badgeName}>{badge}</Text>
                <Text style={styles.badgeState}>即将上线</Text>
              </View>
            ))}
          </View>
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
  header: {
    marginBottom: 0,
  },
  placeholderSection: {
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
  grid: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  badgeCard: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
  },
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconText: {
    fontSize: 16,
  },
  badgeName: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  badgeState: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

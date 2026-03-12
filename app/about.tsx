import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '关于 PetMap' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="品牌介绍"
          title="关于 PetMap"
          subtitle="发现城市中的宠物友好地点，建立更轻松、更可信赖的生活地图。"
          style={styles.header}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>PetMap 是什么</Text>
          <Text style={styles.cardText}>
            PetMap 是一个帮助用户发现宠物友好地点的生活地图。
            它不主打强社交，更强调发现、记录、筛选、收藏和未来商家入驻。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>吉祥物计划</Text>
          <Text style={styles.cardText}>
            未来会有多个轮值狗狗吉祥物，每周一个主题值班角色。
            这是 PetMap 品牌识别方向之一，也会逐步融入页面体验。
          </Text>
        </View>

        <View style={styles.versionCard}>
          <Text style={styles.versionLabel}>当前版本</Text>
          <Text style={styles.versionValue}>v0.x</Text>
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
  card: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  versionCard: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  versionValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});

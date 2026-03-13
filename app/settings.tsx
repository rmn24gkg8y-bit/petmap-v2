import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader, TagChip } from '@/components/ui';
import { theme } from '@/constants/theme';

const FUTURE_CAPABILITIES = ['账号与同步', '活动与商家能力', '更完整的审核体系'] as const;

const HELP_LINKS = [
  {
    key: 'feedback',
    label: '去意见反馈',
    description: '反馈地点信息、活动内容、产品建议或使用问题。',
    onPress: () => router.push('/feedback'),
  },
  {
    key: 'about',
    label: '去关于 PetMap',
    description: '了解 PetMap 的定位、当前阶段与品牌方向。',
    onPress: () => router.push('/about'),
  },
] as const;

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '设置' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="设置与说明"
          title="设置"
          subtitle="这里会集中说明 PetMap 当前的数据状态、内容阶段和常用帮助入口。"
          style={styles.header}
        />

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>数据与存储</Text>
          <Text style={styles.cardTitle}>当前以本机保存为主</Text>
          <Text style={styles.cardText}>
            你添加的地点、收藏和部分使用状态，当前主要保存在本机，方便先完成轻量记录与管理。云端能力仍在逐步接入，所以不同设备之间的同步体验还在完善中。
          </Text>
          <View style={styles.chipRow}>
            <TagChip label="本机优先" compact />
            <TagChip label="云端逐步接入" compact />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>内容与审核</Text>
          <Text style={styles.cardTitle}>地点与平台内容仍在轻量阶段</Text>
          <Text style={styles.cardText}>
            你添加的地点可以继续完善后提交审核。当前平台整理内容和用户补充内容会并行存在，前者由平台持续维护，后者会逐步进入更完整的审核与管理流程。
          </Text>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>当前你可以这样理解</Text>
            <Text style={styles.infoText}>地点先支持记录、完善和提交，审核与发布能力正在逐步补齐。</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>帮助与反馈</Text>
          <Text style={styles.cardTitle}>有问题时可以快速找到入口</Text>
          <View style={styles.linkList}>
            {HELP_LINKS.map((item, index) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.linkItem,
                  index < HELP_LINKS.length - 1 ? styles.linkDivider : null,
                  pressed ? styles.linkPressed : null,
                ]}>
                <View style={styles.linkMeta}>
                  <Text style={styles.linkLabel}>{item.label}</Text>
                  <Text style={styles.linkDescription}>{item.description}</Text>
                </View>
                <Text style={styles.linkAction}>进入</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>关于与未来能力</Text>
          <Text style={styles.cardTitle}>后续会逐步补齐更多长期能力</Text>
          <Text style={styles.cardText}>
            当前先把前台发现、筛选、收藏、地点管理和活动内容链路做顺，后续会再逐步补上更完整的账号、同步和商家能力。
          </Text>
          <View style={styles.futureList}>
            {FUTURE_CAPABILITIES.map((item) => (
              <View key={item} style={styles.futureItem}>
                <Text style={styles.futureDot}>•</Text>
                <Text style={styles.futureText}>{item}</Text>
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
  card: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  cardTitle: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  cardText: {
    marginTop: theme.spacing.xs,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  infoBlock: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
    gap: 4,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  linkList: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
  },
  linkItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  linkDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  linkPressed: {
    opacity: 0.88,
  },
  linkMeta: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  linkDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  linkAction: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  futureList: {
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  futureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  futureDot: {
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.primary,
  },
  futureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
});

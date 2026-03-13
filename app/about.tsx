import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader, TagChip } from '@/components/ui';
import { theme } from '@/constants/theme';

const CONTENT_SOURCES = ['平台整理地点', '用户添加地点', '活动专题与精选'] as const;
const FUTURE_DIRECTIONS = ['更完整的活动内容', '更完整的商家能力', '更完整的同步与审核体系'] as const;

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '关于 PetMap' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="产品说明"
          title="关于 PetMap"
          subtitle="PetMap 正在把宠物友好地点发现、内容整理和轻量活动入口，慢慢连成一条更可信的生活地图。"
          style={styles.header}
        />

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PetMap 是什么</Text>
          <Text style={styles.cardTitle}>一个宠物友好地点发现工具</Text>
          <Text style={styles.cardText}>
            PetMap 主要帮助你发现城市中的宠物友好地点。它不以强社交为核心，而是更关注地点发现、筛选、收藏、地点管理，以及活动内容入口的逐步建立。
          </Text>
          <View style={styles.chipRow}>
            <TagChip label="发现" compact />
            <TagChip label="筛选" compact />
            <TagChip label="收藏" compact />
            <TagChip label="地点管理" compact />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>当前产品阶段</Text>
          <Text style={styles.cardTitle}>先把前台主流程做顺</Text>
          <Text style={styles.cardText}>
            当前 PetMap 仍以本地优先为主，先把地图、探索、收藏、地点管理和活动浏览这些用户可感知主流程打磨清楚。云端能力和更完整的内容体系还在逐步接入中。
          </Text>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>当前状态</Text>
            <Text style={styles.infoText}>更偏向一个可用、可信的前台产品雏形，而不是已经全部接通的完整平台。</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>内容构成与来源</Text>
          <Text style={styles.cardTitle}>不同内容会一起组成这张生活地图</Text>
          <Text style={styles.cardText}>
            现在你在 PetMap 里看到的内容，既包括平台持续整理的地点，也包括用户补充和提交的地点内容，同时还有围绕宠物友好主题整理的活动专题与精选内容。它们会一起服务“发现和判断”这件事。
          </Text>
          <View style={styles.sourceList}>
            {CONTENT_SOURCES.map((item) => (
              <View key={item} style={styles.sourceItem}>
                <Text style={styles.sourceDot}>•</Text>
                <Text style={styles.sourceText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.brandCard}>
          <Text style={styles.brandEyebrow}>品牌与未来方向</Text>
          <Text style={styles.brandTitle}>轮值吉祥物狗狗，会是 PetMap 的温和识别符号之一</Text>
          <Text style={styles.brandText}>
            我们希望 PetMap 不只是一个功能集合，也能慢慢长出自己的识别感。未来会有不同主题的轮值吉祥物狗狗，作为产品气质的一部分，陪用户一起探索城市里的宠物友好生活。
          </Text>
          <View style={styles.futureList}>
            {FUTURE_DIRECTIONS.map((item) => (
              <View key={item} style={styles.futureItem}>
                <Text style={styles.futureDot}>•</Text>
                <Text style={styles.futureText}>{item}</Text>
              </View>
            ))}
          </View>
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
  sourceList: {
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  sourceDot: {
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.primary,
  },
  sourceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  brandCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  brandEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  brandTitle: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  brandText: {
    marginTop: theme.spacing.xs,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
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

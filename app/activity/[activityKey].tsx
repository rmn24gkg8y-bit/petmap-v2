import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivityVisual, EmptyStateCard, PrimaryButton, SectionHeader, SpotCard, TagChip } from '@/components/ui';
import {
  getActivityCollectionByKey,
} from '@/constants/activityCollections';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { Spot } from '@/types/spot';

function getDisplayAddress(spot: Spot) {
  return (
    spot.formattedAddress?.trim() ||
    [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
    '地址待补充'
  );
}

export default function ActivityCollectionScreen() {
  const params = useLocalSearchParams<{ activityKey?: string }>();
  const { spots, setSelectedSpot } = usePetMapStore();
  const activity = getActivityCollectionByKey(params.activityKey ?? '');
  const relatedSpots = activity ? activity.spotIds.map((id) => spots.find((spot) => spot.id === id) ?? null).filter((spot): spot is Spot => spot !== null) : [];
  const isUpcomingActivity = activity?.interactionMode === 'upcoming';

  function handleOpenSpot(spotId: string) {
    setSelectedSpot(spotId);
    router.navigate('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: activity?.title ?? '活动专题' }} />

      {!activity ? (
        <View style={styles.emptyWrap}>
          <EmptyStateCard
            title="活动专题不存在"
            description="当前没有找到对应的活动内容。"
            action={<PrimaryButton label="返回 Services" onPress={() => router.replace('/(tabs)/services')} />}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionHeader
            eyebrow={isUpcomingActivity ? '即将支持' : '活动专题'}
            title={activity.title}
            subtitle={activity.summary}
            style={styles.pageHeader}
          />

          {activity.imageUri ? (
            <View style={styles.heroImageWrap}>
              <Image source={{ uri: activity.imageUri }} style={styles.heroImage} />
              <View style={styles.heroImageOverlay}>
                <TagChip label={activity.statusLabel} compact />
                <Text style={styles.heroImageText}>围绕一个主题整理相关地点，当前由平台持续补充，后续也会逐步支持更多活动内容。</Text>
              </View>
            </View>
          ) : (
            <ActivityVisual
              title={activity.title}
              summary={activity.summary}
              statusLabel={activity.statusLabel}
              variant="hero"
              style={styles.heroVisual}
            />
          )}

          {isUpcomingActivity ? (
            <>
              <View style={styles.upcomingIntroCard}>
                <Text style={styles.upcomingIntroTitle}>这项能力正在准备中</Text>
                <Text style={styles.upcomingIntroText}>
                  当前会先以专题预告形式承接，后续逐步支持活动发布、报名意向收集和更多商家活动能力。
                </Text>
              </View>

              <View style={styles.upcomingFeatureCard}>
                <Text style={styles.upcomingSectionTitle}>未来会支持什么</Text>
                <View style={styles.upcomingFeatureList}>
                  <Text style={styles.upcomingFeatureItem}>适合品牌和商家发布宠物友好活动内容</Text>
                  <Text style={styles.upcomingFeatureItem}>活动说明、地点信息和专题主视觉会继续补齐</Text>
                  <Text style={styles.upcomingFeatureItem}>用户可通过反馈表达报名兴趣或内容建议</Text>
                </View>
              </View>

              <View style={styles.upcomingActionCard}>
                <Text style={styles.upcomingActionText}>
                  如果你对这项能力感兴趣，或者希望平台优先支持某类活动内容，可以先告诉我们。
                </Text>
                <View style={styles.upcomingActionRow}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/feedback',
                        params: {
                          type: 'activity',
                          contextType: 'activity',
                          activityKey: activity.key,
                          activityTitle: activity.title,
                          activitySummary: activity.summary,
                          activityStatusLabel: activity.statusLabel,
                        },
                      })
                    }
                    style={styles.feedbackButton}>
                    <Text style={styles.feedbackButtonText}>去意见反馈</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.replace('/(tabs)/services')}
                    style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>返回 Services</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackHintText}>
                  如果你发现活动专题信息需要补充或调整，可以直接反馈给平台继续整理。
                </Text>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/feedback',
                      params: {
                        type: 'activity',
                        contextType: 'activity',
                        activityKey: activity.key,
                        activityTitle: activity.title,
                        activitySummary: activity.summary,
                        activityStatusLabel: activity.statusLabel,
                      },
                    })
                  }
                  style={styles.feedbackButton}>
                  <Text style={styles.feedbackButtonText}>反馈活动内容</Text>
                </Pressable>
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>相关地点推荐</Text>
                <TagChip label={`${relatedSpots.length} 个`} compact />
              </View>

              {relatedSpots.length === 0 ? (
                <EmptyStateCard
                  title="暂时没有可展示的关联地点"
                  description="活动内容已建立，相关地点仍在整理中。"
                />
              ) : (
                relatedSpots.map((spot) => (
                  <SpotCard
                    key={spot.id}
                    title={spot.name}
                    address={getDisplayAddress(spot)}
                    photoUri={spot.photoUris?.[0]}
                    tags={spot.tags.slice(0, 3)}
                    description={spot.description}
                    onPressTop={() => handleOpenSpot(spot.id)}
                    footer={
                      <View style={styles.cardFooter}>
                        <Pressable onPress={() => handleOpenSpot(spot.id)} style={styles.mapButton}>
                          <Text style={styles.mapButtonText}>去地图看看</Text>
                        </Pressable>
                      </View>
                    }
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      )}
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
  },
  pageHeader: {
    marginBottom: theme.spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  heroImageWrap: {
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.cardBackground,
    ...theme.shadows.card,
  },
  heroImage: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.surfaceMuted,
  },
  heroImageOverlay: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  heroImageText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  heroVisual: {
    ...theme.shadows.card,
  },
  feedbackSection: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  feedbackHintText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  feedbackButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  feedbackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  upcomingIntroCard: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    gap: 6,
    ...theme.shadows.card,
  },
  upcomingIntroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  upcomingIntroText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  upcomingFeatureCard: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  upcomingSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  upcomingFeatureList: {
    gap: 8,
  },
  upcomingFeatureItem: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  upcomingActionCard: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  upcomingActionText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  upcomingActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionHeaderRow: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  cardFooter: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
  },
  mapButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});

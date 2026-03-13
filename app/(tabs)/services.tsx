import { router } from 'expo-router';
import { useMemo, type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivityVisual, SectionHeader, TagChip } from '@/components/ui';
import { ACTIVITY_COLLECTIONS, type ActivityCollection } from '@/constants/activityCollections';
import { SPOT_TYPE_LABELS } from '@/constants/spotFormOptions';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { Spot, SpotType } from '@/types/spot';

type ServiceCategory = {
  spotType: SpotType;
  icon: ComponentProps<typeof SymbolView>['name'];
  tint: string;
};

function getDisplayAddress(spot: Spot) {
  return (
    spot.formattedAddress?.trim() ||
    [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
    '地址待补充'
  );
}

export default function ServicesScreen() {
  const { spots, setSelectedSpot } = usePetMapStore();

  const recommendedSpots = useMemo(
    () => [...spots].sort((a, b) => b.votes - a.votes).slice(0, 2),
    [spots]
  );

  function handleOpenSpotOnMap(spotId: string) {
    setSelectedSpot(spotId);
    router.navigate('/(tabs)');
  }

  function handleOpenActivity(activity: ActivityCollection) {
    if (activity.interactionMode === 'collection') {
      router.push(`/activity/${activity.key}`);
      return;
    }

    Alert.alert('即将支持', '活动报名和详情能力正在准备中。');
  }

  function renderCompactSpotCard(spot: Spot) {
    return (
      <Pressable
        key={spot.id}
        onPress={() => handleOpenSpotOnMap(spot.id)}
        style={({ pressed }) => [styles.compactCard, pressed ? styles.cardPressed : null]}>
        <Text style={styles.compactCardTitle} numberOfLines={1}>
          {spot.name}
        </Text>
        <Text style={styles.compactCardAddress} numberOfLines={1}>
          {getDisplayAddress(spot)}
        </Text>
        <View style={styles.compactCardBadgeRow}>
          <TagChip label={`热度 ${spot.votes}`} compact />
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader
        eyebrow="内容与服务"
        title="Services"
        subtitle="这里聚合平台持续整理中的活动专题与轻量内容入口。"
        style={styles.pageHeader}
      />

      <View style={styles.categorySection}>
        <View style={styles.platformBanner}>
          <Text style={styles.platformBannerEyebrow}>平台整理中</Text>
          <Text style={styles.platformBannerTitle}>持续更新活动与地点内容，欢迎随时反馈修正</Text>
          <Text style={styles.platformBannerText}>
            商家活动与更多平台服务能力也会逐步开放。
          </Text>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>活动与专题</Text>
            <Text style={styles.sectionDescription}>平台当前整理中的宠物活动、内容专题与未来商家活动入口。</Text>
          </View>
          <TagChip label={`${ACTIVITY_COLLECTIONS.length} 条`} compact />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {ACTIVITY_COLLECTIONS.map((activity) => {
            const linkedSpotName =
              activity.spotIds[0] ? spots.find((spot) => spot.id === activity.spotIds[0])?.name ?? '' : '';

            return (
              <Pressable
                key={activity.key}
                onPress={() => handleOpenActivity(activity)}
                style={({ pressed }) => [styles.activityCard, pressed ? styles.cardPressed : null]}>
                {activity.imageUri ? (
                  <Image source={{ uri: activity.imageUri }} style={styles.activityImage} />
                ) : (
                  <ActivityVisual
                    title={activity.title}
                    summary={activity.summary}
                    statusLabel={activity.statusLabel}
                    style={styles.activityVisual}
                  />
                )}
                <View style={styles.activityTopRow}>
                  <TagChip label={activity.statusLabel} compact />
                  {linkedSpotName ? (
                    <Text style={styles.activitySpotName} numberOfLines={1}>
                      {linkedSpotName}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activitySummary} numberOfLines={3}>
                  {activity.summary}
                </Text>
                <Pressable
                  onPress={() => handleOpenActivity(activity)}
                  style={({ pressed }) => [
                    styles.activityCta,
                    pressed ? styles.cardPressed : null,
                  ]}>
                  <Text style={styles.activityCtaText}>{activity.ctaLabel}</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>今日推荐</Text>
          <TagChip label={`${recommendedSpots.length} 个`} compact />
        </View>
        {recommendedSpots.length === 0 ? (
          <Text style={styles.emptyText}>暂无推荐地点</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {recommendedSpots.map((spot) => renderCompactSpotCard(spot))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  pageHeader: {
    marginBottom: theme.spacing.xs,
  },
  cardPressed: {
    opacity: 0.92,
  },
  countBadge: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categorySection: {
    marginTop: 0,
  },
  platformBanner: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  platformBannerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  platformBannerTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  platformBannerText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  section: {
    marginTop: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  sectionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  horizontalList: {
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.xs,
  },
  compactCard: {
    width: 190,
    borderRadius: theme.radii.md,
    borderWidth: 0.5,
    borderColor: '#E7EAF0',
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  compactCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  compactCardAddress: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  compactCardBadgeRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityCard: {
    width: 220,
    borderRadius: theme.radii.md,
    borderWidth: 0.5,
    borderColor: '#E7EAF0',
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 10,
  },
  activityImage: {
    width: '100%',
    height: 88,
    borderRadius: theme.radii.sm,
    marginBottom: 9,
  },
  activityVisual: {
    marginBottom: 9,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  activitySpotName: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  activityTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  activitySummary: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  activityCta: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activityCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});

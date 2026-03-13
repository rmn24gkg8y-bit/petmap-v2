import { router } from 'expo-router';
import { useMemo, type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader, TagChip } from '@/components/ui';
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

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    spotType: 'park',
    icon: { ios: 'leaf', android: 'park', web: 'park' },
    tint: '#2F9E44',
  },
  {
    spotType: 'cafe',
    icon: { ios: 'cup.and.saucer', android: 'local_cafe', web: 'local_cafe' },
    tint: '#B96A2F',
  },
  {
    spotType: 'hospital',
    icon: { ios: 'cross.case', android: 'local_hospital', web: 'local_hospital' },
    tint: '#D6333D',
  },
  {
    spotType: 'store',
    icon: { ios: 'bag', android: 'storefront', web: 'storefront' },
    tint: '#7C4DFF',
  },
  {
    spotType: 'indoor',
    icon: { ios: 'house', android: 'home', web: 'home' },
    tint: '#1D6FD8',
  },
  {
    spotType: 'other',
    icon: { ios: 'mappin', android: 'place', web: 'place' },
    tint: '#6B7280',
  },
];

function getDisplayAddress(spot: Spot) {
  return (
    spot.formattedAddress?.trim() ||
    [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
    '地址待补充'
  );
}

export default function ServicesScreen() {
  const { spots, setSelectedSpot, setSelectedSpotType, resetExploreFilters } = usePetMapStore();

  const categoryCountMap = useMemo(() => {
    const initial: Record<SpotType, number> = {
      park: 0,
      cafe: 0,
      hospital: 0,
      store: 0,
      indoor: 0,
      other: 0,
    };

    for (const spot of spots) {
      initial[spot.spotType] += 1;
    }

    return initial;
  }, [spots]);

  const recommendedSpots = useMemo(
    () => [...spots].sort((a, b) => b.votes - a.votes).slice(0, 2),
    [spots]
  );

  function handleOpenExploreByType(spotType: SpotType) {
    resetExploreFilters();
    setSelectedSpotType(spotType);
    router.navigate('/(tabs)/explore');
  }

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
        eyebrow="按需求找"
        title="Services"
        subtitle="快速找到适合你和宠物的地点"
        style={styles.pageHeader}
      />

      <View style={styles.categorySection}>
        <View style={styles.categoryHeaderRow}>
          <Text style={styles.sectionTitle}>按类型快速找</Text>
          <TagChip label={`${spots.length} 个地点`} compact />
        </View>
        <View style={styles.categoryGrid}>
          {SERVICE_CATEGORIES.map((category) => (
            <Pressable
              key={category.spotType}
              onPress={() => handleOpenExploreByType(category.spotType)}
              style={({ pressed }) => [styles.categoryMiniButton, pressed ? styles.cardPressed : null]}>
              <View style={styles.categoryButtonTopRow}>
                <View style={[styles.categoryMiniIconWrap, { borderColor: `${category.tint}33` }]}>
                  <SymbolView name={category.icon} tintColor={category.tint} size={15} />
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{categoryCountMap[category.spotType]}</Text>
                </View>
              </View>
              <Text style={styles.categoryMiniTitle} numberOfLines={1}>
                {SPOT_TYPE_LABELS[category.spotType]}
              </Text>
            </Pressable>
          ))}
        </View>
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

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>本周活动</Text>
            <Text style={styles.sectionDescription}>平台当前整理中的宠物活动与后续商家活动入口。</Text>
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
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  categoryMiniButton: {
    width: '48.5%',
    borderRadius: theme.radii.md,
    borderWidth: 0.5,
    borderColor: '#E7EAF0',
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  categoryButtonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryMiniIconWrap: {
    width: 20,
    height: 20,
    borderRadius: theme.radii.pill,
    borderWidth: 0.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMiniTitle: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    paddingVertical: 10,
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

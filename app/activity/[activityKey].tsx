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
            eyebrow="活动专题"
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

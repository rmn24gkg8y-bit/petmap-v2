import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import HeatIcon from '@/assets/icons/heat-icon.svg';
import { EmptyStateCard, PrimaryButton } from '@/components/ui';
import { getActivityCollectionByKey } from '@/constants/activityCollections';
import { SPOT_TYPE_LABELS } from '@/constants/spotFormOptions';
import { usePetMapStore } from '@/store/petmap-store';
import type { Spot } from '@/types/spot';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

const TYPE_BADGE_COLORS = {
  park: '#55A462',
  cafe: '#8C6239',
  hospital: '#E6E6E6',
  store: '#0071BC',
  indoor: '#B02E2A',
  other: '#8C6239',
} as const;

function BackArrowIcon() {
  return (
    <Svg width={8} height={16} viewBox="0 0 11 19" fill="none">
      <Path
        d="M9.5 17.5L1.5 9.5L9.5 1.5"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function getDisplayAddress(spot: Spot) {
  return (
    spot.formattedAddress?.trim() ||
    [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
    '地址待补充'
  );
}

function ServiceInfoSpotCard({
  spot,
  distanceText,
  onPress,
}: {
  spot: Spot;
  distanceText: string;
  onPress: () => void;
}) {
  const district = spot.district.trim() || '未知区域';
  const address = getDisplayAddress(spot);
  const visibleTags = spot.tags.slice(0, 4);
  const typeColor = TYPE_BADGE_COLORS[spot.spotType] ?? TYPE_BADGE_COLORS.other;
  const typeTextColor = spot.spotType === 'hospital' ? '#303030' : '#FFFFFF';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.spotCard, pressed && styles.spotCardPressed]}>
      <View style={styles.spotMediaLayer}>
        {spot.photoUris?.[0] ? (
          <Image source={{ uri: spot.photoUris[0] }} style={styles.spotImage} />
        ) : (
          <View style={styles.spotImagePlaceholder}>
            <View style={styles.spotPlaceholderGlowA} />
            <View style={styles.spotPlaceholderGlowB} />
            <View style={styles.spotPlaceholderContent}>
              <View style={styles.spotPlaceholderIconWrap}>
                <Ionicons name="image-outline" size={16} color="#6A6863" />
              </View>
              <Text style={styles.spotPlaceholderTitle}>PetMap Spot</Text>
              <Text style={styles.spotPlaceholderSubtitle}>暂无图片</Text>
            </View>
          </View>
        )}
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0.12)',
          'rgba(0,0,0,0.3)',
          'rgba(0,0,0,0.6)',
        ]}
        locations={[0, 0.44, 0.72, 1]}
        style={styles.spotGradientLayer}
      />

      <View style={styles.spotCardContent}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
          <Text style={[styles.typeBadgeText, { color: typeTextColor }]}>{SPOT_TYPE_LABELS[spot.spotType]}</Text>
        </View>

        <View style={styles.spotBottomContent}>
          <View>
            <View style={styles.sourceRow}>
              <Ionicons name="layers-outline" size={11} color="#ED8422" />
              <Text style={styles.sourceText}>平台整理</Text>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.spotTitle} numberOfLines={1}>
                {spot.name}
              </Text>
              <Text style={styles.distanceText} numberOfLines={1}>
                {distanceText}
              </Text>
            </View>

            <View style={styles.addressRow}>
              <Text style={styles.districtText} numberOfLines={1}>
                {district}
              </Text>
              <Text style={styles.addressDot}>·</Text>
              <Text style={styles.addressDetailText} numberOfLines={1}>
                {address}
              </Text>
            </View>

            <View style={styles.tagsRow}>
              {visibleTags.map((tag) => (
                <View key={`${spot.id}-${tag}`} style={styles.tagPill}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.heatRow}>
            <HeatIcon width={13} height={13} />
            <Text style={styles.heatText}>{spot.votes}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function ActivityCollectionScreen() {
  const params = useLocalSearchParams<{ activityKey?: string }>();
  const { spots, setSelectedSpot, userLoc } = usePetMapStore();
  const insets = useSafeAreaInsets();
  const activity = getActivityCollectionByKey(params.activityKey ?? '');
  const relatedSpots = activity
    ? activity.spotIds
        .map((id) => spots.find((spot) => spot.id === id) ?? null)
        .filter((spot): spot is Spot => spot !== null)
    : [];

  const heroHeight = insets.top + 349;

  function handleOpenSpot(spotId: string) {
    setSelectedSpot(spotId);
    router.navigate({ pathname: '/(tabs)', params: { openToHalf: '1' } });
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/*
        白色背景层：从 hero 底部延伸到屏幕底部。
        底部 overscroll 时露出白色；顶部 overscroll 穿透到 container 橙色。
      */}
      <View style={[styles.bottomWhiteBg, { top: heroHeight }]} />

      {!activity ? (
        <View style={styles.emptyWrap}>
          <EmptyStateCard
            title="活动专题不存在"
            description="当前没有找到对应的活动内容。"
            action={<PrimaryButton label="返回 Services" onPress={() => router.replace('/(tabs)/services')} />}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 108 }]}>
          <View style={[styles.hero, { height: heroHeight }]}>
            <SafeAreaView edges={['top']} style={styles.safeTopRow}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
                <BackArrowIcon />
              </Pressable>
            </SafeAreaView>

            <View style={styles.titleSection}>
              <Text style={styles.title}>本周精选遛狗地点</Text>
              <Text style={styles.subtitle}>平台每周都会精选适合遛狗的精选地点，总有一个是你喜欢的！</Text>
            </View>

            <View style={styles.headerPic} />
          </View>

          <View style={styles.contentSheet}>
            <View style={styles.listWrap}>
              {relatedSpots.length === 0 ? (
                <EmptyStateCard
                  title="暂时没有可展示的关联地点"
                  description="活动内容已建立，相关地点仍在整理中。"
                />
              ) : (
                relatedSpots.map((spot) => (
                  <ServiceInfoSpotCard
                    key={spot.id}
                    spot={spot}
                    distanceText={
                      userLoc
                        ? formatDistance(getDistanceMeters(userLoc, { lat: spot.lat, lng: spot.lng })).replace(/\s+/g, '')
                        : '距离未知'
                    }
                    onPress={() => handleOpenSpot(spot.id)}
                  />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ED8422',
  },
  bottomWhiteBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFEFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  hero: {
    position: 'relative',
    backgroundColor: '#ED8422',
  },
  safeTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingLeft: 16,
    paddingTop: 6,
    zIndex: 6,
  },
  backButton: {
    width: 30,
    height: 30,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.94 }],
  },
  titleSection: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 192,
    width: 335,
    maxWidth: '100%',
    gap: 2,
    zIndex: 3,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '400',
  },
  headerPic: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 10,
    height: 172,
    borderRadius: 20,
    backgroundColor: '#D9D9D9',
    zIndex: 2,
  },
  contentSheet: {
    flex: 1,
    minHeight: 520,
    backgroundColor: '#FFFEFF',
    paddingTop: 14,
  },
  listWrap: {
    paddingHorizontal: 16,
  },
  spotCard: {
    width: '100%',
    height: 168,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#D7D2CB',
    marginBottom: 17,
  },
  spotCardPressed: {
    opacity: 0.88,
  },
  spotMediaLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  spotImage: {
    width: '100%',
    height: '100%',
  },
  spotImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D8D2C8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spotPlaceholderGlowA: {
    position: 'absolute',
    top: -24,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  spotPlaceholderGlowB: {
    position: 'absolute',
    bottom: -42,
    left: -28,
    width: 116,
    height: 116,
    borderRadius: 999,
    backgroundColor: 'rgba(118,112,102,0.2)',
  },
  spotPlaceholderContent: {
    alignItems: 'center',
  },
  spotPlaceholderIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotPlaceholderTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#55524D',
  },
  spotPlaceholderSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: '#726D66',
  },
  spotGradientLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  spotCardContent: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 9,
    justifyContent: 'space-between',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    minHeight: 21,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  spotBottomContent: {
    position: 'relative',
    paddingRight: 52,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 1,
  },
  sourceText: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '900',
    color: '#ED8422',
  },
  titleRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  spotTitle: {
    flexShrink: 1,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceText: {
    marginLeft: 9,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
  },
  addressRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  districtText: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressDot: {
    marginHorizontal: 5,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  addressDetailText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.88)',
  },
  tagsRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tagPill: {
    height: 16,
    minWidth: 31,
    borderRadius: 999,
    backgroundColor: 'rgba(237,132,34,0.88)',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.96)',
  },
  heatRow: {
    position: 'absolute',
    right: 12,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heatText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(244,244,244,0.95)',
  },
});

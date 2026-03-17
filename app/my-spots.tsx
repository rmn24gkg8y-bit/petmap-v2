import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import HeatIcon from '@/assets/icons/heat-icon.svg';
import SearchIcon from '@/assets/icons/search-icon.svg';
import DogHero from '@/assets/illustrations/dog-hero.svg';
import { SPOT_TYPE_LABELS } from '@/constants/spotFormOptions';
import { usePetMapStore } from '@/store/petmap-store';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

type MySpotFilter = 'all' | 'published' | 'pending' | 'unsubmitted';
type MySpot = ReturnType<typeof usePetMapStore>['userSpots'][number];

type StatusMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

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

function getDisplayAddress(spot: MySpot) {
  return (
    spot.formattedAddress?.trim() ||
    [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
    '地址待补充'
  );
}

function getSpotStatusMeta(spot: MySpot): StatusMeta {
  if (spot.verified) {
    return {
      label: '已发布',
      icon: 'checkmark-circle-outline',
      color: '#67A735',
    };
  }

  if (spot.submissionStatus === 'pending_review') {
    return {
      label: '审核中',
      icon: 'time-outline',
      color: '#ED8422',
    };
  }

  return {
    label: '未提交',
    icon: 'document-outline',
    color: '#2F2F2F',
  };
}

function matchesSpotFilter(spot: MySpot, filter: MySpotFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'published') {
    return Boolean(spot.verified);
  }

  if (filter === 'pending') {
    return spot.submissionStatus === 'pending_review';
  }

  return !spot.verified && (spot.submissionStatus === undefined || spot.submissionStatus === 'local');
}

function MySpotCard({
  spot,
  distanceText,
  onPress,
}: {
  spot: MySpot;
  distanceText: string;
  onPress: () => void;
}) {
  const statusMeta = getSpotStatusMeta(spot);
  const district = spot.district.trim() || '未知区域';
  const address = getDisplayAddress(spot);
  const visibleTags = spot.tags.slice(0, 4);
  const typeColor = TYPE_BADGE_COLORS[spot.spotType] ?? TYPE_BADGE_COLORS.other;
  const typeTextColor = spot.spotType === 'hospital' ? '#303030' : '#FFFFFF';

  return (
    <Pressable onPress={onPress} style={styles.spotCard}>
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
              <Ionicons name={statusMeta.icon} size={11} color={statusMeta.color} />
              <Text style={[styles.sourceText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
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
              {visibleTags.length > 0
                ? visibleTags.map((tag) => (
                    <View key={`${spot.id}-${tag}`} style={styles.tagPill}>
                      <Text style={styles.tagText} numberOfLines={1}>
                        {tag}
                      </Text>
                    </View>
                  ))
                : null}
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

export default function MySpotsScreen() {
  const insets = useSafeAreaInsets();
  const { userSpots, setSelectedSpot, userLoc } = usePetMapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<MySpotFilter>('all');

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredSpots = useMemo(() => {
    return userSpots.filter((spot) => {
      const matchesFilter = matchesSpotFilter(spot, selectedFilter);
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [spot.name, spot.formattedAddress ?? '', spot.addressHint, spot.district, ...spot.tags]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [normalizedQuery, selectedFilter, userSpots]);

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    router.navigate({
      pathname: '/(tabs)',
      params: {
        returnTo: 'my-spots',
      },
    });
  }

  const sheetTop = insets.top + 222;
  const titleTop = insets.top + 80;
  const mascotTop = insets.top + 24;
  const searchTop = insets.top + 131;
  const chipsTop = insets.top + 176;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.heroLayer}>
        <SafeAreaView edges={['top']} style={styles.safeTopRow}>
          <Pressable onPress={() => router.navigate('/(tabs)')} style={styles.backButton}>
            <BackArrowIcon />
          </Pressable>
        </SafeAreaView>

        <DogHero width={101} height={132} style={[styles.heroDog, { top: mascotTop }]} />

        <Text style={[styles.heroTitle, { top: titleTop }]}>我的地点</Text>

        <View style={[styles.searchBoxWrap, { top: searchTop }]}>
          <SearchIcon width={20} height={20} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索"
            placeholderTextColor="#6A6A6A"
            style={styles.searchInput}
          />
        </View>

        <View style={[styles.heroChipRow, { top: chipsTop }]}>
          <Pressable
            onPress={() => setSelectedFilter('all')}
            style={[styles.heroChip, selectedFilter === 'all' ? styles.heroChipActive : styles.heroChipDefault]}>
            <Text
              style={[
                styles.heroChipText,
                selectedFilter === 'all' ? styles.heroChipTextActive : styles.heroChipTextDefault,
              ]}>
              全部
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('published')}
            style={[
              styles.heroChip,
              selectedFilter === 'published' ? styles.heroChipActive : styles.heroChipDefault,
            ]}>
            <Text
              style={[
                styles.heroChipText,
                selectedFilter === 'published' ? styles.heroChipTextActive : styles.heroChipTextDefault,
              ]}>
              已发布
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('pending')}
            style={[
              styles.heroChip,
              selectedFilter === 'pending' ? styles.heroChipActive : styles.heroChipDefault,
            ]}>
            <Text
              style={[
                styles.heroChipText,
                selectedFilter === 'pending' ? styles.heroChipTextActive : styles.heroChipTextDefault,
              ]}>
              审核中
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('unsubmitted')}
            style={[
              styles.heroChip,
              selectedFilter === 'unsubmitted' ? styles.heroChipActive : styles.heroChipDefault,
            ]}>
            <Text
              style={[
                styles.heroChipText,
                selectedFilter === 'unsubmitted' ? styles.heroChipTextActive : styles.heroChipTextDefault,
              ]}>
              未提交
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.contentSheet, { top: sheetTop, paddingBottom: insets.bottom }]}> 
        {filteredSpots.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>暂时还没有添加的地点呢</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSpots}
            keyExtractor={(item) => item.id}
            alwaysBounceVertical
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            renderItem={({ item }) => {
              const distanceText = userLoc
                ? formatDistance(getDistanceMeters(userLoc, { lat: item.lat, lng: item.lng })).replace(/\s+/g, '')
                : '距离未知';

              return (
                <MySpotCard
                  spot={item}
                  distanceText={distanceText}
                  onPress={() => handleSelectSpot(item.id)}
                />
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#67A735',
  },
  heroLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#67A735',
  },
  backButton: {
    width: 44,
    height: 36,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 2,
    paddingHorizontal: 16,
    zIndex: 6,
    alignItems: 'flex-start',
  },
  heroDog: {
    position: 'absolute',
    right: 170,
    zIndex: 1,
  },
  heroTitle: {
    position: 'absolute',
    right: 16,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    zIndex: 2,
  },
  searchBoxWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFEFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#424242',
    padding: 0,
  },
  heroChipRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 4,
  },
  heroChip: {
    borderRadius: 50,
    paddingVertical: 5,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChipActive: {
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: '#67A735',
  },
  heroChipDefault: {
    backgroundColor: '#FFFEFF',
  },
  heroChipText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  heroChipTextActive: {
    color: '#F4F4F4',
  },
  heroChipTextDefault: {
    color: '#67A735',
  },
  contentSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFEFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  listContent: {
    paddingTop: 19,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listSeparator: {
    height: 17,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyText: {
    color: '#404040',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
  },
  spotCard: {
    width: '100%',
    height: 168,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#D7D2CB',
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

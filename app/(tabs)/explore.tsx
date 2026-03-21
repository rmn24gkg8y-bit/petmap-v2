import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeatIcon from '@/assets/icons/heat-icon.svg';
import MessageSquareIcon from '@/assets/icons/message-square.svg';
import SearchIcon from '@/assets/icons/search-icon.svg';
import DogHero from '@/assets/illustrations/dog-hero.svg';
import {
  normalizeSpotTags,
  SPOT_TYPE_LABELS,
  SPOT_TYPE_OPTIONS,
} from '@/constants/spotFormOptions';
import { EmptyStateCard, PrimaryButton } from '@/components/ui';
import { usePetMapStore } from '@/store/petmap-store';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

const HERO_TAGS = ['全部', '安静', '草坪', '江边', '散步'];
const SORT_OPTIONS = [
  { label: '热门', value: 'popular' as const },
  { label: '名称', value: 'name' as const },
  { label: '距离', value: 'distance' as const },
];

const TYPE_BADGE_COLORS = {
  park: '#55A462',
  cafe: '#8C6239',
  hospital: '#E6E6E6',
  store: '#0071BC',
  indoor: '#B02E2A',
  other: '#8C6239',
} as const;

type ExploreSpot = ReturnType<typeof usePetMapStore>['filteredSpots'][number];
type ExploreMenu = 'sort' | 'district' | 'type' | null;

function stripLeadingDistrict(detail: string, district: string) {
  const normalizedDetail = detail.trim();
  const normalizedDistrict = district.trim();

  if (!normalizedDetail || !normalizedDistrict || !normalizedDetail.startsWith(normalizedDistrict)) {
    return normalizedDetail;
  }

  const withoutDistrict = normalizedDetail.slice(normalizedDistrict.length).replace(/^[·,\s，]+/, '').trim();

  return withoutDistrict || normalizedDetail;
}

function getDisplayAddressDetail(spot: ExploreSpot) {
  const district = spot.district.trim() || '未知区域';
  const primaryAddress = spot.formattedAddress?.trim() || spot.addressHint?.trim() || '地址待补充';

  return stripLeadingDistrict(primaryAddress, district) || '地址待补充';
}

function getCardLocationLine(spot: ExploreSpot) {
  const district = spot.district.trim() || '未知区域';
  const detail = getDisplayAddressDetail(spot);

  if (detail === '地址待补充') {
    return district;
  }

  return `${district} · ${detail}`;
}

const EXPLORE_TYPE_BADGE_LABEL_BY_SPOT_TYPE: Partial<
  Record<ExploreSpot['spotType'], string | null>
> = {
  park: '公园',
  cafe: '咖啡',
  indoor: '商场',
  hospital: null,
  store: null,
  other: null,
};

const OTHER_BADGE_TAG_PRIORITY = ['屋顶', '江边', '开阔空间'] as const;

function getExploreCardBadgeLabel(spot: ExploreSpot, normalizedTags: string[]) {
  const typeLabel = EXPLORE_TYPE_BADGE_LABEL_BY_SPOT_TYPE[spot.spotType];

  if (typeof typeLabel === 'string' && typeLabel.trim()) {
    return typeLabel;
  }

  if (spot.spotType !== 'other') {
    return null;
  }

  for (const tag of OTHER_BADGE_TAG_PRIORITY) {
    if (normalizedTags.includes(tag)) {
      return tag;
    }
  }

  return null;
}

function ExploreSpotCard({
  spot,
  distanceText,
  onPress,
}: {
  spot: ExploreSpot;
  distanceText: string;
  onPress: () => void;
}) {
  const locationLine = getCardLocationLine(spot);
  const normalizedTags = normalizeSpotTags(spot.tags, spot.name);
  const typeBadgeLabel = getExploreCardBadgeLabel(spot, normalizedTags);
  const visibleTags = normalizedTags
    .filter((tag) => tag !== typeBadgeLabel)
    .slice(0, 3);
  const typeColor = TYPE_BADGE_COLORS[spot.spotType] ?? TYPE_BADGE_COLORS.other;
  const typeTextColor = spot.spotType === 'hospital' ? '#303030' : '#FFFFFF';

  return (
    <View style={styles.spotCardShadow}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.spotCard, pressed && styles.spotCardPressed]}>
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
                <Text style={styles.spotPlaceholderSubtitle}>地点图片待补充</Text>
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
          <View style={styles.typeBadgeSlot}>
            {typeBadgeLabel ? (
              <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                <Text style={[styles.typeBadgeText, { color: typeTextColor }]}>{typeBadgeLabel}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.spotBottomContent}>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.spotTitle} numberOfLines={1}>
                  {spot.name}
                </Text>
                <Text style={styles.distanceText} numberOfLines={1}>
                  {distanceText}
                </Text>
              </View>

              <View style={styles.addressRow}>
                <Text style={styles.addressDetailText} numberOfLines={1}>
                  {locationLine}
                </Text>
              </View>

              {visibleTags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {visibleTags.map((tag) => (
                    <View key={`${spot.id}-${tag}`} style={styles.tagPill}>
                      <Text style={styles.tagText} numberOfLines={1}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.heatRow}>
              <HeatIcon width={13} height={13} />
              <Text style={styles.heatText}>{spot.votes}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const {
    filteredSpots,
    searchQuery,
    selectedTags,
    selectedSpotType,
    sortMode,
    userLoc,
    setSelectedSpot,
    setSearchQuery,
    toggleSelectedTag,
    clearSelectedTags,
    setSelectedSpotType,
    setSortMode,
    resetExploreFilters,
  } = usePetMapStore();

  const [openMenu, setOpenMenu] = useState<ExploreMenu>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('全部');
  const [hasPickedSort, setHasPickedSort] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const districtOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        filteredSpots
          .map((spot) => spot.district.trim())
          .filter(Boolean),
      ),
    ).slice(0, 10);

    return ['全部', ...values];
  }, [filteredSpots]);

  const visibleSpots = useMemo(() => {
    if (selectedDistrict === '全部') {
      return filteredSpots;
    }

    return filteredSpots.filter((spot) => spot.district.trim() === selectedDistrict);
  }, [filteredSpots, selectedDistrict]);

  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? '热门';
  const selectedTypeLabel = selectedSpotType ? SPOT_TYPE_LABELS[selectedSpotType] : '';
  const sortSelectorLabel = hasPickedSort ? selectedSortLabel : '排序';
  const districtSelectorLabel = selectedDistrict === '全部' ? '区域' : selectedDistrict;
  const typeSelectorLabel = selectedSpotType ? selectedTypeLabel : '类型';

  const heroTopPadding = insets.top + 57;
  const messageButtonTop = insets.top + 10;
  const dogTop = insets.top;

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    setOpenMenu(null);
    router.navigate({ pathname: '/(tabs)', params: { openToHalf: '1' } });
  }

  function handleHeroTagPress(tag: string) {
    if (tag === '全部') {
      clearSelectedTags();
      return;
    }

    toggleSelectedTag(tag);
  }

  return (
    <View style={styles.container}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <View style={[styles.hero, { paddingTop: heroTopPadding }]}>
        <LinearGradient
          colors={['#F59528', '#E07215', '#D46C10']}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <DogHero width={76} height={100} style={[styles.heroDog, { top: dogTop }]} />

        <Pressable
          style={({ pressed }) => [styles.messageButton, { top: messageButtonTop }, pressed && styles.messageButtonPressed]}
          onPress={() => router.push('/inbox')}>
          <MessageSquareIcon width={18} height={18} />
        </Pressable>

        <View style={styles.heroContent}>
          <View style={[styles.searchBoxWrap, isSearchFocused && styles.searchBoxFocused]}>
            <SearchIcon width={16} height={16} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索地点、区域、标签"
              placeholderTextColor="#6A6A6A"
              style={styles.searchInput}
              onFocus={() => {
                setOpenMenu(null);
                setIsSearchFocused(true);
              }}
              onBlur={() => setIsSearchFocused(false)}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.heroChipRow}>
            {HERO_TAGS.map((tag) => {
              const isActive = tag === '全部' ? selectedTags.length === 0 : selectedTags.includes(tag);

              return (
                <Pressable
                  key={tag}
                  onPress={() => handleHeroTagPress(tag)}
                  style={({ pressed }) => [styles.heroChip, isActive ? styles.heroChipActive : styles.heroChipDefault, pressed && styles.heroChipPressed]}>
                  <Text style={[styles.heroChipText, isActive ? styles.heroChipTextActive : styles.heroChipTextDefault]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ── Content Sheet ─────────────────────────────────────── */}
      <View style={styles.contentSheet}>
        <View style={styles.selectorWrap}>
          <Pressable
            onPress={() => setOpenMenu((current) => (current === 'sort' ? null : 'sort'))}
            style={({ pressed }) => [styles.selectorButton, pressed && styles.selectorButtonPressed]}>
            <Text style={styles.selectorText}>{sortSelectorLabel}</Text>
            <Ionicons name="chevron-down" size={13} color="#8A7A6A" />
          </Pressable>

          <View style={styles.selectorDivider} />

          <Pressable
            onPress={() => setOpenMenu((current) => (current === 'district' ? null : 'district'))}
            style={({ pressed }) => [styles.selectorButton, pressed && styles.selectorButtonPressed]}>
            <Text style={styles.selectorText}>{districtSelectorLabel}</Text>
            <Ionicons name="chevron-down" size={13} color="#8A7A6A" />
          </Pressable>

          <View style={styles.selectorDivider} />

          <Pressable
            onPress={() => setOpenMenu((current) => (current === 'type' ? null : 'type'))}
            style={({ pressed }) => [styles.selectorButton, pressed && styles.selectorButtonPressed]}>
            <Text style={styles.selectorText}>{typeSelectorLabel}</Text>
            <Ionicons name="chevron-down" size={13} color="#8A7A6A" />
          </Pressable>

          {openMenu === 'sort' ? (
            <View style={[styles.dropdownMenu, styles.dropdownLeft]}>
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setSortMode(option.value);
                    setHasPickedSort(true);
                    setOpenMenu(null);
                  }}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}>
                  <Text style={styles.dropdownItemText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {openMenu === 'district' ? (
            <View style={[styles.dropdownMenu, styles.dropdownCenter]}>
              {districtOptions.map((district) => (
                <Pressable
                  key={district}
                  onPress={() => {
                    setSelectedDistrict(district);
                    setOpenMenu(null);
                  }}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}>
                  <Text style={styles.dropdownItemText} numberOfLines={1}>
                    {district}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {openMenu === 'type' ? (
            <View style={[styles.dropdownMenu, styles.dropdownRight]}>
              <Pressable
                onPress={() => {
                  setSelectedSpotType(null);
                  setOpenMenu(null);
                }}
                style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}>
                <Text style={styles.dropdownItemText}>全部</Text>
              </Pressable>

              {SPOT_TYPE_OPTIONS.map((spotType) => (
                <Pressable
                  key={spotType}
                  onPress={() => {
                    setSelectedSpotType(spotType);
                    setOpenMenu(null);
                  }}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}>
                  <Text style={styles.dropdownItemText}>{SPOT_TYPE_LABELS[spotType]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <FlatList
          data={visibleSpots}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 108 }]}
          ListEmptyComponent={
            <EmptyStateCard
              title="暂时没有符合条件的地点"
              description="试试调整关键词、区域、标签或类型。"
              action={
                <PrimaryButton
                  label="重置筛选"
                  onPress={() => {
                    resetExploreFilters();
                    setSelectedDistrict('全部');
                    setHasPickedSort(false);
                    setOpenMenu(null);
                  }}
                />
              }
            />
          }
          renderItem={({ item }) => {
            const distanceText = userLoc
              ? formatDistance(getDistanceMeters(userLoc, { lat: item.lat, lng: item.lng }))
              : '距离未知';

            return (
              <ExploreSpotCard
                spot={item}
                distanceText={distanceText}
                onPress={() => handleSelectSpot(item.id)}
              />
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ED8422',
  },

  // ── Hero ──────────────────────────────────────────────────────────
  hero: {
    backgroundColor: '#ED8422',
    paddingBottom: 5,
  },
  heroDog: {
    position: 'absolute',
    left: 8,
    zIndex: 0,
  },
  messageButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  messageButtonPressed: {
    opacity: 0.72,
  },
  heroContent: {
    marginTop: 9,
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchBoxWrap: {
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFEFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBoxFocused: {
    borderColor: 'rgba(237,132,34,0.45)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#424242',
    padding: 0,
  },
  heroChipRow: {
    height: 28,
    gap: 8,
    paddingRight: 24,
  },
  heroChip: {
    height: 28,
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Active chip: solid white, orange text — clearly selected
  heroChipActive: {
    backgroundColor: '#FFFEFF',
    borderWidth: 0,
  },
  // Default chip: subtle semi-transparent, recedes into orange bg
  heroChipDefault: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  heroChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroChipTextActive: {
    color: '#ED8422',
    fontWeight: '700',
  },
  heroChipTextDefault: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '500',
  },
  heroChipPressed: {
    opacity: 0.72,
  },

  // ── Content Sheet ─────────────────────────────────────────────────
  contentSheet: {
    flex: 1,
    marginTop: 0,
    backgroundColor: '#FFF8F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 16,
  },

  // ── Selector bar ──────────────────────────────────────────────────
  selectorWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    backgroundColor: '#F0EAE2',
    borderRadius: 12,
  },
  selectorButton: {
    width: '28%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  selectorButtonPressed: {
    opacity: 0.65,
  },
  selectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5A48',
    textAlign: 'center',
  },
  selectorDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#DDD0C4',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 38,
    width: '31%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    backgroundColor: '#FFFEFF',
    padding: 6,
    zIndex: 20,
    shadowColor: '#C97010',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  dropdownLeft: {
    left: 0,
  },
  dropdownCenter: {
    left: '34.5%',
  },
  dropdownRight: {
    right: 0,
  },
  dropdownItem: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dropdownItemPressed: {
    backgroundColor: '#F5EDE4',
  },
  dropdownItemText: {
    fontSize: 12,
    color: '#303030',
  },

  // ── List ──────────────────────────────────────────────────────────
  listContent: {
    paddingTop: 6,
    gap: 12,
  },

  // ── Spot card shadow wrapper ───────────────────────────────────────
  spotCardShadow: {
    borderRadius: 20,
    backgroundColor: '#DCCAB4',
    shadowColor: '#B87030',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 4,
  },

  // ── Spot card ─────────────────────────────────────────────────────
  spotCard: {
    width: '100%',
    height: 168,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#DCCAB4',
  },
  spotCardPressed: {
    opacity: 0.84,
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
    backgroundColor: '#DCCAB4',
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
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  spotPlaceholderGlowB: {
    position: 'absolute',
    bottom: -42,
    left: -28,
    width: 116,
    height: 116,
    borderRadius: 999,
    backgroundColor: 'rgba(180,120,60,0.14)',
  },
  spotPlaceholderContent: {
    alignItems: 'center',
  },
  spotPlaceholderIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
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
  typeBadgeSlot: {
    minHeight: 21,
    justifyContent: 'flex-start',
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
  titleRow: {
    marginTop: 2,
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

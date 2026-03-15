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

import {
  SPOT_TYPE_LABELS,
  SPOT_TYPE_OPTIONS,
} from '@/constants/spotFormOptions';
import { EmptyStateCard, PrimaryButton } from '@/components/ui';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

const HERO_TAGS = ['全部', '安静', '草坪', '江边', '奔跑'];
const SORT_OPTIONS = [
  { label: '热门', value: 'popular' as const },
  { label: '名称', value: 'name' as const },
  { label: '距离', value: 'distance' as const },
];

const TYPE_BADGE_COLORS = {
  park: '#2B6B2B',
  cafe: '#5D3114',
  hospital: '#5A2F52',
  store: '#344A7A',
  indoor: '#2C5E6E',
  other: '#46526B',
} as const;

type ExploreSpot = ReturnType<typeof usePetMapStore>['filteredSpots'][number];
type ExploreMenu = 'sort' | 'district' | 'type' | null;
type SourceKind = 'platform' | 'user' | 'local';

function getDisplayAddress(spot: ExploreSpot) {
  return spot.addressHint?.trim() || spot.formattedAddress?.trim() || '地址待补充';
}

function getSourceInfo(spot: ExploreSpot): { label: string; kind: SourceKind } {
  if (spot.source !== 'user') {
    return {
      label: '平台整理',
      kind: 'platform',
    };
  }

  if (spot.submissionStatus === 'local') {
    return {
      label: '本地保存',
      kind: 'local',
    };
  }

  return {
    label: '用户提供',
    kind: 'user',
  };
}

function getSourceIcon(kind: SourceKind) {
  if (kind === 'platform') {
    return { name: 'layers-outline' as const, color: '#ED8422' };
  }

  if (kind === 'local') {
    return { name: 'download-outline' as const, color: '#2F2F2F' };
  }

  return { name: 'person-outline' as const, color: '#67A735' };
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
  const sourceInfo = getSourceInfo(spot);
  const sourceIcon = getSourceIcon(sourceInfo.kind);
  const district = spot.district.trim() || '未知区域';
  const address = getDisplayAddress(spot);
  const visibleTags = spot.tags.slice(0, 4);
  const typeColor = TYPE_BADGE_COLORS[spot.spotType] ?? TYPE_BADGE_COLORS.other;

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
          <Text style={styles.typeBadgeText}>{SPOT_TYPE_LABELS[spot.spotType]}</Text>
        </View>

        <View style={styles.spotBottomContent}>
          <View>
            <View style={styles.sourceRow}>
              <Ionicons name={sourceIcon.name} size={11} color={sourceIcon.color} />
              <Text
                style={[
                  styles.sourceText,
                  sourceInfo.kind === 'platform' ? styles.sourceTextPlatform : null,
                  sourceInfo.kind === 'user' ? styles.sourceTextUser : null,
                  sourceInfo.kind === 'local' ? styles.sourceTextLocal : null,
                ]}>
                {sourceInfo.label}
              </Text>
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
            <Ionicons name="flame-outline" size={13} color="#ED8422" />
            <Text style={styles.heatText}>{spot.votes}</Text>
          </View>
        </View>
      </View>
    </Pressable>
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

  const districtOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        filteredSpots
          .map((spot) => spot.district.trim())
          .filter(Boolean)
      )
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

  const heroTopPadding = insets.top + 12;
  const messageButtonTop = insets.top + 10;
  const mascotTopOffset = Math.max(4, Math.round(insets.top * 0.1));

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    setOpenMenu(null);
    router.navigate('/(tabs)');
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
      <View style={[styles.hero, { paddingTop: heroTopPadding }]}>
        <View style={[styles.heroMascotArea, { marginTop: mascotTopOffset }]}>
          <View style={styles.heroMascotEarLeft} />
          <View style={styles.heroMascotEarRight} />
          <View style={styles.heroMascotFace}>
            <View style={styles.heroMascotEyeRow}>
              <View style={styles.heroMascotEye} />
              <View style={styles.heroMascotEye} />
            </View>
            <View style={styles.heroMascotNose} />
            <Ionicons name="paw-outline" size={12} color="#8A5B36" style={styles.heroMascotPaw} />
          </View>
        </View>

        <Pressable style={[styles.messageButton, { top: messageButtonTop }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
        </Pressable>

        <View style={styles.heroContent}>
          <View style={styles.searchBoxWrap}>
            <Ionicons name="search-outline" size={16} color="#424242" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索地点、区域、标签"
              placeholderTextColor="#6A6A6A"
              style={styles.searchInput}
              onFocus={() => setOpenMenu(null)}
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
                  style={[styles.heroChip, isActive ? styles.heroChipActive : styles.heroChipDefault]}>
                  <Text style={[styles.heroChipText, isActive ? styles.heroChipTextActive : styles.heroChipTextDefault]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.contentSheet}>
        <View style={styles.selectorWrap}>
          <Pressable
            onPress={() => setOpenMenu((current) => (current === 'sort' ? null : 'sort'))}
            style={styles.selectorButton}>
            <Text style={styles.selectorText}>{sortSelectorLabel}</Text>
            <Ionicons name="chevron-down" size={13} color="#505050" />
          </Pressable>

          <View style={styles.selectorDivider} />

          <Pressable
            onPress={() => setOpenMenu((current) => (current === 'district' ? null : 'district'))}
            style={styles.selectorButton}>
            <Text style={styles.selectorText}>{districtSelectorLabel}</Text>
            <Ionicons name="chevron-down" size={13} color="#505050" />
          </Pressable>

          <View style={styles.selectorDivider} />

          <Pressable
            onPress={() => setOpenMenu((current) => (current === 'type' ? null : 'type'))}
            style={styles.selectorButton}>
            <Text style={styles.selectorText}>{typeSelectorLabel}</Text>
            <Ionicons name="chevron-down" size={13} color="#505050" />
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
                  style={styles.dropdownItem}>
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
                  style={styles.dropdownItem}>
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
                style={styles.dropdownItem}>
                <Text style={styles.dropdownItemText}>全部</Text>
              </Pressable>

              {SPOT_TYPE_OPTIONS.map((spotType) => (
                <Pressable
                  key={spotType}
                  onPress={() => {
                    setSelectedSpotType(spotType);
                    setOpenMenu(null);
                  }}
                  style={styles.dropdownItem}>
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
          contentContainerStyle={styles.listContent}
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
  hero: {
    backgroundColor: '#ED8422',
    paddingTop: 4,
    paddingBottom: 6,
  },
  heroMascotArea: {
    marginLeft: 16,
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroMascotEarLeft: {
    position: 'absolute',
    top: 10,
    left: 16,
    width: 16,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#E9BC90',
    transform: [{ rotate: '-25deg' }],
  },
  heroMascotEarRight: {
    position: 'absolute',
    top: 10,
    right: 16,
    width: 16,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#E9BC90',
    transform: [{ rotate: '25deg' }],
  },
  heroMascotFace: {
    width: 34,
    height: 30,
    borderRadius: 12,
    backgroundColor: '#F5D5B6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  heroMascotEyeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMascotEye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B3A1E',
  },
  heroMascotNose: {
    width: 6,
    height: 5,
    borderRadius: 4,
    marginTop: 3,
    backgroundColor: '#8A5B36',
  },
  heroMascotPaw: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  messageButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchBoxWrap: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFEFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    minWidth: 65,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChipActive: {
    backgroundColor: '#ED8422',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroChipDefault: {
    backgroundColor: '#FFFEFF',
    borderWidth: 0,
  },
  heroChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroChipTextActive: {
    color: '#F4F4F4',
  },
  heroChipTextDefault: {
    color: '#ED8422',
  },
  contentSheet: {
    flex: 1,
    marginTop: 6,
    marginHorizontal: 16,
    backgroundColor: '#FFFEFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  selectorWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 10,
  },
  selectorButton: {
    width: '28%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  selectorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4C4C4C',
    textAlign: 'center',
  },
  selectorDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E6E6E6',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 34,
    width: '31%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    padding: 6,
    zIndex: 20,
    ...theme.shadows.card,
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
  dropdownItemText: {
    fontSize: 12,
    color: '#303030',
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: theme.spacing.xl + 20,
    gap: 10,
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
    minHeight: 17,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#ECECEC',
  },
  sourceTextPlatform: {
    color: '#ED8422',
  },
  sourceTextUser: {
    color: '#67A735',
  },
  sourceTextLocal: {
    color: '#2F2F2F',
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

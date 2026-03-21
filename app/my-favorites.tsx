import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import HeatIcon from '@/assets/icons/heat-icon.svg';
import SearchIcon from '@/assets/icons/search-icon.svg';
import DogHero from '@/assets/illustrations/dog-hero.svg';
import { SPOT_TYPE_LABELS } from '@/constants/spotFormOptions';
import { EmptyStateCard } from '@/components/ui';
import { usePetMapStore } from '@/store/petmap-store';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

type FavoriteSourceFilter = 'all' | 'system' | 'user';
type FavoriteSpot = ReturnType<typeof usePetMapStore>['favoriteSpots'][number];
type SourceKind = 'platform' | 'user' | 'local';

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

function getDisplayAddress(spot: FavoriteSpot) {
  return (
    spot.formattedAddress?.trim() ||
    [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
    '地址待补充'
  );
}

function getCardLocationLine(spot: FavoriteSpot) {
  const district = spot.district.trim() || '未知区域';
  const address = getDisplayAddress(spot);

  if (address === '地址待补充') {
    return district;
  }

  if (address.startsWith(district)) {
    const trimmed = address.slice(district.length).replace(/^[·,\s，]+/, '').trim();
    if (trimmed.length > 0) {
      return `${district} · ${trimmed}`;
    }
  }

  return `${district} · ${address}`;
}

function getSourceInfo(spot: FavoriteSpot): { label: string; kind: SourceKind } {
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

function FavoritesSpotCard({
  spot,
  distanceText,
  onPress,
}: {
  spot: FavoriteSpot;
  distanceText: string;
  onPress: () => void;
}) {
  const sourceInfo = getSourceInfo(spot);
  const sourceIcon = getSourceIcon(sourceInfo.kind);
  const locationLine = getCardLocationLine(spot);
  const visibleTags = spot.tags.slice(0, 3);
  const typeColor = TYPE_BADGE_COLORS[spot.spotType] ?? TYPE_BADGE_COLORS.other;
  const typeTextColor = spot.spotType === 'hospital' ? '#303030' : '#FFFFFF';

  return (
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
              <Text style={styles.addressDetailText} numberOfLines={1}>
                {locationLine}
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

export default function MyFavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { favoriteSpots, setSelectedSpot, userLoc, toggleFavorite } = usePetMapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<FavoriteSourceFilter>('all');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openedSwipeableId = useRef<string | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUndoSpotIdRef = useRef<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredFavoriteSpots = useMemo(() => {
    return favoriteSpots.filter((spot) => {
      const matchesSource =
        selectedSourceFilter === 'all' || spot.source === selectedSourceFilter;

      const matchesSearch =
        normalizedQuery.length === 0 ||
        [spot.name, spot.formattedAddress ?? '', spot.addressHint, spot.district, ...spot.tags]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery);

      return matchesSource && matchesSearch;
    });
  }, [favoriteSpots, normalizedQuery, selectedSourceFilter]);

  function handleSelectSpot(id: string) {
    closeOpenedSwipeable();
    setSelectedSpot(id);
    router.navigate({ pathname: '/(tabs)', params: { openToHalf: '1' } });
  }

  function handleRemoveFavorite(id: string, name: string) {
    closeOpenedSwipeable();
    Alert.alert('取消收藏', `将「${name}」从收藏中移除？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: () => {
          toggleFavorite(id);
          pendingUndoSpotIdRef.current = id;
          showSnackbar('已移除');
        },
      },
    ]);
  }

  function clearSnackbarTimer() {
    if (!snackbarTimerRef.current) return;
    clearTimeout(snackbarTimerRef.current);
    snackbarTimerRef.current = null;
  }

  function showSnackbar(message: string) {
    clearSnackbarTimer();
    setSnackbarMessage(message);
    setSnackbarVisible(true);
    snackbarTimerRef.current = setTimeout(() => {
      pendingUndoSpotIdRef.current = null;
      setSnackbarVisible(false);
      snackbarTimerRef.current = null;
    }, 3200);
  }

  function handleUndoRemoveFavorite() {
    const spotId = pendingUndoSpotIdRef.current;
    if (!spotId) return;

    clearSnackbarTimer();
    toggleFavorite(spotId);
    pendingUndoSpotIdRef.current = null;
    setSnackbarVisible(false);
  }

  function setSwipeableRef(id: string, ref: Swipeable | null) {
    swipeableRefs.current[id] = ref;
  }

  function closeOpenedSwipeable() {
    const openedId = openedSwipeableId.current;
    if (!openedId) return;
    swipeableRefs.current[openedId]?.close();
    openedSwipeableId.current = null;
  }

  function handleSwipeableWillOpen(id: string) {
    const currentOpenedId = openedSwipeableId.current;
    if (currentOpenedId && currentOpenedId !== id) {
      swipeableRefs.current[currentOpenedId]?.close();
    }
    openedSwipeableId.current = id;
  }

  useEffect(() => {
    return () => {
      clearSnackbarTimer();
    };
  }, []);

  const sheetTop = insets.top + 222;
  const titleTop = insets.top + 80;
  const mascotTop = insets.top + 24;
  const searchTop = insets.top + 131;
  const chipsTop = insets.top + 176;

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.heroLayer}>
        <SafeAreaView edges={['top']} style={styles.safeTopRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
            <BackArrowIcon />
          </Pressable>
        </SafeAreaView>

        <DogHero width={101} height={132} style={[styles.heroDog, { top: mascotTop }]} />

        <Text style={[styles.heroTitle, { top: titleTop }]}>我的收藏</Text>

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
            onPress={() => setSelectedSourceFilter('all')}
            style={[
              styles.heroChip,
              selectedSourceFilter === 'all' ? styles.heroChipActive : styles.heroChipDefault,
            ]}>
            <Text
              style={[
                styles.heroChipText,
                selectedSourceFilter === 'all' ? styles.heroChipTextActive : styles.heroChipTextDefault,
              ]}>
              全部
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedSourceFilter('system')}
            style={[
              styles.heroChip,
              selectedSourceFilter === 'system' ? styles.heroChipActive : styles.heroChipDefault,
            ]}>
            <Text
              style={[
                styles.heroChipText,
                selectedSourceFilter === 'system' ? styles.heroChipTextActive : styles.heroChipTextDefault,
              ]}>
              平台整理
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedSourceFilter('user')}
            style={[
              styles.heroChip,
              selectedSourceFilter === 'user' ? styles.heroChipActive : styles.heroChipDefault,
            ]}>
            <Text
              style={[
                styles.heroChipText,
                selectedSourceFilter === 'user' ? styles.heroChipTextActive : styles.heroChipTextDefault,
              ]}>
              用户添加
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.contentSheet, { top: sheetTop, paddingBottom: insets.bottom }]}>
        {filteredFavoriteSpots.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyStateCard
              title={normalizedQuery.length > 0 || selectedSourceFilter !== 'all' ? '没有匹配结果' : '还没有收藏'}
              description={normalizedQuery.length > 0 || selectedSourceFilter !== 'all' ? '试试清除搜索或切换分类' : '喜欢的地点可在地图上收藏'}
            />
          </View>
        ) : (
          <FlatList
            data={filteredFavoriteSpots}
            keyExtractor={(item) => item.id}
            alwaysBounceVertical
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            onScrollBeginDrag={closeOpenedSwipeable}
            renderItem={({ item }) => {
              const distanceText = userLoc
                ? formatDistance(getDistanceMeters(userLoc, { lat: item.lat, lng: item.lng })).replace(/\s+/g, '')
                : '距离未知';

              return (
                <View style={styles.swipeRow}>
                  <Swipeable
                    ref={(ref) => setSwipeableRef(item.id, ref)}
                    friction={2.1}
                    rightThreshold={38}
                    overshootRight={false}
                    onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
                    onSwipeableWillClose={() => {
                      if (openedSwipeableId.current === item.id) {
                        openedSwipeableId.current = null;
                      }
                    }}
                    renderRightActions={() => (
                      <View style={styles.swipeActionRail}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.swipeActionButton,
                            pressed && styles.swipeActionButtonPressed,
                          ]}
                          onPress={() => handleRemoveFavorite(item.id, item.name)}>
                          <Text style={styles.swipeActionText}>移除</Text>
                        </Pressable>
                      </View>
                    )}>
                    <FavoritesSpotCard
                      spot={item}
                      distanceText={distanceText}
                      onPress={() => handleSelectSpot(item.id)}
                    />
                  </Swipeable>
                </View>
              );
            }}
          />
        )}
      </View>

      {snackbarVisible ? (
        <View style={[styles.snackbarWrap, { bottom: insets.bottom + 16 }]}>
          <View style={styles.snackbar}>
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
            <Pressable
              onPress={handleUndoRemoveFavorite}
              style={({ pressed }) => [
                styles.snackbarActionButton,
                pressed ? styles.snackbarActionButtonPressed : null,
              ]}>
              <Text style={styles.snackbarActionText}>撤销</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ED8422',
  },
  heroLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ED8422',
  },
  backButton: {
    width: 44,
    height: 36,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.94 }],
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
    backgroundColor: '#ED8422',
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
    color: '#ED8422',
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
  swipeRow: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F5F1EC',
  },
  swipeActionRail: {
    width: 88,
    height: '100%',
    paddingVertical: 8,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  swipeActionButton: {
    flex: 1,
    backgroundColor: '#ED8422',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  swipeActionButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  spotCard: {
    width: '100%',
    height: 168,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#D7D2CB',
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
    fontWeight: '700',
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
  snackbarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 40,
  },
  snackbar: {
    minHeight: 46,
    alignSelf: 'stretch',
    borderRadius: 14,
    backgroundColor: 'rgba(28,28,30,0.94)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  snackbarText: {
    color: '#F8F8F8',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  snackbarActionButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  snackbarActionButtonPressed: {
    opacity: 0.82,
  },
  snackbarActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

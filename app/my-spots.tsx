import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
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

type MySpotFilter = 'all' | 'published' | 'pending' | 'rejected' | 'unsubmitted';
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

function getCardLocationLine(spot: MySpot) {
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

function getSpotStatusMeta(spot: MySpot): StatusMeta {
  if (spot.verified) {
    return {
      label: '已发布',
      icon: 'checkmark-circle',
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

  if (spot.submissionStatus === 'local' && spot.reviewNote) {
    return {
      label: '审核未通过',
      icon: 'close-circle',
      color: '#D94C4C',
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

  if (filter === 'rejected') {
    return !spot.verified && spot.submissionStatus === 'local' && Boolean(spot.reviewNote);
  }

  // unsubmitted: local (or undefined) but WITHOUT a reviewNote — excludes rejected spots
  return (
    !spot.verified &&
    (spot.submissionStatus === undefined || spot.submissionStatus === 'local') &&
    !spot.reviewNote
  );
}

function MySpotCard({
  spot,
  distanceText,
  onPress,
  onEditPress,
}: {
  spot: MySpot;
  distanceText: string;
  onPress: () => void;
  onEditPress?: () => void;
}) {
  const statusMeta = getSpotStatusMeta(spot);
  const locationLine = getCardLocationLine(spot);
  const visibleTags = spot.tags.slice(0, 3);
  const typeColor = TYPE_BADGE_COLORS[spot.spotType] ?? TYPE_BADGE_COLORS.other;
  const typeTextColor = spot.spotType === 'hospital' ? '#303030' : '#FFFFFF';
  const isRejected = spot.submissionStatus === 'local' && Boolean(spot.reviewNote);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.spotCard,
        isRejected ? styles.spotCardRejected : null,
        pressed && styles.spotCardPressed,
      ]}>
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

      {/* Extra dark overlay for rejected cards to make rejection info readable */}
      {isRejected ? (
        <View style={styles.rejectedDimLayer} />
      ) : (
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
      )}

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

            {spot.reviewNote ? (
              <Text
                style={[styles.reviewNoteText, isRejected ? styles.reviewNoteTextRejected : null]}
                numberOfLines={isRejected ? 3 : 1}>
                {spot.reviewNote}
              </Text>
            ) : null}

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

            {isRejected && onEditPress ? (
              <Pressable
                onPress={onEditPress}
                style={({ pressed }) => [styles.editCtaPill, pressed && styles.editCtaPillPressed]}
                hitSlop={4}>
                <Ionicons name="pencil-outline" size={11} color="#fff" />
                <Text style={styles.editCtaText}>编辑并重新提交</Text>
                <Ionicons name="arrow-forward-outline" size={11} color="rgba(255,255,255,0.8)" />
              </Pressable>
            ) : null}
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
  const {
    userSpots,
    setSelectedSpot,
    userLoc,
    syncPendingSpotReviews,
    removeSpot,
    addSpot,
    isFavorite,
    toggleFavorite,
  } = usePetMapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<MySpotFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

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

  // Keep a ref to the latest syncPendingSpotReviews to avoid stale closure in useFocusEffect.
  const syncFnRef = useRef(syncPendingSpotReviews);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openedSwipeableIdRef = useRef<string | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUndoRef = useRef<{ spot: MySpot; wasFavorite: boolean } | null>(null);
  useEffect(() => {
    syncFnRef.current = syncPendingSpotReviews;
  }, [syncPendingSpotReviews]);

  // Auto-sync on focus: subject to 30s cooldown (default mode).
  useFocusEffect(
    useCallback(() => {
      syncFnRef.current();
    }, []) // empty deps: reads from ref at call time, no loop risk
  );

  // Manual pull-to-refresh: force=true bypasses cooldown, in-flight guard still applies.
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await syncFnRef.current({ force: true });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  function handleSelectSpot(id: string) {
    closeOpenedSwipeable();
    setSelectedSpot(id);
    router.navigate({ pathname: '/(tabs)', params: { openToHalf: '1' } });
  }

  function handleEditRejectedSpot(id: string) {
    closeOpenedSwipeable();
    setSelectedSpot(id);
    router.navigate({ pathname: '/(tabs)', params: { openToHalf: '1' } });
  }

  function handleDeleteSpot(id: string, name: string) {
    closeOpenedSwipeable();
    const deletedSpot = userSpots.find((spot) => spot.id === id) ?? null;

    Alert.alert('删除地点', `确认删除「${name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const wasFavorite = isFavorite(id);
          removeSpot(id);

          if (deletedSpot) {
            pendingUndoRef.current = { spot: deletedSpot, wasFavorite };
            showSnackbar('已删除');
          }
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
      pendingUndoRef.current = null;
      setSnackbarVisible(false);
      snackbarTimerRef.current = null;
    }, 3200);
  }

  function handleUndoLastDelete() {
    const pendingUndo = pendingUndoRef.current;
    if (!pendingUndo) return;

    clearSnackbarTimer();
    addSpot(pendingUndo.spot);
    if (pendingUndo.wasFavorite) {
      toggleFavorite(pendingUndo.spot.id);
    }
    pendingUndoRef.current = null;
    setSnackbarVisible(false);
  }

  function setSwipeableRef(id: string, ref: Swipeable | null) {
    swipeableRefs.current[id] = ref;
  }

  function closeOpenedSwipeable() {
    const openedId = openedSwipeableIdRef.current;
    if (!openedId) return;
    swipeableRefs.current[openedId]?.close();
    openedSwipeableIdRef.current = null;
  }

  function handleSwipeableWillOpen(id: string) {
    const openedId = openedSwipeableIdRef.current;
    if (openedId && openedId !== id) {
      swipeableRefs.current[openedId]?.close();
    }
    openedSwipeableIdRef.current = id;
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

  const filterChips: { key: MySpotFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'published', label: '已发布' },
    { key: 'pending', label: '审核中' },
    { key: 'rejected', label: '审核未通过' },
    { key: 'unsubmitted', label: '未提交' },
  ];

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.heroChipRow, { top: chipsTop }]}
          contentContainerStyle={styles.heroChipRowContent}>
          {filterChips.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setSelectedFilter(key)}
              style={[
                styles.heroChip,
                selectedFilter === key ? styles.heroChipActive : styles.heroChipDefault,
              ]}>
              <Text
                style={[
                  styles.heroChipText,
                  selectedFilter === key ? styles.heroChipTextActive : styles.heroChipTextDefault,
                ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.contentSheet, { top: sheetTop, paddingBottom: insets.bottom }]}>
        {filteredSpots.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyStateCard
              title={normalizedQuery.length > 0 || selectedFilter !== 'all' ? '没有匹配结果' : '还没有添加的地点'}
              description={normalizedQuery.length > 0 || selectedFilter !== 'all' ? '试试清除搜索或切换分类' : '在地图上长按可新增地点'}
            />
          </View>
        ) : (
          <FlatList
            data={filteredSpots}
            keyExtractor={(item) => item.id}
            alwaysBounceVertical
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            onScrollBeginDrag={closeOpenedSwipeable}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#67A735"
                colors={['#67A735']}
              />
            }
            renderItem={({ item }) => {
              const distanceText = userLoc
                ? formatDistance(getDistanceMeters(userLoc, { lat: item.lat, lng: item.lng })).replace(/\s+/g, '')
                : '距离未知';
              const isRejected = item.submissionStatus === 'local' && Boolean(item.reviewNote);

              return (
                <View style={styles.swipeRow}>
                  <Swipeable
                    ref={(ref) => setSwipeableRef(item.id, ref)}
                    friction={2.1}
                    rightThreshold={38}
                    overshootRight={false}
                    onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
                    onSwipeableWillClose={() => {
                      if (openedSwipeableIdRef.current === item.id) {
                        openedSwipeableIdRef.current = null;
                      }
                    }}
                    renderRightActions={() => (
                      <View style={styles.swipeActionRail}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.swipeDangerActionButton,
                            pressed && styles.swipeActionButtonPressed,
                          ]}
                          onPress={() => handleDeleteSpot(item.id, item.name)}>
                          <Text style={styles.swipeDangerActionText}>删除</Text>
                        </Pressable>
                      </View>
                    )}>
                    <MySpotCard
                      spot={item}
                      distanceText={distanceText}
                      onPress={() => handleSelectSpot(item.id)}
                      onEditPress={isRejected ? () => handleEditRejectedSpot(item.id) : undefined}
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
              onPress={handleUndoLastDelete}
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
    left: 0,
    right: 0,
    height: 36,
    zIndex: 4,
  },
  heroChipRowContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  heroChip: {
    borderRadius: 50,
    paddingVertical: 5,
    paddingHorizontal: 16,
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
    fontSize: 13,
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
  swipeDangerActionButton: {
    flex: 1,
    backgroundColor: '#D94C4C',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDangerActionText: {
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
  spotCardRejected: {
    height: 210,
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
  rejectedDimLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(80,20,20,0.68)',
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
    gap: 3,
  },
  sourceText: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '700',
  },
  reviewNoteText: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,200,200,0.92)',
    fontStyle: 'italic',
  },
  reviewNoteTextRejected: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'normal',
    color: 'rgba(255,220,200,0.96)',
    lineHeight: 15,
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
  editCtaPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217,76,76,0.9)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editCtaPillPressed: {
    opacity: 0.78,
  },
  editCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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

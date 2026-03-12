import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  PanResponder,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapEmptySheet } from '@/components/map/MapEmptySheet';
import { MapQuickActions } from '@/components/map/MapQuickActions';
import { SpotDetailSheet } from '@/components/map/SpotDetailSheet';
import { SpotFormModal } from '@/components/map/SpotFormModal';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { SpotType } from '@/types/spot';

const INITIAL_REGION: Region = {
  latitude: 31.2215,
  longitude: 121.4389,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const SPOT_TYPE_MARKER_COLORS: Record<
  SpotType,
  { solid: string; soft: string }
> = {
  park: { solid: '#2F9E44', soft: '#E7F6EB' },
  cafe: { solid: '#B96A2F', soft: '#FDF0E6' },
  hospital: { solid: '#D6333D', soft: '#FDEBEC' },
  store: { solid: '#7C4DFF', soft: '#F1EBFF' },
  indoor: { solid: '#1D6FD8', soft: '#EAF2FF' },
  other: { solid: '#6B7280', soft: '#F3F4F6' },
};

export default function TabOneScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingFormattedAddress, setPendingFormattedAddress] = useState('');
  const [isResolvingPendingAddress, setIsResolvingPendingAddress] = useState(false);
  const [formError, setFormError] = useState('');
  const [sheetVisibleHeight, setSheetVisibleHeight] = useState(136 + insets.bottom);
  const [formValues, setFormValues] = useState({
    name: '',
    district: '',
    addressHint: '',
    description: '',
    petFriendlyLevel: '' as '' | 'high' | 'medium' | 'low',
    businessHours: '',
    contact: '',
    tags: [] as string[],
  });
  const {
    hasHydratedStorage,
    totalSpots,
    favoriteCount,
    spots,
    selectedSpot,
    userSpots,
    addSpot,
    updateSpot,
    removeSpot,
    addSpotPhoto,
    removeSpotPhoto,
    setSpotFormattedAddress,
    submitSpotForReview,
    setSelectedSpot,
    setUserLoc,
    clearSelectedSpot,
    toggleFavorite,
    isFavorite,
  } = usePetMapStore();

  const expandedSheetHeight = Math.min(Math.max(windowHeight * 0.5, 360), windowHeight * 0.72);
  const collapsedSheetHeight = 136 + insets.bottom;
  const collapsedOffset = Math.max(expandedSheetHeight - collapsedSheetHeight, 0);
  const quickActionsBottom = Math.max(sheetVisibleHeight + 16, insets.bottom + 120);
  const sheetTranslateY = useRef(new Animated.Value(collapsedOffset)).current;
  const dragStartRef = useRef(collapsedOffset);
  const sheetOffsetRef = useRef(collapsedOffset);
  const sheetVisibleHeightRef = useRef(collapsedSheetHeight);
  const inFlightAddressSpotIdsRef = useRef<Set<string>>(new Set());
  const amapWebKey = process.env.EXPO_PUBLIC_AMAP_WEB_KEY?.trim() ?? '';

  async function requestAmapReverseGeocode(lat: number, lng: number) {
    if (!amapWebKey) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        key: amapWebKey,
        location: `${lng},${lat}`,
        extensions: 'base',
      });
      const response = await fetch(`https://restapi.amap.com/v3/geocode/regeo?${params.toString()}`);
      const data: {
        status?: string;
        regeocode?: {
          formatted_address?: string;
          addressComponent?: {
            district?: string;
          };
        };
      } = await response.json();

      if (data.status !== '1') {
        return null;
      }

      const formattedAddress = data.regeocode?.formatted_address?.trim() ?? '';
      const district = data.regeocode?.addressComponent?.district?.trim() ?? '';

      if (!formattedAddress) {
        return null;
      }

      return {
        formattedAddress,
        district,
      };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const listenerId = sheetTranslateY.addListener(({ value }) => {
      sheetOffsetRef.current = value;
      const nextVisibleHeight = expandedSheetHeight - value;
      sheetVisibleHeightRef.current = nextVisibleHeight;
      setSheetVisibleHeight(nextVisibleHeight);
    });

    return () => {
      sheetTranslateY.removeListener(listenerId);
    };
  }, [expandedSheetHeight, sheetTranslateY]);

  useEffect(() => {
    let isMounted = true;

    async function requestUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted' || !isMounted) {
          return;
        }

        const position = await Location.getCurrentPositionAsync({});

        if (!isMounted) {
          return;
        }

        setUserLoc({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      } catch {
        // Keep the map usable even if location is unavailable.
      }
    }

    requestUserLocation();

    return () => {
      isMounted = false;
    };
  }, [setUserLoc]);

  function recenterSelectedSpot(duration = 350) {
    if (!selectedSpot || !mapRef.current) {
      return;
    }

    mapRef.current.animateCamera(
      {
        center: {
          latitude: selectedSpot.lat,
          longitude: selectedSpot.lng,
        },
        zoom: 15,
      },
      { duration }
    );
  }

  function animateSheet(toValue: number) {
    Animated.spring(sheetTranslateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start(({ finished }) => {
      if (finished && selectedSpot) {
        recenterSelectedSpot(250);
      }
    });
  }

  useEffect(() => {
    animateSheet(selectedSpot ? 0 : collapsedOffset);
  }, [collapsedOffset, selectedSpot]);

  useEffect(() => {
    const nextHeight = selectedSpot ? expandedSheetHeight : collapsedSheetHeight;
    sheetVisibleHeightRef.current = nextHeight;
    setSheetVisibleHeight(nextHeight);
  }, [collapsedSheetHeight, expandedSheetHeight, selectedSpot]);

  useEffect(() => {
    if (!selectedSpot) {
      return;
    }

    recenterSelectedSpot();
  }, [selectedSpot, sheetVisibleHeight]);

  useEffect(() => {
    console.log('[Map][addressEffect]', {
      hasHydratedStorage,
      selectedSpotId: selectedSpot?.id ?? null,
      hasFormattedAddress: Boolean(selectedSpot?.formattedAddress),
    });

    if (!hasHydratedStorage || !selectedSpot || selectedSpot.formattedAddress || !amapWebKey) {
      return;
    }

    const spot = selectedSpot;
    const isInFlight = inFlightAddressSpotIdsRef.current.has(spot.id);

    if (isInFlight) {
      return;
    }

    inFlightAddressSpotIdsRef.current.add(spot.id);
    let isCancelled = false;

    async function resolveFormattedAddress() {
      try {
        const result = await requestAmapReverseGeocode(spot.lat, spot.lng);

        if (isCancelled || !result) {
          return;
        }

        setSpotFormattedAddress(spot.id, result.formattedAddress);
      } catch {
        // Silent fallback to district + addressHint.
      } finally {
        inFlightAddressSpotIdsRef.current.delete(spot.id);
      }
    }

    resolveFormattedAddress();

    return () => {
      isCancelled = true;
    };
  }, [
    hasHydratedStorage,
    selectedSpot,
    selectedSpot?.formattedAddress,
    selectedSpot?.id,
    selectedSpot?.lat,
    selectedSpot?.lng,
    amapWebKey,
    setSpotFormattedAddress,
  ]);

  useEffect(() => {
    if (!isCreateModalVisible || modalMode !== 'create' || !pendingCoords) {
      return;
    }

    const coords = pendingCoords;
    let isCancelled = false;

    async function resolvePendingAddress() {
      setIsResolvingPendingAddress(true);
      const result = await requestAmapReverseGeocode(coords.lat, coords.lng);

      if (isCancelled) {
        return;
      }

      if (result) {
        setPendingFormattedAddress(result.formattedAddress);
        if (result.district) {
          setFormValues((current) => ({
            ...current,
            district: result.district,
          }));
        }
      } else {
        setPendingFormattedAddress('');
      }

      setIsResolvingPendingAddress(false);
    }

    resolvePendingAddress();

    return () => {
      isCancelled = true;
    };
  }, [isCreateModalVisible, modalMode, pendingCoords]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
        onPanResponderGrant: () => {
          sheetTranslateY.stopAnimation((value) => {
            dragStartRef.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextValue = dragStartRef.current + gestureState.dy;
          const clampedValue = Math.min(Math.max(nextValue, 0), collapsedOffset);

          sheetTranslateY.setValue(clampedValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!selectedSpot) {
            animateSheet(collapsedOffset);
            return;
          }

          const shouldExpand =
            gestureState.vy < -0.2 ||
            sheetOffsetRef.current < collapsedOffset * 0.45 ||
            gestureState.dy < -40;

          animateSheet(shouldExpand ? 0 : collapsedOffset);
        },
        onPanResponderTerminate: () => {
          animateSheet(selectedSpot ? 0 : collapsedOffset);
        },
      }),
    [collapsedOffset, selectedSpot, sheetTranslateY]
  );

  function handleLongPress({
    nativeEvent,
  }: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) {
    setModalMode('create');
    setEditingSpotId(null);
    setPendingCoords({
      lat: nativeEvent.coordinate.latitude,
      lng: nativeEvent.coordinate.longitude,
    });
    setFormValues({
      name: '',
      district: '',
      addressHint: '',
      description: '',
      petFriendlyLevel: '',
      businessHours: '',
      contact: '',
      tags: [],
    });
    setPendingFormattedAddress('');
    setIsResolvingPendingAddress(false);
    setFormError('');
    setIsCreateModalVisible(true);
  }

  function closeCreateModal() {
    setIsCreateModalVisible(false);
    setPendingCoords(null);
    setEditingSpotId(null);
    setModalMode('create');
    setPendingFormattedAddress('');
    setIsResolvingPendingAddress(false);
    setFormError('');
  }

  function updateFormValue(
    field: Exclude<keyof typeof formValues, 'tags'>,
    value: string
  ) {
    setFormError('');
    setFormValues((current) => ({ ...current, [field]: value }));
  }

  function toggleTag(tag: string) {
    setFormError('');
    setFormValues((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  }

  function handleSubmitSpot() {
    if (!pendingCoords) {
      return;
    }

    const name = formValues.name.trim();
    const district = formValues.district.trim();
    const addressHint = formValues.addressHint.trim();
    const formattedAddress = pendingFormattedAddress.trim();
    const description = formValues.description.trim();
    const petFriendlyLevel = formValues.petFriendlyLevel || undefined;
    const businessHours = formValues.businessHours.trim() || undefined;
    const contact = formValues.contact.trim() || undefined;
    const tags = formValues.tags;

    if (!name) {
      setFormError('请填写地点名称');
      return;
    }

    if (!district) {
      setFormError('请补充所属区');
      return;
    }

    if (modalMode === 'edit') {
      if (!editingSpotId || !selectedSpot || selectedSpot.source !== 'user') {
        return;
      }

      const updatedSpot = {
        ...selectedSpot,
        id: editingSpotId,
        name,
        district,
        addressHint,
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        tags,
        description,
        petFriendlyLevel,
        businessHours,
        contact,
      };

      updateSpot(updatedSpot);
      setSelectedSpot(updatedSpot.id);
      Alert.alert('保存成功', '地点信息已更新');
    } else {
      const newSpot = {
        id: `user-spot-${Date.now()}`,
        name,
        source: 'user' as const,
        submissionStatus: 'local' as const,
        spotType: 'other' as const,
        district,
        addressHint,
        formattedAddress: formattedAddress || undefined,
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        tags,
        description,
        votes: 0,
        petFriendlyLevel,
        businessHours,
        contact,
      };

      addSpot(newSpot);
      setSelectedSpot(newSpot.id);
      Alert.alert('新增成功', '新地点已保存在本机');
    }

    closeCreateModal();
  }

  function handleEditSpot() {
    if (!selectedSpot || selectedSpot.source !== 'user') {
      return;
    }

    setModalMode('edit');
    setEditingSpotId(selectedSpot.id);
    setPendingCoords({
      lat: selectedSpot.lat,
      lng: selectedSpot.lng,
    });
    setFormValues({
      name: selectedSpot.name,
      district: selectedSpot.district,
      addressHint: selectedSpot.addressHint,
      description: selectedSpot.description,
      petFriendlyLevel: selectedSpot.petFriendlyLevel ?? '',
      businessHours: selectedSpot.businessHours ?? '',
      contact: selectedSpot.contact ?? '',
      tags: selectedSpot.tags,
    });
    setPendingFormattedAddress(selectedSpot.formattedAddress ?? '');
    setIsResolvingPendingAddress(false);
    setFormError('');
    setIsCreateModalVisible(true);
  }

  function handleDeleteSpot() {
    if (!selectedSpot || selectedSpot.source !== 'user') {
      return;
    }

    Alert.alert('确认删除地点？', '删除后将无法恢复', [
      {
        text: '取消',
        style: 'cancel',
      },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => removeSpot(selectedSpot.id),
      },
    ]);
  }

  async function handleSubmitForReview() {
    if (
      !selectedSpot ||
      selectedSpot.source !== 'user' ||
      selectedSpot.submissionStatus === 'pending_review'
    ) {
      return;
    }

    const result = await submitSpotForReview(selectedSpot.id);

    if (result.success) {
      if (result.mode === 'cloud') {
        Alert.alert('提交成功', '该地点已提交到云端审核队列');
      } else {
        Alert.alert('已标记待审核', '当前未接入云端，已先在本地标记为待审核');
      }
      return;
    }

    Alert.alert('提交失败', result.error ?? '提交失败，请稍后重试');
  }

  async function handlePickSpotPhoto() {
    if (!selectedSpot || selectedSpot.source !== 'user') {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('无法访问相册', '请先在系统设置中允许访问相册。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0]?.uri;

      if (!uri) {
        return;
      }

      addSpotPhoto(selectedSpot.id, uri);
    } catch {
      Alert.alert('添加失败', '读取图片失败，请稍后重试。');
    }
  }

  function handleRemoveSpotPhoto(uri: string) {
    if (!selectedSpot || selectedSpot.source !== 'user') {
      return;
    }

    removeSpotPhoto(selectedSpot.id, uri);
  }

  async function handleOpenNavigation() {
    if (!selectedSpot) {
      return;
    }

    const encodedName = encodeURIComponent(selectedSpot.name);
    const { lat, lng } = selectedSpot;
    const mapCandidates = [
      Platform.select({
        ios: `maps://?ll=${lat},${lng}&q=${encodedName}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${encodedName})`,
        default: null,
      }),
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    ].filter((url): url is string => typeof url === 'string');

    for (const url of mapCandidates) {
      try {
        const canOpen = await Linking.canOpenURL(url);

        if (!canOpen) {
          continue;
        }

        await Linking.openURL(url);
        return;
      } catch {
        // Try next map URL candidate.
      }
    }

    Alert.alert('打开失败', '暂时无法打开地图导航，请稍后重试。');
  }

  async function handleShareSpotInfo() {
    if (!selectedSpot) {
      return;
    }

    const fallbackAddress = [selectedSpot.district, selectedSpot.addressHint]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' · ');
    const shareAddress = selectedSpot.formattedAddress?.trim() || fallbackAddress || '地址待补充';

    const lines = [
      `我在 PetMap 发现一个地点：${selectedSpot.name}`,
      `地址：${shareAddress}`,
      selectedSpot.description ? `简介：${selectedSpot.description}` : null,
      `坐标：${selectedSpot.lat.toFixed(6)}, ${selectedSpot.lng.toFixed(6)}`,
    ].filter((line): line is string => Boolean(line));

    try {
      await Share.share({
        message: lines.join('\n'),
      });
    } catch {
      Alert.alert('分享失败', '暂时无法分享地点信息。');
    }
  }

  const selectedSpotPhotoUris = selectedSpot?.photoUris ?? [];
  const shouldUseReadonlyDistrict =
    Boolean(pendingFormattedAddress.trim()) &&
    Boolean(formValues.district.trim());
  const selectedSpotFallbackAddress =
    selectedSpot &&
    [selectedSpot.district, selectedSpot.addressHint]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' · ');
  const selectedSpotDisplayAddress =
    selectedSpot?.formattedAddress?.trim() || selectedSpotFallbackAddress || '地址待补充';

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapPadding={{
          top: 0,
          right: 0,
          left: 0,
          bottom: Math.max(sheetVisibleHeight - 24, 0),
        }}
        onLongPress={handleLongPress}
        showsUserLocation>
        {spots.map((spot) => {
          const isSelected = selectedSpot?.id === spot.id;
          const markerColors = SPOT_TYPE_MARKER_COLORS[spot.spotType];

          return (
            <Marker
              key={spot.id}
              coordinate={{ latitude: spot.lat, longitude: spot.lng }}
              tracksViewChanges={false}
              onPress={() => setSelectedSpot(spot.id)}>
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.markerPin,
                    isSelected ? styles.markerPinSelected : styles.markerPinDefault,
                    {
                      borderColor: markerColors.solid,
                      backgroundColor: isSelected ? markerColors.soft : '#FFFFFF',
                    },
                  ]}>
                  <View
                    style={[
                      styles.markerCenter,
                      isSelected ? styles.markerCenterSelected : styles.markerCenterDefault,
                      { backgroundColor: markerColors.solid },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.markerStem,
                    isSelected ? styles.markerStemSelected : styles.markerStemDefault,
                    { backgroundColor: markerColors.solid },
                  ]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <MapQuickActions
        bottom={quickActionsBottom}
        favoriteCount={favoriteCount}
        userSpotCount={userSpots.length}
        onPressFavorites={() => router.push('/my-favorites')}
        onPressMySpots={() => router.push('/my-spots')}
      />

      <Animated.View
        style={[
          styles.sheet,
          {
            height: expandedSheetHeight,
            paddingBottom: insets.bottom + 18,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}>
        <View style={styles.sheetHandleArea} {...sheetPanResponder.panHandlers}>
          <View style={styles.sheetHandle} />
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}>
          {selectedSpot ? (
            <SpotDetailSheet
              selectedSpot={selectedSpot}
              selectedSpotPhotoUris={selectedSpotPhotoUris}
              selectedSpotDisplayAddress={selectedSpotDisplayAddress}
              isFavorite={isFavorite(selectedSpot.id)}
              onToggleFavorite={() => toggleFavorite(selectedSpot.id)}
              onClearSelected={clearSelectedSpot}
              onSubmitForReview={handleSubmitForReview}
              onEditSpot={handleEditSpot}
              onDeleteSpot={handleDeleteSpot}
              onOpenNavigation={handleOpenNavigation}
              onShareSpotInfo={handleShareSpotInfo}
              onPickSpotPhoto={handlePickSpotPhoto}
              onRemoveSpotPhoto={handleRemoveSpotPhoto}
            />
          ) : (
            <MapEmptySheet
              totalSpots={totalSpots}
              favoriteCount={favoriteCount}
              onPressFavorites={() => router.push('/my-favorites')}
              onPressExplore={() => router.navigate('/(tabs)/explore')}
            />
          )}
        </ScrollView>
      </Animated.View>

      <SpotFormModal
        visible={isCreateModalVisible}
        modalMode={modalMode}
        formValues={formValues}
        pendingFormattedAddress={pendingFormattedAddress}
        isResolvingPendingAddress={isResolvingPendingAddress}
        shouldUseReadonlyDistrict={shouldUseReadonlyDistrict}
        formError={formError}
        pendingCoords={pendingCoords}
        onClose={closeCreateModal}
        onSubmit={handleSubmitSpot}
        onUpdateField={updateFormValue}
        onToggleTag={toggleTag}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  map: {
    flex: 1,
  },
  quickActions: {
    position: 'absolute',
    right: 16,
    gap: 10,
  },
  quickActionButton: {
    width: 46,
    height: 46,
    borderRadius: theme.radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.floating,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  quickActionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerPin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    borderWidth: 2,
  },
  markerPinDefault: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
  },
  markerPinSelected: {
    width: 28,
    height: 28,
    borderWidth: 3,
    shadowColor: '#0F172A',
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  markerCenter: {
    borderRadius: theme.radii.pill,
  },
  markerCenterDefault: {
    width: 8,
    height: 8,
  },
  markerCenterSelected: {
    width: 12,
    height: 12,
  },
  markerStem: {
    width: 3,
    borderRadius: theme.radii.pill,
    marginTop: -1,
  },
  markerStemDefault: {
    height: 10,
  },
  markerStemSelected: {
    height: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...theme.shadows.card,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statAction: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.cardBackground,
    ...theme.shadows.floating,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 12,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  emptyCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyDescription: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  card: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  spotTitle: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 12,
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  userBadge: {
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primary,
  },
  systemBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textSecondary,
  },
  pendingBadge: {
    backgroundColor: '#FFEDD5',
    color: theme.colors.warning,
  },
  localBadge: {
    backgroundColor: '#DCFCE7',
    color: theme.colors.success,
  },
  metaText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  spotMetaText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  addressBlock: {
    marginTop: 12,
    gap: 6,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 14,
  },
  tagChip: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  photoSection: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  photoAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoAddButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  photoSectionHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  photoRow: {
    gap: 12,
    paddingTop: 12,
    paddingBottom: 2,
  },
  photoPlaceholderCard: {
    width: 152,
    height: 110,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  photoEmptyCard: {
    marginTop: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  photoEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  userPhotoCard: {
    width: 152,
    height: 110,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  userPhotoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: theme.colors.textSecondary,
  },
  photoPlaceholderText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: theme.colors.textTertiary,
  },
  cardDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  detailMetaLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  votes: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  spotActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 12,
  },
  spotActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  spotActionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 16,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryActionButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dangerButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 19, 36, 0.35)',
  },
  modalCard: {
    maxHeight: '78%',
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + theme.spacing.xs,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  modalHelperText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textTertiary,
  },
  modalForm: {
    marginTop: theme.spacing.md,
  },
  modalFormContent: {
    gap: theme.spacing.sm,
    paddingBottom: 8,
  },
  formattedAddressSection: {
    gap: 8,
  },
  formattedAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  formattedAddressBox: {
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.pageBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formattedAddressText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  formattedAddressHintText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textTertiary,
  },
  optionSection: {
    gap: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm - 2,
  },
  optionChip: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary,
  },
  optionChipInactive: {
    backgroundColor: theme.colors.chipBackground,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  optionChipTextInactive: {
    color: theme.colors.textPrimary,
  },
  input: {
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.pageBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  coordsText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  formErrorText: {
    fontSize: 13,
    color: theme.colors.danger,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.chipBackground,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

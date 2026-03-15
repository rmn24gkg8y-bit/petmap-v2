import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapQuickActions } from '@/components/map/MapQuickActions';
import { SpotFormModal } from '@/components/map/SpotFormModal';
import { getSpotIdentityBadge } from '@/constants/spotIdentity';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { SpotType } from '@/types/spot';
import { getDistanceMeters } from '@/utils/distance';

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

type SheetStage = 'collapsed' | 'half' | 'full';
const COLLAPSED_VISIBLE_HEIGHT = 190;

const COLLAPSED_TYPE_LABELS: Record<SpotType, string> = {
  park: '公园',
  cafe: '咖啡厅',
  hospital: '宠物医院',
  store: '宠物店',
  indoor: '室内友好',
  other: '其他',
};

function formatCollapsedDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

export default function TabOneScreen() {
  const params = useLocalSearchParams<{ returnTo?: string; returnStatus?: string }>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const [activeReturnContext, setActiveReturnContext] = useState<{
    returnTo: 'my-spots' | 'my-favorites';
    returnStatus?: string;
  } | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingFormattedAddress, setPendingFormattedAddress] = useState('');
  const [isResolvingPendingAddress, setIsResolvingPendingAddress] = useState(false);
  const [formError, setFormError] = useState('');
  const [sheetStage, setSheetStage] = useState<SheetStage>('collapsed');
  const [sheetVisibleHeight, setSheetVisibleHeight] = useState(0);
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
    favoriteCount,
    spots,
    selectedSpot,
    userLoc,
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

  const inFlightAddressSpotIdsRef = useRef<Set<string>>(new Set());
  const amapWebKey = process.env.EXPO_PUBLIC_AMAP_WEB_KEY?.trim() ?? '';
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnStatusParam = Array.isArray(params.returnStatus) ? params.returnStatus[0] : params.returnStatus;
  const returnContext =
    activeReturnContext?.returnTo === 'my-spots'
      ? {
          label: '返回我的地点',
          onPress: () =>
            router.push({
              pathname: '/my-spots',
              params: activeReturnContext.returnStatus
                ? { status: activeReturnContext.returnStatus }
                : undefined,
            }),
        }
        : activeReturnContext?.returnTo === 'my-favorites'
          ? {
              label: '返回我的收藏',
              onPress: () => router.push('/my-favorites'),
            }
          : null;
  const fullTopInset = insets.top + (returnContext ? 132 : 108);
  const collapsedSheetHeight = COLLAPSED_VISIBLE_HEIGHT;
  const availableSheetHeight = Math.max(windowHeight - fullTopInset, collapsedSheetHeight + 72);
  const minHalfSheetHeight = Math.min(collapsedSheetHeight + 88, availableSheetHeight - 36);
  const maxHalfSheetHeight = Math.max(minHalfSheetHeight, availableSheetHeight - 84);
  const halfSheetHeight = Math.min(
    Math.max(availableSheetHeight * 0.58, minHalfSheetHeight),
    maxHalfSheetHeight
  );
  const fullSheetHeight = availableSheetHeight;
  const fullOffset = 0;
  const halfOffset = Math.max(fullSheetHeight - halfSheetHeight, 0);
  const collapsedOffset = Math.max(fullSheetHeight - collapsedSheetHeight, 0);
  const sheetContainerBottomInset = 0;
  const sheetBottomOverlap = Math.max(20, Math.min(tabBarHeight - insets.bottom, 28));
  const quickActionsBottom = Math.max(sheetVisibleHeight + 16, insets.bottom + 120);
  const sheetTranslateY = useRef(new Animated.Value(collapsedOffset)).current;
  const dragStartRef = useRef(collapsedOffset);
  const dragStageRef = useRef<SheetStage>('collapsed');
  const sheetOffsetRef = useRef(collapsedOffset);
  const sheetVisibleHeightRef = useRef(0);

  useEffect(() => {
    if (returnToParam !== 'my-spots' && returnToParam !== 'my-favorites') {
      return;
    }

    setActiveReturnContext({
      returnTo: returnToParam,
      returnStatus: returnToParam === 'my-spots' ? returnStatusParam : undefined,
    });
    router.replace('/(tabs)');
  }, [returnStatusParam, returnToParam]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setActiveReturnContext(null);
      };
    }, [])
  );

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
      const nextVisibleHeight = selectedSpot ? Math.max(fullSheetHeight - value - sheetBottomOverlap, 0) : 0;
      sheetVisibleHeightRef.current = nextVisibleHeight;
      setSheetVisibleHeight(nextVisibleHeight);
    });

    return () => {
      sheetTranslateY.removeListener(listenerId);
    };
  }, [fullSheetHeight, selectedSpot, sheetBottomOverlap, sheetTranslateY]);

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

  function getOffsetForStage(stage: SheetStage) {
    if (stage === 'full') {
      return fullOffset;
    }

    if (stage === 'half') {
      return halfOffset;
    }

    return collapsedOffset;
  }

  function animateSheetToStage(stage: SheetStage) {
    Animated.spring(sheetTranslateY, {
      toValue: getOffsetForStage(stage),
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start(({ finished }) => {
      if (finished && selectedSpot) {
        recenterSelectedSpot(250);
      }
    });
  }

  function getDragBoundsForStage(stage: SheetStage) {
    if (stage === 'collapsed') {
      return {
        minOffset: halfOffset,
        maxOffset: collapsedOffset,
      };
    }

    if (stage === 'full') {
      return {
        minOffset: fullOffset,
        maxOffset: halfOffset,
      };
    }

    return {
      minOffset: fullOffset,
      maxOffset: collapsedOffset,
    };
  }

  function getNextStageAfterDrag(
    stage: SheetStage,
    offset: number,
    dragDistance: number,
    velocityY: number
  ): SheetStage {
    const upperMidpoint = (fullOffset + halfOffset) / 2;
    const lowerMidpoint = (halfOffset + collapsedOffset) / 2;
    const isStrongUpward = velocityY < -0.55 || dragDistance < -28;
    const isStrongDownward = velocityY > 0.55 || dragDistance > 28;

    if (stage === 'collapsed') {
      return isStrongUpward || offset <= lowerMidpoint ? 'half' : 'collapsed';
    }

    if (stage === 'full') {
      return isStrongDownward || offset >= upperMidpoint ? 'half' : 'full';
    }

    if (isStrongUpward) {
      return 'full';
    }

    if (isStrongDownward) {
      return 'collapsed';
    }

    if (dragDistance < 0) {
      return offset <= upperMidpoint ? 'full' : 'half';
    }

    if (dragDistance > 0) {
      return offset >= lowerMidpoint ? 'collapsed' : 'half';
    }

    const distanceToHalf = Math.abs(offset - halfOffset);
    const distanceToFull = Math.abs(offset - fullOffset);
    const distanceToCollapsed = Math.abs(offset - collapsedOffset);

    if (distanceToHalf <= distanceToFull && distanceToHalf <= distanceToCollapsed) {
      return 'half';
    }

    return offset < halfOffset ? 'full' : 'collapsed';
  }

  useEffect(() => {
    if (!selectedSpot) {
      setSheetStage('collapsed');
      sheetTranslateY.setValue(collapsedOffset);
      sheetVisibleHeightRef.current = 0;
      setSheetVisibleHeight(0);
      return;
    }

    setSheetStage('collapsed');
    sheetTranslateY.setValue(collapsedOffset);
    sheetOffsetRef.current = collapsedOffset;
    const nextCollapsedVisibleHeight = Math.max(collapsedSheetHeight - sheetBottomOverlap, 0);
    sheetVisibleHeightRef.current = nextCollapsedVisibleHeight;
    setSheetVisibleHeight(nextCollapsedVisibleHeight);
    recenterSelectedSpot(250);
  }, [collapsedOffset, collapsedSheetHeight, selectedSpot, sheetBottomOverlap, sheetTranslateY]);

  useEffect(() => {
    if (!selectedSpot) {
      sheetVisibleHeightRef.current = 0;
      setSheetVisibleHeight(0);
      return;
    }

    const nextHeight = Math.max(fullSheetHeight - getOffsetForStage(sheetStage) - sheetBottomOverlap, 0);
    sheetVisibleHeightRef.current = nextHeight;
    setSheetVisibleHeight(nextHeight);
  }, [fullSheetHeight, selectedSpot, sheetBottomOverlap, sheetStage]);

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
          dragStageRef.current = sheetStage;
          sheetTranslateY.stopAnimation((value) => {
            dragStartRef.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextValue = dragStartRef.current + gestureState.dy;
          const { minOffset, maxOffset } = getDragBoundsForStage(dragStageRef.current);
          const clampedValue = Math.min(Math.max(nextValue, minOffset), maxOffset);

          sheetTranslateY.setValue(clampedValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!selectedSpot) {
            return;
          }

          const nextStage = getNextStageAfterDrag(
            dragStageRef.current,
            sheetOffsetRef.current,
            gestureState.dy,
            gestureState.vy
          );
          setSheetStage(nextStage);
          animateSheetToStage(nextStage);
        },
        onPanResponderTerminate: () => {
          if (!selectedSpot) {
            return;
          }

          animateSheetToStage(sheetStage);
        },
      }),
    [collapsedOffset, halfOffset, selectedSpot, sheetStage, sheetTranslateY]
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
  const collapsedPreviewUri = selectedSpotPhotoUris[0];
  const collapsedTypeLabel = selectedSpot ? COLLAPSED_TYPE_LABELS[selectedSpot.spotType] : '';
  const collapsedSourceLabel = selectedSpot ? getSpotIdentityBadge(selectedSpot).label : '';
  const collapsedDistanceText =
    selectedSpot && userLoc
      ? formatCollapsedDistance(
          getDistanceMeters(userLoc, {
            lat: selectedSpot.lat,
            lng: selectedSpot.lng,
          })
        )
      : '9.5km';
  const collapsedDistrict = selectedSpot?.district.trim() || '未知区域';
  const collapsedAddressDetail = selectedSpot
    ? selectedSpot.formattedAddress?.trim() ||
      selectedSpot.addressHint.trim() ||
      selectedSpotDisplayAddress.replace(`${collapsedDistrict} · `, '').trim() ||
      '地址待补充'
    : '地址待补充';
  const collapsedTags = selectedSpot ? selectedSpot.tags.slice(0, 4) : [];

  return (
    <View style={styles.container}>
      {returnContext ? (
        <View style={styles.returnEntryWrap}>
          <Pressable
            onPress={() => {
              setActiveReturnContext(null);
              returnContext.onPress();
            }}
            style={({ pressed }) => [styles.returnEntry, pressed ? styles.returnEntryPressed : null]}>
            <Text style={styles.returnEntryLabel}>{returnContext.label}</Text>
            <Text style={styles.returnEntryAction}>返回</Text>
          </Pressable>
        </View>
      ) : null}

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

      {selectedSpot ? (
        <Animated.View
          style={[
            styles.sheet,
            {
              height: fullSheetHeight,
              bottom: -sheetBottomOverlap,
              paddingBottom: sheetContainerBottomInset,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}>
          <View style={styles.sheetHandleArea} {...sheetPanResponder.panHandlers}>
            <View style={styles.sheetHandle}>
              <View style={styles.sheetHandleInner} />
            </View>
          </View>

          {sheetStage === 'collapsed' ? (
            <Pressable
              onPress={() => {
                setSheetStage('half');
                animateSheetToStage('half');
              }}
              style={({ pressed }) => [
                styles.collapsedSummaryBlock,
                pressed ? styles.collapsedSummaryBlockPressed : null,
              ]}>
              <View style={styles.collapsedTopMetaRow}>
                <View style={styles.collapsedTypeBadge}>
                  <Text style={styles.collapsedTypeBadgeText} numberOfLines={1}>
                    {collapsedTypeLabel}
                  </Text>
                </View>
                <View style={styles.collapsedSourceInfo}>
                  <View style={styles.collapsedSourceIcon}>
                    <View style={styles.collapsedSourceIconDot} />
                  </View>
                  <Text style={styles.collapsedSourceInfoText}>{collapsedSourceLabel}</Text>
                </View>
              </View>

              <View style={styles.collapsedSummaryRow}>
                <View style={styles.collapsedSummaryLeft}>
                  <View style={styles.collapsedTitleRow}>
                    <View style={styles.collapsedTitleWrap}>
                      <Text style={styles.collapsedTitle} numberOfLines={1}>
                        {selectedSpot.name}
                      </Text>
                    </View>
                    <Text style={styles.collapsedDistance}>{collapsedDistanceText}</Text>
                  </View>

                  <View style={styles.collapsedAddressRow}>
                    <Text style={styles.collapsedDistrict} numberOfLines={1}>
                      {collapsedDistrict}
                    </Text>
                    <Text style={styles.collapsedAddressDot}>·</Text>
                    <Text style={styles.collapsedAddress} numberOfLines={1}>
                      {collapsedAddressDetail}
                    </Text>
                  </View>

                  <View style={styles.collapsedTagsRow}>
                    {collapsedTags.length > 0 ? (
                      collapsedTags.map((tag) => (
                        <View key={`${selectedSpot.id}-${tag}`} style={styles.collapsedTag}>
                          <Text style={styles.collapsedTagText} numberOfLines={1}>
                            {tag}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.collapsedTag}>
                        <Text style={styles.collapsedTagText}>安静</Text>
                      </View>
                    )}
                  </View>
                </View>

                {collapsedPreviewUri ? (
                  <Image source={{ uri: collapsedPreviewUri }} style={styles.collapsedPreviewImage} />
                ) : (
                  <View style={styles.collapsedPreviewPlaceholder}>
                    <Text style={styles.collapsedPreviewPlaceholderText}>小狗摄影在路上</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ) : (
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={[
                styles.sheetContent,
                sheetStage === 'full' ? styles.fullSheetContent : null,
              ]}
              showsVerticalScrollIndicator={false}>
              <View style={styles.stageSkeletonCard}>
                <Text style={styles.stageSkeletonEyebrow}>
                  {sheetStage === 'half' ? '继续上滑可展开更多' : '完整详情区域（建设中）'}
                </Text>
                <Text style={styles.stageSkeletonTitle} numberOfLines={1}>
                  {selectedSpot.name}
                </Text>
                <Text style={styles.stageSkeletonText} numberOfLines={2}>
                  {selectedSpotDisplayAddress}
                </Text>
                <View style={styles.stageSkeletonBlockLarge} />
                <View style={styles.stageSkeletonBlockRow}>
                  <View style={styles.stageSkeletonBlockSmall} />
                  <View style={styles.stageSkeletonBlockSmall} />
                </View>
                <Text style={styles.stageSkeletonHint}>
                  {sheetStage === 'half'
                    ? '拖拽继续上滑进入 Full，下滑返回 Collapsed。'
                    : '拖拽下滑可回到 Half，再下滑回到 Collapsed。'}
                </Text>
              </View>
              <View style={[styles.sheetFooterSpacer, { height: tabBarHeight + insets.bottom + 24 }]} />
            </ScrollView>
          )}
        </Animated.View>
      ) : null}

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
  returnEntryWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: theme.colors.pageBackground,
  },
  returnEntry: {
    minHeight: 40,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  returnEntryPressed: {
    opacity: 0.86,
  },
  returnEntryLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  returnEntryAction: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
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
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFEFF',
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  sheetHandle: {
    width: 33,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#F5E8DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandleInner: {
    width: 19,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D9B79E',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  fullSheetContent: {
    paddingBottom: 24,
  },
  sheetFooterSpacer: {
    width: '100%',
  },
  collapsedSummaryBlock: {
    width: 343,
    marginHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 6,
    alignItems: 'flex-start',
  },
  collapsedSummaryBlockPressed: {
    opacity: 0.88,
  },
  collapsedTopMetaRow: {
    width: 343,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedTypeBadge: {
    height: 20,
    borderRadius: 20,
    backgroundColor: '#633817',
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  collapsedTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
  },
  collapsedSourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  collapsedSourceIcon: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ED8422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedSourceIconDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#ED8422',
  },
  collapsedSourceInfoText: {
    color: '#ED8422',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  collapsedSummaryRow: {
    width: 343,
    height: 68,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  collapsedSummaryLeft: {
    width: 230,
    height: 65,
    flexDirection: 'column',
    gap: 2,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  collapsedTitleRow: {
    width: 230,
    height: 28,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  collapsedTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  collapsedTitle: {
    color: '#404040',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  collapsedDistance: {
    flexShrink: 0,
    minWidth: 54,
    textAlign: 'right',
    color: '#404040',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
  },
  collapsedAddressRow: {
    width: 230,
    height: 14,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  collapsedDistrict: {
    flexShrink: 0,
    color: '#424242',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
  },
  collapsedAddressDot: {
    flexShrink: 0,
    color: '#7A7A7A',
    fontSize: 10,
    lineHeight: 12,
  },
  collapsedAddress: {
    flex: 1,
    color: '#424242',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
  },
  collapsedTagsRow: {
    width: 230,
    height: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  collapsedTag: {
    minWidth: 33,
    height: 13,
    borderRadius: 999,
    backgroundColor: '#ED8422',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 12,
  },
  collapsedPreviewImage: {
    width: 103,
    height: 68,
    borderRadius: 0,
    backgroundColor: '#D9D9D9',
  },
  collapsedPreviewPlaceholder: {
    width: 103,
    height: 68,
    borderRadius: 0,
    backgroundColor: 'rgba(217,217,217,1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  collapsedPreviewPlaceholderText: {
    color: '#404040',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  stageSkeletonCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9E6',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
  },
  stageSkeletonEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C8C8C',
  },
  stageSkeletonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#404040',
  },
  stageSkeletonText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#616161',
  },
  stageSkeletonBlockLarge: {
    width: '100%',
    height: 88,
    borderRadius: 12,
    backgroundColor: '#F1F1F1',
  },
  stageSkeletonBlockRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stageSkeletonBlockSmall: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
  },
  stageSkeletonHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7A7A7A',
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

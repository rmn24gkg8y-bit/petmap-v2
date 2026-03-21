import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
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
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FavouriteDefaultIcon from '@/assets/icons/favourite-default.svg';
import FavouritePressedIcon from '@/assets/icons/favourite-pressed.svg';
import BoneBurstIcon from '@/assets/icons/bone-burst.svg';
import HeatIcon from '@/assets/icons/heat-icon.svg';
import NavigationDefaultIcon from '@/assets/icons/navigation-default.svg';
import ShareDefaultIcon from '@/assets/icons/share-default.svg';
import SheetHandleIcon from '@/assets/icons/sheet-handle.svg';
import StarBurstIcon from '@/assets/icons/star-burst.svg';
import CoffeeDefaultMarker from '@/assets/markers/coffee-default.svg';
import CoffeeSelectedMarker from '@/assets/markers/coffee-selected.svg';
import CoffeeSmallMarker from '@/assets/markers/coffee-small.svg';
import MallDefaultMarker from '@/assets/markers/mall-default.svg';
import MallSelectedMarker from '@/assets/markers/mall-selected.svg';
import MallSmallMarker from '@/assets/markers/mall-small.svg';
import ParkDefaultMarker from '@/assets/markers/park-default.svg';
import ParkSelectedMarker from '@/assets/markers/park-selected.svg';
import ParkSmallMarker from '@/assets/markers/park-small.svg';
import PetshopDefaultMarker from '@/assets/markers/petshop-default.svg';
import PetshopSelectedMarker from '@/assets/markers/petshop-selected.svg';
import PetshopSmallMarker from '@/assets/markers/petshop-small.svg';
import UserDefaultMarker from '@/assets/markers/user-default.svg';
import UserSelectedMarker from '@/assets/markers/user-selected.svg';
import UserSmallMarker from '@/assets/markers/user-small.svg';
import VetDefaultMarker from '@/assets/markers/vet-default.svg';
import VetSelectedMarker from '@/assets/markers/vet-selected.svg';
import VetSmallMarker from '@/assets/markers/vet-small.svg';
import { MapQuickActions } from '@/components/map/MapQuickActions';
import { SpotFormModal } from '@/components/map/SpotFormModal';
import { ACTIVITY_COLLECTIONS, type ActivityCollection } from '@/constants/activityCollections';
import { ADMIN_MODE_ENABLED } from '@/constants/adminConfig';
import { normalizeSpotTags } from '@/constants/spotFormOptions';
import { theme } from '@/constants/theme';
import {
  deleteSystemSpotViaAdminEndpoint,
  publishSpotViaAdminEndpoint,
  updateSystemSpotPhotosViaAdminEndpoint,
  updateSystemSpotInSupabase,
} from '@/repo/cloudSpotsRepo';
import { usePetMapStore } from '@/store/petmap-store';
import type { Spot, SpotType } from '@/types/spot';
import { getDistanceMeters } from '@/utils/distance';
import { loadHasSeenMapGuide, saveHasSeenMapGuide } from '@/repo/storageRepo';

const INITIAL_REGION: Region = {
  latitude: 31.2215,
  longitude: 121.4389,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Two-tier zoom system (derived from longitudeDelta via log2(360/longitudeDelta))
// Tier 1 (near):  zoom >= ZOOM_NEAR → markers at full size (scale = 1.0)
// Transition:     ZOOM_FAR < zoom < ZOOM_NEAR → linear interpolation
// Tier 2 (far):   zoom <= ZOOM_FAR → markers at minimum size (scale = MARKER_SCALE_MIN)
//
// 插值区间故意设窄（3 zoom 级），使每帧 zoom 变化对应的 scale 变化量足够小，
// 视觉上连续，tracksViewChanges 重捕延迟不易被察觉。
const ZOOM_NEAR        = 14.5;  // >= this → full-size markers
const ZOOM_FAR         = 11.5;  // <= this → minimum-size markers
const MARKER_SCALE_MIN = 0.72;  // minimum marker scale (narrow range → smooth transition)

// Fixed zoom target when the user taps a marker from a far-away view.
// Must be clearly in Tier 2 (< ZOOM_NEAR) so we never enter full-size mode.
// At zoom 13.8, markers render at ~92% — readable without being full close-up.
const MARKER_FOCUS_ZOOM  = 13.8;
const MARKER_FOCUS_DELTA = 360 / Math.pow(2, MARKER_FOCUS_ZOOM); // ≈ 0.0252

const MARKER_DEFAULT_SVG_SIZE  = 50; // default SVG intrinsic width/height
const MARKER_SELECTED_SVG_SIZE = 60; // selected SVG intrinsic width/height
const MAX_SYSTEM_SPOT_PHOTOS = 6;

function getZoomFromRegion(region: Region): number {
  return Math.log2(360 / region.longitudeDelta);
}

function getMarkerBaseScale(zoom: number): number {
  if (zoom >= ZOOM_NEAR) return 1.0;
  if (zoom <= ZOOM_FAR)  return MARKER_SCALE_MIN;
  const t = (zoom - ZOOM_FAR) / (ZOOM_NEAR - ZOOM_FAR);
  return MARKER_SCALE_MIN + t * (1.0 - MARKER_SCALE_MIN);
}

type MarkerVisualCategory = 'coffee' | 'mall' | 'park' | 'petshop' | 'user' | 'vet';
const MARKER_FILTER_OPTIONS: Array<{ key: MarkerVisualCategory; label: string }> = [
  { key: 'coffee', label: '咖啡店' },
  { key: 'mall', label: '商场' },
  { key: 'park', label: '户外 / 公园' },
  { key: 'petshop', label: '宠物店' },
  { key: 'user', label: '用户自选 / 用户提交' },
  { key: 'vet', label: '宠物医院' },
];
const ALL_MARKER_FILTER_KEYS = MARKER_FILTER_OPTIONS.map((item) => item.key);

// ── Crossfade thresholds ────────────────────────────────────────────────────
// ZOOM_DEFAULT_A: zoom level when the app first opens, derived from INITIAL_REGION.
// Non-selected markers use the large SVG at or above this zoom.
// Below ZOOM_DEFAULT_A a short 0.5-zoom-level band crossfades to the small visual.
const ZOOM_DEFAULT_A    = Math.log2(360 / INITIAL_REGION.longitudeDelta); // ≈ 12.14
const ZOOM_LARGE_MARKER = ZOOM_DEFAULT_A;          // >= this → large SVG only
const ZOOM_SMALL_FULL   = ZOOM_DEFAULT_A - 0.12;  // <= this → small visual only
// Transition band: ZOOM_SMALL_FULL < zoom < ZOOM_LARGE_MARKER (≈ 0.12 zoom levels — very narrow)

// ── Density tiers ───────────────────────────────────────────────────────────
// Non-selected marker count limit, anchored to the default zoom level.
const DENSITY_MED_COUNT = 20;
const DENSITY_LOW_COUNT = 8;
const DENSITY_MIN_COUNT = 3;

function getMaxNonSelectedMarkerCount(zoom: number): number {
  if (zoom >= ZOOM_DEFAULT_A)           return Infinity;           // default view: show all
  if (zoom >= ZOOM_DEFAULT_A - 1.5)     return DENSITY_MED_COUNT; // slightly further: 20
  if (zoom >= ZOOM_DEFAULT_A - 3.0)     return DENSITY_LOW_COUNT; // far: 8
  return DENSITY_MIN_COUNT;                                        // very far: 3
}

type SheetStage = 'collapsed' | 'half' | 'full';
const COLLAPSED_VISIBLE_HEIGHT = 190;
const HALF_VISIBLE_HEIGHT = 523;
const SHEET_HANDLE_AREA_HEIGHT = 20;

const COLLAPSED_TYPE_LABELS: Record<SpotType, string> = {
  park: '公园',
  cafe: '咖啡厅',
  hospital: '宠物医院',
  store: '宠物店',
  indoor: '室内友好',
  other: '其他',
};

const TYPE_BADGE_COLORS: Record<SpotType, { background: string; text: string }> = {
  cafe: { background: '#8C6239', text: '#FFFFFF' },
  indoor: { background: '#B02E2A', text: '#FFFFFF' },
  store: { background: '#0071BC', text: '#FFFFFF' },
  hospital: { background: '#E6E6E6', text: '#303030' },
  park: { background: '#55A462', text: '#FFFFFF' },
  other: { background: '#8C6239', text: '#FFFFFF' },
};

function BackArrowIcon({ color = '#3D3D3D' }: { color?: string }) {
  return (
    <Svg width={8} height={16} viewBox="0 0 11 19" fill="none">
      <Path
        d="M9.5 17.5L1.5 9.5L9.5 1.5"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FavoriteSuccessBurst({ progress }: { progress: Animated.Value }) {
  const burstOpacity = progress.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 0.35, 0],
  });
  const burstScale = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.8, 1.08, 0.9],
  });
  const bonePrimaryTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 11],
  });
  const bonePrimaryTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const boneTopLeftTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const boneTopLeftTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -11],
  });
  const boneBottomTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 9],
  });
  const boneBottomTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 9],
  });
  const starLeftTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const starLeftTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const starBottomTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });
  const starBottomTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <View pointerEvents="none" style={styles.favoriteBurstLayer}>
      <Animated.View
        style={[
          styles.favoriteBurstPiece,
          styles.favoriteBurstBonePrimary,
          {
            opacity: burstOpacity,
            transform: [
              { translateX: bonePrimaryTranslateX },
              { translateY: bonePrimaryTranslateY },
              { rotate: '22deg' },
              { scale: burstScale },
            ],
          },
        ]}>
        <BoneBurstIcon width={8} height={16} />
      </Animated.View>
      <Animated.View
        style={[
          styles.favoriteBurstPiece,
          styles.favoriteBurstBoneTopLeft,
          {
            opacity: burstOpacity,
            transform: [
              { translateX: boneTopLeftTranslateX },
              { translateY: boneTopLeftTranslateY },
              { rotate: '-26deg' },
              { scale: burstScale },
              { scale: 0.85 },
            ],
          },
        ]}>
        <BoneBurstIcon width={7} height={13} />
      </Animated.View>
      <Animated.View
        style={[
          styles.favoriteBurstPiece,
          styles.favoriteBurstBoneBottom,
          {
            opacity: burstOpacity,
            transform: [
              { translateX: boneBottomTranslateX },
              { translateY: boneBottomTranslateY },
              { rotate: '58deg' },
              { scale: burstScale },
              { scale: 0.72 },
            ],
          },
        ]}>
        <BoneBurstIcon width={6} height={11} />
      </Animated.View>
      <Animated.View
        style={[
          styles.favoriteBurstPiece,
          styles.favoriteBurstStarLeft,
          {
            opacity: burstOpacity,
            transform: [{ translateX: starLeftTranslateX }, { translateY: starLeftTranslateY }, { scale: burstScale }],
          },
        ]}>
        <StarBurstIcon width={9} height={9} />
      </Animated.View>
      <Animated.View
        style={[
          styles.favoriteBurstPiece,
          styles.favoriteBurstStarBottom,
          {
            opacity: burstOpacity,
            transform: [{ translateX: starBottomTranslateX }, { translateY: starBottomTranslateY }, { scale: burstScale }],
          },
        ]}>
        <StarBurstIcon width={7} height={7} />
      </Animated.View>
    </View>
  );
}

function formatCollapsedDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function stripLeadingDistrict(detail: string, district: string) {
  const normalizedDetail = detail.trim();
  const normalizedDistrict = district.trim();

  if (!normalizedDetail || !normalizedDistrict) {
    return normalizedDetail;
  }

  if (!normalizedDetail.startsWith(normalizedDistrict)) {
    return normalizedDetail;
  }

  const withoutDistrict = normalizedDetail.slice(normalizedDistrict.length).replace(/^[·,\s，]+/, '').trim();

  return withoutDistrict || normalizedDetail;
}

function getSpotDisplayAddressParts(spot: Pick<Spot, 'district' | 'addressHint' | 'formattedAddress'>) {
  const district = spot.district.trim() || '未知区域';
  const primaryAddress = spot.formattedAddress?.trim() || spot.addressHint.trim() || '地址待补充';
  const detail = stripLeadingDistrict(primaryAddress, district) || '地址待补充';

  return {
    district,
    detail,
    full: primaryAddress,
  };
}


function resolveMarkerVisualCategory(spot: Pick<Spot, 'source' | 'spotType'>): MarkerVisualCategory | null {
  if (spot.source === 'user') {
    return 'user';
  }

  if (spot.spotType === 'cafe') {
    return 'coffee';
  }

  if (spot.spotType === 'park') {
    return 'park';
  }

  if (spot.spotType === 'hospital') {
    return 'vet';
  }

  if (spot.spotType === 'store') {
    return 'petshop';
  }

  if (spot.spotType === 'indoor') {
    return 'mall';
  }

  return null;
}

function renderMarkerVisual(category: MarkerVisualCategory, selected: boolean) {
  if (category === 'coffee') {
    const MarkerComponent = selected ? CoffeeSelectedMarker : CoffeeDefaultMarker;
    return <MarkerComponent />;
  }

  if (category === 'mall') {
    const MarkerComponent = selected ? MallSelectedMarker : MallDefaultMarker;
    return <MarkerComponent />;
  }

  if (category === 'park') {
    const MarkerComponent = selected ? ParkSelectedMarker : ParkDefaultMarker;
    return <MarkerComponent />;
  }

  if (category === 'petshop') {
    const MarkerComponent = selected ? PetshopSelectedMarker : PetshopDefaultMarker;
    return <MarkerComponent />;
  }

  if (category === 'vet') {
    const MarkerComponent = selected ? VetSelectedMarker : VetDefaultMarker;
    return <MarkerComponent />;
  }

  const MarkerComponent = selected ? UserSelectedMarker : UserDefaultMarker;
  return <MarkerComponent />;
}

function renderSmallMarkerVisual(category: MarkerVisualCategory) {
  // 36px: clearly smaller than default (39×51) but large enough to read at far zoom
  const s = 36;
  if (category === 'coffee')  return <CoffeeSmallMarker  width={s} height={s} />;
  if (category === 'mall')    return <MallSmallMarker    width={s} height={s} />;
  if (category === 'park')    return <ParkSmallMarker    width={s} height={s} />;
  if (category === 'petshop') return <PetshopSmallMarker width={s} height={s} />;
  if (category === 'vet')     return <VetSmallMarker     width={s} height={s} />;
  return <UserSmallMarker width={s} height={s} />;
}

export default function TabOneScreen() {
  const params = useLocalSearchParams<{ returnTo?: string; returnStatus?: string; openToHalf?: string }>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [editingSpotSource, setEditingSpotSource] = useState<Spot['source'] | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingFormattedAddress, setPendingFormattedAddress] = useState('');
  const [isResolvingPendingAddress, setIsResolvingPendingAddress] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmittingSpot, setIsSubmittingSpot] = useState(false);
  const [isPhotoManagerVisible, setIsPhotoManagerVisible] = useState(false);
  const [isManagingSystemPhotos, setIsManagingSystemPhotos] = useState(false);
  const [sheetStage, setSheetStage] = useState<SheetStage>('collapsed');
  const [sheetVisibleHeight, setSheetVisibleHeight] = useState(0);
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);
  const [isFilterPanelMounted, setIsFilterPanelMounted] = useState(false);
  const [selectedMarkerFilters, setSelectedMarkerFilters] =
    useState<MarkerVisualCategory[]>(ALL_MARKER_FILTER_KEYS);
  const [currentRegion, setCurrentRegion] = useState<Region>(INITIAL_REGION);
  const [tracksMarkerChanges, setTracksMarkerChanges] = useState(false);
  const [deselectingSpotId, setDeselectingSpotId] = useState<string | null>(null);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const tracksMarkerChangesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    district: '',
    addressHint: '',
    description: '',
    petFriendlyLevel: '' as '' | 'high' | 'medium' | 'low',
    businessHours: '',
    contact: '',
    tags: [] as string[],
    spotType: 'other' as Spot['spotType'],
  });
  const [createCoverImage, setCreateCoverImage] = useState<{
    uri: string;
    base64Data: string;
    mimeType: string;
  } | null>(null);
  const {
    hasHydratedStorage,
    favoriteCount,
    spots,
    selectedSpot,
    userLoc,
    userSpots,
    addSpot,
    addSystemSpot,
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
  const markerScaleValuesRef = useRef<Record<string, Animated.Value>>({});
  const markerRotateValuesRef = useRef<Record<string, Animated.Value>>({});
  const recenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wobbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 0 = large SVG visual, 1 = small dot visual; drives crossfade for all non-selected markers
  const markerCrossfadeRef = useRef(new Animated.Value(0));
  // Deselect animation: 1 = selected visual fully visible, 0 = gone (fades to default)
  const deselectAnimRef = useRef(new Animated.Value(1));
  const previousSelectedSpotIdRef = useRef<string | null>(null);
  const sheetSyncedSpotIdRef = useRef<string | null>(null);
  const amapWebKey = process.env.EXPO_PUBLIC_AMAP_WEB_KEY?.trim() ?? '';
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const fullTopInset = insets.top + 108;
  const collapsedSheetHeight = COLLAPSED_VISIBLE_HEIGHT;
  const availableSheetHeight = Math.max(windowHeight - fullTopInset, collapsedSheetHeight + 72);
  const sheetBottomOverlap = Math.max(20, Math.min(tabBarHeight - insets.bottom, 28));
  const minHalfSheetHeight = Math.min(collapsedSheetHeight + 88, availableSheetHeight - 36);
  const maxHalfSheetHeight = Math.max(minHalfSheetHeight, availableSheetHeight - 36);
  const halfSheetHeight = Math.max(
    minHalfSheetHeight,
    Math.min(HALF_VISIBLE_HEIGHT + sheetBottomOverlap, maxHalfSheetHeight)
  );
  const fullSheetHeight = windowHeight + sheetBottomOverlap;
  const fullOffset = 0;
  const halfOffset = Math.max(fullSheetHeight - halfSheetHeight, 0);
  const collapsedOffset = Math.max(fullSheetHeight - collapsedSheetHeight, 0);
  const halfVisibleHeight = Math.max(fullSheetHeight - halfOffset - sheetBottomOverlap, 0);
  const halfScrollViewportHeight = Math.max(halfVisibleHeight - SHEET_HANDLE_AREA_HEIGHT, 220);
  const sheetContainerBottomInset = 0;
  const quickActionsBottom = Math.max(sheetVisibleHeight + 16, insets.bottom + 120);
  const sheetTranslateY = useRef(new Animated.Value(collapsedOffset)).current;
  const dragStartRef = useRef(collapsedOffset);
  const dragStageRef = useRef<SheetStage>('collapsed');
  const sheetOffsetRef = useRef(collapsedOffset);
  const sheetVisibleHeightRef = useRef(0);
  const favoriteButtonScale = useRef(new Animated.Value(1)).current;
  const favoriteBurstProgress = useRef(new Animated.Value(0)).current;
  const filterPanelAnim = useRef(new Animated.Value(0)).current;
  // 防止 Marker.onPress 触发后，MapView.onPress 紧接着将选中清掉
  const markerJustPressedRef = useRef(false);

  // Map Guide (Layer 3 onboarding)
  const [showMapGuide, setShowMapGuide] = useState(false);

  useEffect(() => {
    if (returnToParam !== 'my-spots' && returnToParam !== 'my-favorites') {
      return;
    }

    router.replace('/(tabs)');
  }, [returnToParam]);

  // Load Map Guide state
  useEffect(() => {
    loadHasSeenMapGuide().then((seen) => {
      if (!seen) setShowMapGuide(true);
    });
  }, []);

  async function handleDismissMapGuide() {
    await saveHasSeenMapGuide();
    setShowMapGuide(false);
  }

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

  function recenterSelectedSpot(duration = 350, shouldZoom = false) {
    if (!selectedSpot || !mapRef.current) {
      return;
    }

    if (recenterTimeoutRef.current) {
      clearTimeout(recenterTimeoutRef.current);
      recenterTimeoutRef.current = null;
    }

    const currentTierZoom = getZoomFromRegion(currentRegion);

    // Zoom in only if caller requests it AND we're farther than the fixed focus target.
    // Never zoom out — if already closer than MARKER_FOCUS_ZOOM, just recenter.
    const needsZoom = shouldZoom && currentTierZoom < MARKER_FOCUS_ZOOM;
    const targetDelta = needsZoom ? MARKER_FOCUS_DELTA : currentRegion.latitudeDelta;
    const targetLngDelta = needsZoom ? MARKER_FOCUS_DELTA : currentRegion.longitudeDelta;

    mapRef.current.animateToRegion(
      {
        latitude: selectedSpot.lat,
        longitude: selectedSpot.lng,
        latitudeDelta: targetDelta,
        longitudeDelta: targetLngDelta,
      },
      duration
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

  function animateSheetToStage(stage: SheetStage, fromStage?: SheetStage) {
    const toValue = getOffsetForStage(stage);
    const isExpanding = fromStage === 'collapsed' && stage === 'half';
    const isCollapsing = fromStage === 'half' && stage === 'collapsed';

    const onDone = ({ finished }: { finished: boolean }) => {
      if (finished && selectedSpot) recenterSelectedSpot(250);
    };

    if (isExpanding) {
      // 先冲过目标 26px（translateY 更小 = 更高），再 spring 回来
      Animated.sequence([
        Animated.timing(sheetTranslateY, {
          toValue: toValue - 26,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue,
          useNativeDriver: true,
          bounciness: 8,
          speed: 11,
        }),
      ]).start(onDone);
      return;
    }

    if (isCollapsing) {
      // 先冲过目标 16px（translateY 更大 = 更低），再 spring 回来
      Animated.sequence([
        Animated.timing(sheetTranslateY, {
          toValue: toValue + 16,
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
      ]).start(onDone);
      return;
    }

    Animated.spring(sheetTranslateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 17,
    }).start(onDone);
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
    const selectedSpotId = selectedSpot?.id ?? null;

    if (!selectedSpotId) {
      sheetSyncedSpotIdRef.current = null;
      setSheetStage('collapsed');
      sheetTranslateY.setValue(collapsedOffset);
      sheetVisibleHeightRef.current = 0;
      setSheetVisibleHeight(0);
      return;
    }

    if (sheetSyncedSpotIdRef.current === selectedSpotId) {
      // Late-arrival: openToHalf param arrived after selectedSpot was already synced.
      // This happens when the Zustand store update propagates before the navigation params.
      if (params.openToHalf === '1') {
        router.setParams({ openToHalf: undefined });
        setSheetStage('half');
        animateSheetToStage('half', 'collapsed');
      }
      return;
    }

    sheetSyncedSpotIdRef.current = selectedSpotId;
    const expandToHalf = params.openToHalf === '1';
    if (expandToHalf) {
      // Consume the flag immediately so subsequent map-internal marker taps stay at collapsed.
      router.setParams({ openToHalf: undefined });
      setSheetStage('half');
      sheetTranslateY.setValue(halfOffset);
      sheetOffsetRef.current = halfOffset;
      sheetVisibleHeightRef.current = halfVisibleHeight;
      setSheetVisibleHeight(halfVisibleHeight);
    } else {
      // Map-internal marker tap: collapsed peek.
      setSheetStage('collapsed');
      sheetTranslateY.setValue(collapsedOffset);
      sheetOffsetRef.current = collapsedOffset;
      const nextCollapsedVisibleHeight = Math.max(collapsedSheetHeight - sheetBottomOverlap, 0);
      sheetVisibleHeightRef.current = nextCollapsedVisibleHeight;
      setSheetVisibleHeight(nextCollapsedVisibleHeight);
    }
    recenterSelectedSpot(250, true); // zoom toward first-tier boundary on initial selection
  }, [collapsedOffset, collapsedSheetHeight, halfOffset, halfVisibleHeight, params.openToHalf, selectedSpot?.id, sheetBottomOverlap, sheetTranslateY]);

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

  // NOTE: recentering on sheetVisibleHeight change is handled by animateSheetToStage's
  // onDone callback. We intentionally do NOT call recenterSelectedSpot here to avoid
  // overriding the zoom-in animation started by the selectedSpot?.id effect above.

  useEffect(() => {
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
          animateSheetToStage(nextStage, dragStageRef.current);
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
    setEditingSpotSource(null);
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
      spotType: 'other',
    });
    setPendingFormattedAddress('');
    setIsResolvingPendingAddress(false);
    setFormError('');
    setCreateCoverImage(null);
    setIsCreateModalVisible(true);
  }

  function closeCreateModal() {
    setIsCreateModalVisible(false);
    setIsSubmittingSpot(false);
    setPendingCoords(null);
    setEditingSpotId(null);
    setEditingSpotSource(null);
    setModalMode('create');
    setPendingFormattedAddress('');
    setIsResolvingPendingAddress(false);
    setFormError('');
    setCreateCoverImage(null);
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

  async function handleSubmitSpot() {
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
      if (!editingSpotId || !selectedSpot) {
        return;
      }

      const updatedSpot = {
        ...selectedSpot,
        id: editingSpotId,
        name,
        district,
        addressHint,
        formattedAddress: formattedAddress || selectedSpot.formattedAddress,
        lat: selectedSpot.lat,
        lng: selectedSpot.lng,
        tags,
        description,
        spotType: formValues.spotType,
        petFriendlyLevel,
        businessHours,
        contact,
      };

      if (selectedSpot.source === 'system') {
        if (!ADMIN_MODE_ENABLED) {
          return;
        }

        setIsSubmittingSpot(true);
        try {
          const savedSpot = await updateSystemSpotInSupabase(updatedSpot);
          updateSpot(savedSpot);
          setSelectedSpot(savedSpot.id);
          closeCreateModal();
          Alert.alert('保存成功', '系统地点信息已更新');
        } catch (err) {
          setFormError(err instanceof Error ? err.message : '保存失败，请稍后重试');
        } finally {
          setIsSubmittingSpot(false);
        }
        return;
      }

      updateSpot(updatedSpot);
      setSelectedSpot(updatedSpot.id);
      Alert.alert('保存成功', '地点信息已更新');
      closeCreateModal();
    } else if (ADMIN_MODE_ENABLED) {
      // ── Admin mode: publish directly to spots via server-side Edge Function ──
      const draftSpot: Spot = {
        id: `draft-${Date.now()}`, // temporary; replaced by Supabase UUID on success
        name,
        source: 'system',
        spotType: formValues.spotType,
        district,
        addressHint,
        formattedAddress: formattedAddress || undefined,
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        tags,
        description,
        votes: 5,
        petFriendlyLevel,
        businessHours,
        contact,
        verified: true,
        merchantStatus: 'none',
      };

      setIsSubmittingSpot(true);
      try {
        const publishedSpot = await publishSpotViaAdminEndpoint(
          draftSpot,
          createCoverImage
            ? {
                base64Data: createCoverImage.base64Data,
                mimeType: createCoverImage.mimeType,
              }
            : undefined
        );
        addSystemSpot(publishedSpot);
        closeCreateModal();
        setSelectedSpot(publishedSpot.id);
        Alert.alert('发布成功', `「${name}」已发布到地图，立即可见`);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : '发布失败，请稍后重试');
      } finally {
        setIsSubmittingSpot(false);
      }
    } else {
      // ── Normal user mode: save locally ───────────────────────────────────────
      const newSpot: Spot = {
        id: `user-spot-${Date.now()}`,
        name,
        source: 'user',
        submissionStatus: 'local',
        spotType: 'other',
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
        photoUris: createCoverImage?.uri ? [createCoverImage.uri] : undefined,
      };

      addSpot(newSpot);
      setSelectedSpot(newSpot.id);
      Alert.alert('新增成功', '新地点已保存在本机');
      closeCreateModal();
    }
  }

  function handleEditSpot() {
    if (!selectedSpot) {
      return;
    }

    if (selectedSpot.source === 'system' && !ADMIN_MODE_ENABLED) {
      return;
    }

    setModalMode('edit');
    setEditingSpotId(selectedSpot.id);
    setEditingSpotSource(selectedSpot.source);
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
      spotType: selectedSpot.spotType ?? 'other',
    });
    setPendingFormattedAddress(selectedSpot.formattedAddress ?? '');
    setIsResolvingPendingAddress(false);
    setFormError('');
    setCreateCoverImage(null);
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

  function handleDeleteSystemSpot() {
    if (!selectedSpot || selectedSpot.source !== 'system' || !ADMIN_MODE_ENABLED) {
      return;
    }

    const spotId = selectedSpot.id;
    const spotName = selectedSpot.name;

    Alert.alert(
      '删除系统地点？',
      `删除后「${spotName}」会从前台地图中消失，且无法恢复。`,
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSystemSpotViaAdminEndpoint(spotId);
              removeSpot(spotId);
              Alert.alert('删除成功', `「${spotName}」已删除`);
            } catch (err) {
              Alert.alert(
                '删除失败',
                err instanceof Error ? err.message : '删除失败，请稍后重试'
              );
            }
          },
        },
      ]
    );
  }

  function openSystemPhotoManager() {
    if (!selectedSpot || selectedSpot.source !== 'system' || !ADMIN_MODE_ENABLED) {
      return;
    }

    setIsPhotoManagerVisible(true);
  }

  function closeSystemPhotoManager() {
    if (isManagingSystemPhotos) {
      return;
    }

    setIsPhotoManagerVisible(false);
  }

  async function pickSingleImageAsBase64() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('无法访问相册', '请先在系统设置中允许访问相册。');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const base64Data = asset?.base64?.trim() ?? '';

    if (!base64Data) {
      Alert.alert('上传失败', '未读取到图片数据，请重试。');
      return null;
    }

    return {
      uri: asset?.uri?.trim() || '',
      base64Data,
      mimeType: asset?.mimeType?.trim() || 'image/jpeg',
    };
  }

  async function handlePickCreateCoverPhoto() {
    const imagePayload = await pickSingleImageAsBase64();

    if (!imagePayload) {
      return;
    }

    if (!imagePayload.uri) {
      Alert.alert('上传失败', '未读取到图片预览地址，请重试。');
      return;
    }

    setCreateCoverImage(imagePayload);
  }

  function handleRemoveCreateCoverPhoto() {
    setCreateCoverImage(null);
  }

  async function handleAddSystemSpotPhoto() {
    if (!selectedSpot || selectedSpot.source !== 'system' || !ADMIN_MODE_ENABLED) {
      return;
    }

    if (selectedSpotPhotoUris.length >= MAX_SYSTEM_SPOT_PHOTOS) {
      Alert.alert('已达上限', `最多支持 ${MAX_SYSTEM_SPOT_PHOTOS} 张图片`);
      return;
    }

    const imagePayload = await pickSingleImageAsBase64();

    if (!imagePayload) {
      return;
    }

    setIsManagingSystemPhotos(true);
    try {
      const savedSpot = await updateSystemSpotPhotosViaAdminEndpoint({
        spotId: selectedSpot.id,
        action: 'add',
        base64Data: imagePayload.base64Data,
        mimeType: imagePayload.mimeType,
      });
      updateSpot(savedSpot);
      setSelectedSpot(savedSpot.id);
    } catch (err) {
      Alert.alert(
        '操作失败',
        err instanceof Error ? err.message : '图片新增失败，请稍后重试'
      );
    } finally {
      setIsManagingSystemPhotos(false);
    }
  }

  async function handleReplaceSystemSpotPhoto(index: number) {
    if (!selectedSpot || selectedSpot.source !== 'system' || !ADMIN_MODE_ENABLED) {
      return;
    }

    const imagePayload = await pickSingleImageAsBase64();

    if (!imagePayload) {
      return;
    }

    setIsManagingSystemPhotos(true);
    try {
      const savedSpot = await updateSystemSpotPhotosViaAdminEndpoint({
        spotId: selectedSpot.id,
        action: 'replace',
        index,
        base64Data: imagePayload.base64Data,
        mimeType: imagePayload.mimeType,
      });
      updateSpot(savedSpot);
      setSelectedSpot(savedSpot.id);
    } catch (err) {
      Alert.alert(
        '操作失败',
        err instanceof Error ? err.message : '图片替换失败，请稍后重试'
      );
    } finally {
      setIsManagingSystemPhotos(false);
    }
  }

  function handleDeleteSystemSpotPhoto(index: number) {
    if (!selectedSpot || selectedSpot.source !== 'system' || !ADMIN_MODE_ENABLED) {
      return;
    }

    Alert.alert('删除这张图片？', '删除后将无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          setIsManagingSystemPhotos(true);
          try {
            const savedSpot = await updateSystemSpotPhotosViaAdminEndpoint({
              spotId: selectedSpot.id,
              action: 'delete',
              index,
            });
            updateSpot(savedSpot);
            setSelectedSpot(savedSpot.id);
          } catch (err) {
            Alert.alert(
              '操作失败',
              err instanceof Error ? err.message : '图片删除失败，请稍后重试'
            );
          } finally {
            setIsManagingSystemPhotos(false);
          }
        },
      },
    ]);
  }

  async function handleSetSystemSpotCover(index: number) {
    if (!selectedSpot || selectedSpot.source !== 'system' || !ADMIN_MODE_ENABLED) {
      return;
    }

    setIsManagingSystemPhotos(true);
    try {
      const savedSpot = await updateSystemSpotPhotosViaAdminEndpoint({
        spotId: selectedSpot.id,
        action: 'set_cover',
        index,
      });
      updateSpot(savedSpot);
      setSelectedSpot(savedSpot.id);
    } catch (err) {
      Alert.alert(
        '操作失败',
        err instanceof Error ? err.message : '设置封面失败，请稍后重试'
      );
    } finally {
      setIsManagingSystemPhotos(false);
    }
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
        Alert.alert('提交成功', '该地点已提交审核。');
      } else {
        Alert.alert('提交成功', '该地点已标记为待审核。');
      }
      return;
    }

    Alert.alert('提交失败', '提交失败，请稍后重试。');
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

    const typeLabel = COLLAPSED_TYPE_LABELS[selectedSpot.spotType] ?? '';
    const lines = [
      `我在 PetMap 发现了一个宠物友好地点：${selectedSpot.name}`,
      typeLabel ? `类型：${typeLabel}` : null,
      shareAddress ? `地址：${shareAddress}` : null,
      selectedSpot.description ? `简介：${selectedSpot.description}` : null,
    ].filter((line): line is string => Boolean(line));

    try {
      await Share.share({
        message: lines.join('\n'),
      });
    } catch {
      Alert.alert('分享失败', '暂时无法分享地点信息。');
    }
  }

  function handleOpenSpotFeedback() {
    if (!selectedSpot) {
      return;
    }

    router.push({
      pathname: '/report/location',
      params: {
        spotId: selectedSpot.id,
        spotName: selectedSpot.name,
        spotAddress: selectedSpotDisplayAddress,
      },
    });
  }

  function handleOpenWeeklyActivity(activity: ActivityCollection) {
    router.push(`/activity/${activity.key}`);
  }

  function handleFavoritePressIn() {
    Animated.timing(favoriteButtonScale, {
      toValue: 0.95,
      duration: 90,
      useNativeDriver: true,
    }).start();
  }

  function handleFavoritePressOut() {
    Animated.timing(favoriteButtonScale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }

  function handleToggleFavoriteWithFeedback() {
    if (!selectedSpot) {
      return;
    }

    const wasFavorite = isFavorite(selectedSpot.id);
    toggleFavorite(selectedSpot.id);
    favoriteButtonScale.stopAnimation(() => {
      Animated.sequence([
        Animated.timing(favoriteButtonScale, {
          toValue: 1.08,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(favoriteButtonScale, {
          toValue: 1,
          duration: 130,
          useNativeDriver: true,
        }),
      ]).start();
    });

    if (!wasFavorite) {
      favoriteBurstProgress.stopAnimation(() => {
        favoriteBurstProgress.setValue(0);
        Animated.timing(favoriteBurstProgress, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }).start(() => {
          favoriteBurstProgress.setValue(0);
        });
      });
    }
  }

  const selectedSpotPhotoUris = selectedSpot?.photoUris ?? [];
  const shouldUseReadonlyDistrict =
    Boolean(pendingFormattedAddress.trim()) &&
    Boolean(formValues.district.trim());
  const selectedSpotAddressParts = selectedSpot
    ? getSpotDisplayAddressParts(selectedSpot)
    : null;
  const selectedSpotDisplayAddress =
    selectedSpotAddressParts?.full || '地址待补充';
  const collapsedPreviewUri = selectedSpotPhotoUris[0];
  const collapsedTypeLabel = selectedSpot ? COLLAPSED_TYPE_LABELS[selectedSpot.spotType] : '';
  const selectedTypeBadgePalette = selectedSpot ? TYPE_BADGE_COLORS[selectedSpot.spotType] : TYPE_BADGE_COLORS.other;
  const collapsedDistanceText =
    selectedSpot && userLoc
      ? formatCollapsedDistance(
          getDistanceMeters(userLoc, {
            lat: selectedSpot.lat,
            lng: selectedSpot.lng,
          })
        )
      : '9.5km';
  const collapsedDistrict = selectedSpotAddressParts?.district || '未知区域';
  const collapsedAddressDetail = selectedSpotAddressParts?.detail || '地址待补充';
  const collapsedTags = selectedSpot ? normalizeSpotTags(selectedSpot.tags, selectedSpot.name).slice(0, 3) : [];
  const halfTags = selectedSpot ? normalizeSpotTags(selectedSpot.tags, selectedSpot.name).slice(0, 3) : [];
  const halfDescription = selectedSpot?.description.trim() || '地点信息持续完善中。';
  const halfBusinessHours = selectedSpot?.businessHours?.trim() || '';
  const halfContact = selectedSpot?.contact?.trim() || '';
  const halfInfoItems = [
    halfBusinessHours ? `营业时间：${halfBusinessHours}` : null,
    halfContact ? `联系方式：${halfContact}` : null,
    selectedSpot?.merchantStatus === 'claimed' ? '商家已认证' : null,
  ].filter(Boolean) as string[];
  const halfPhotoUris = selectedSpotPhotoUris.slice(0, 6);
  const halfAddressDetail = collapsedAddressDetail;
  const halfLocationLine =
    halfAddressDetail === '地址待补充'
      ? collapsedDistrict
      : `${collapsedDistrict} · ${halfAddressDetail}`;
  const linkedWeeklyActivity = useMemo(() => {
    if (!selectedSpot) {
      return null;
    }

    return ACTIVITY_COLLECTIONS.find((activity) => activity.spotIds.includes(selectedSpot.id)) ?? null;
  }, [selectedSpot]);
  const fullDistanceText =
    selectedSpot && userLoc
      ? (() => {
          const distanceMeters = getDistanceMeters(userLoc, {
            lat: selectedSpot.lat,
            lng: selectedSpot.lng,
          });
          if (distanceMeters > 99000) {
            return '99km+';
          }
          return formatCollapsedDistance(distanceMeters);
        })()
      : null;
  const isUserOwnedSpot = selectedSpot?.source === 'user';
  const isAdminSystemSpot = ADMIN_MODE_ENABLED && selectedSpot?.source === 'system';
  const ownerSpotStatusLabel =
    selectedSpot?.submissionStatus === 'pending_review'
      ? '审核中'
      : selectedSpot?.verified
        ? '已发布'
        : '仅本地保存';
  const shouldShowSubmitForReview = isUserOwnedSpot && !selectedSpot?.verified;
  const canSubmitForReview = isUserOwnedSpot && selectedSpot?.submissionStatus !== 'pending_review';
  const isSelectedSpotFavorite = selectedSpot ? isFavorite(selectedSpot.id) : false;
  const visibleSpots = useMemo(
    () =>
      spots.filter((spot) => {
        const category = resolveMarkerVisualCategory(spot);
        return category ? selectedMarkerFilters.includes(category) : false;
      }),
    [selectedMarkerFilters, spots]
  );

  const currentZoom = getZoomFromRegion(currentRegion);
  const markerBaseScale = getMarkerBaseScale(currentZoom);

  // Stable priority set: which spots to actually render as markers.
  // selected spot is always included; non-selected limited by zoom tier.
  const markerDisplayIds = useMemo(() => {
    const selectedId = selectedSpot?.id ?? null;
    const maxCount = getMaxNonSelectedMarkerCount(currentZoom);

    // Stable sort: system > user, verified first, higher votes first, id as tiebreaker
    const sorted = [...visibleSpots].sort((a, b) => {
      if (a.source !== b.source) return a.source === 'system' ? -1 : 1;
      const aV = a.verified ? 1 : 0;
      const bV = b.verified ? 1 : 0;
      if (aV !== bV) return bV - aV;
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.id.localeCompare(b.id);
    });

    const ids = new Set<string>();
    if (selectedId) ids.add(selectedId);

    let added = 0;
    for (const spot of sorted) {
      if (ids.has(spot.id)) continue; // already added (selected)
      if (added >= maxCount) break;
      ids.add(spot.id);
      added++;
    }
    return ids;
  }, [visibleSpots, selectedSpot?.id, currentZoom]);

  function handleRegionChangeComplete(region: Region) {
    setCurrentRegion(region);
    if (tracksMarkerChangesTimeoutRef.current) {
      clearTimeout(tracksMarkerChangesTimeoutRef.current);
    }
    setTracksMarkerChanges(true);
    tracksMarkerChangesTimeoutRef.current = setTimeout(() => {
      setTracksMarkerChanges(false);
    }, 300);
  }

  useEffect(() => {
    if (!selectedSpot) {
      return;
    }

    const category = resolveMarkerVisualCategory(selectedSpot);
    const shouldKeepSelected =
      category !== null && selectedMarkerFilters.includes(category);

    if (!shouldKeepSelected) {
      clearSelectedSpot();
    }
  }, [clearSelectedSpot, selectedMarkerFilters, selectedSpot]);

  // When selectedSpot changes, briefly enable tracksViewChanges on all markers
  // so the native snapshot picks up the selected/deselected SVG switch immediately.
  // Also reset the hero photo carousel index to the first frame.
  useEffect(() => {
    if (tracksMarkerChangesTimeoutRef.current) {
      clearTimeout(tracksMarkerChangesTimeoutRef.current);
    }
    setTracksMarkerChanges(true);
    tracksMarkerChangesTimeoutRef.current = setTimeout(() => {
      setTracksMarkerChanges(false);
    }, 400);
    setHeroPhotoIndex(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpot?.id]);

  const filterBackdropOpacity = filterPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const filterPanelScale = filterPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.84, 1],
  });
  const filterPanelTranslateY = filterPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });
  const filterPanelOpacity = filterPanelAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.65, 1],
  });

  // Animate crossfade value whenever settled zoom changes.
  // tracksMarkerChanges is already true for 300ms after regionChangeComplete,
  // which covers the 200ms animation window.
  useEffect(() => {
    let target: number;
    if (currentZoom >= ZOOM_LARGE_MARKER) {
      target = 0;
    } else if (currentZoom <= ZOOM_SMALL_FULL) {
      target = 1;
    } else {
      target = (ZOOM_LARGE_MARKER - currentZoom) / (ZOOM_LARGE_MARKER - ZOOM_SMALL_FULL);
    }
    Animated.timing(markerCrossfadeRef.current, {
      toValue: target,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [currentZoom]);

  function openFilterPanel() {
    setIsFilterPanelMounted(true);
    setIsFilterPanelVisible(true);
    filterPanelAnim.setValue(0);
    Animated.spring(filterPanelAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 7,
      speed: 16,
    }).start();
  }

  function closeFilterPanel() {
    if (!isFilterPanelVisible) return;
    setIsFilterPanelVisible(false);
    Animated.timing(filterPanelAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsFilterPanelMounted(false);
    });
  }

  function toggleMarkerFilter(category: MarkerVisualCategory) {
    setSelectedMarkerFilters((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }


  function handleSelectAllMarkerFilters() {
    setSelectedMarkerFilters(ALL_MARKER_FILTER_KEYS);
  }

  function getMarkerScaleValue(spotId: string) {
    if (!markerScaleValuesRef.current[spotId]) {
      markerScaleValuesRef.current[spotId] = new Animated.Value(1);
    }

    return markerScaleValuesRef.current[spotId];
  }

  function getMarkerRotateValue(spotId: string) {
    if (!markerRotateValuesRef.current[spotId]) {
      markerRotateValuesRef.current[spotId] = new Animated.Value(0);
    }

    return markerRotateValuesRef.current[spotId];
  }

  useEffect(() => {
    const nextSelectedSpotId = selectedSpot?.id ?? null;
    const previousSelectedSpotId = previousSelectedSpotIdRef.current;

    // Cancel any pending wobble from a previous selection
    if (wobbleTimerRef.current) {
      clearTimeout(wobbleTimerRef.current);
      wobbleTimerRef.current = null;
    }

    if (previousSelectedSpotId && previousSelectedSpotId !== nextSelectedSpotId) {
      const prevScale = getMarkerScaleValue(previousSelectedSpotId);
      if (nextSelectedSpotId === null) {
        // True deselect: brief shrink-snap gives "dropping back to default" feel
        Animated.sequence([
          Animated.timing(prevScale, {
            toValue: 0.88,
            duration: 80,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(prevScale, {
            toValue: 1.0,
            duration: 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Switching to another marker: quick reset
        Animated.timing(prevScale, { toValue: 1, duration: 130, useNativeDriver: true }).start();
      }
      getMarkerRotateValue(previousSelectedSpotId).stopAnimation();
      getMarkerRotateValue(previousSelectedSpotId).setValue(0);
    }

    if (nextSelectedSpotId) {
      // Cancel any in-progress deselect animation (user re-selected while animating)
      deselectAnimRef.current.stopAnimation();
      deselectAnimRef.current.setValue(0);
      setDeselectingSpotId(null);
      const selectedMarkerScale = getMarkerScaleValue(nextSelectedSpotId);
      const selectedMarkerRotate = getMarkerRotateValue(nextSelectedSpotId);
      selectedMarkerScale.stopAnimation();
      // 起始值 = 当前 zoom 下 marker 的实际视觉大小（default SVG 50 在 markerVisualBox 60 中的比例）
      // 这样 selected marker 在切换瞬间尺寸连续，不跳动；然后随地图 zoom 同步 grow 到 1.0
      selectedMarkerScale.setValue(markerBaseScale * (MARKER_DEFAULT_SVG_SIZE / MARKER_SELECTED_SVG_SIZE));
      selectedMarkerRotate.stopAnimation();
      selectedMarkerRotate.setValue(0);

      // Phase A: 与地图 zoom 同步的 grow（250ms），用 Easing.out 模拟地图动画曲线
      Animated.timing(selectedMarkerScale, {
        toValue: 1.0,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      // Phase B: wobble starts AFTER the map recenter animation completes (~250ms).
      // Delay is 270ms = recenter duration (250) + small buffer (20).
      wobbleTimerRef.current = setTimeout(() => {
        wobbleTimerRef.current = null;
        const rotate = getMarkerRotateValue(nextSelectedSpotId);
        rotate.stopAnimation();
        rotate.setValue(0);
        Animated.sequence([
          Animated.timing(rotate, { toValue: 8, duration: 90, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: -6, duration: 80, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 4, duration: 70, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: -2, duration: 60, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }, 270);
    }

    previousSelectedSpotIdRef.current = nextSelectedSpotId;
  }, [selectedSpot?.id]);

  // Derived crossfade opacity values — shared across all non-selected markers.
  // Non-overlapping sequential switch: large fades out first (0→0.45), then small fades in (0.55→1).
  // The 0.45-0.55 gap (≈6ms at 120ms duration) is imperceptible, but eliminates the
  // "both markers at half-opacity" mid-state that made the transition look awkward.
  const largeLayerOpacity = markerCrossfadeRef.current.interpolate({
    inputRange: [0, 0.45, 0.55, 1],
    outputRange: [1, 0, 0, 0],
    extrapolate: 'clamp',
  });
  const smallLayerOpacity = markerCrossfadeRef.current.interpolate({
    inputRange: [0, 0.45, 0.55, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });

  // ── Two-pass marker rendering ────────────────────────────────────────────────
  // selectedVisibleSpot is pulled out so it can be rendered LAST (on top of all others).
  // During deselect animation, keep the deselecting spot in Pass 2 so it stays on top.
  const selectedVisibleSpot = selectedSpot
    ? (visibleSpots.find(s => s.id === selectedSpot.id) ?? null)
    : deselectingSpotId
    ? (visibleSpots.find(s => s.id === deselectingSpotId) ?? null)
    : null;

  // Derived opacity for the default layer during deselect (inverse of deselectAnimRef)
  const deselectDefaultLayerOpacity = deselectAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Renders a single Marker. Called in two passes:
  //   Pass 1 — all non-selected spots
  //   Pass 2 — selected spot alone (last child of MapView = top of paint stack)
  const renderSingleMarker = (spot: Spot) => {
    if (!markerDisplayIds.has(spot.id) && deselectingSpotId !== spot.id) return null;
    const isSelected = selectedSpot?.id === spot.id;
    const isDeselecting = !isSelected && deselectingSpotId === spot.id;
    const markerScale = getMarkerScaleValue(spot.id);
    const markerVisualCategory = resolveMarkerVisualCategory(spot);
    if (!markerVisualCategory) return null;
    const markerRotateDeg = getMarkerRotateValue(spot.id).interpolate({
      inputRange: [-10, 0, 10],
      outputRange: ['-10deg', '0deg', '10deg'],
    });
    return (
      <Marker
        key={spot.id}
        coordinate={{ latitude: spot.lat, longitude: spot.lng }}
        tracksViewChanges={tracksMarkerChanges || isSelected}
        zIndex={isSelected ? 999 : 1}
        onPress={() => {
          // 锁住 100ms，防止 MapView.onPress 紧随其后清掉选中
          markerJustPressedRef.current = true;
          setTimeout(() => { markerJustPressedRef.current = false; }, 100);
          setSelectedSpot(spot.id);
        }}>
        {/* 最外层：zoom 基础缩放（selected 时固定 1，避免 regionChangeComplete 跳动）*/}
        <View style={{ transform: [{ scale: isSelected ? 1 : markerBaseScale }] }}>
          <Animated.View style={[styles.markerContainer, { transform: [{ scale: markerScale }] }]}>
            <Animated.View
              style={{
                transform: [
                  { translateY: 24 },
                  { rotate: markerRotateDeg },
                  { translateY: -24 },
                ],
              }}>
              {/* 固定 60×60 容器，避免 default(50)/selected(60) SVG 尺寸差导致布局跳动 */}
              <View style={styles.markerVisualBox}>
                {isSelected ? (
                  // Selected: always large SVG, no crossfade
                  renderMarkerVisual(markerVisualCategory, true)
                ) : isDeselecting ? (
                  // Deselect animation: selected SVG fades out, default SVG fades in
                  <>
                    <Animated.View style={[styles.markerLayer, { opacity: deselectAnimRef.current }]}>
                      {renderMarkerVisual(markerVisualCategory, true)}
                    </Animated.View>
                    <Animated.View style={[styles.markerLayer, { opacity: deselectDefaultLayerOpacity }]}>
                      {renderMarkerVisual(markerVisualCategory, false)}
                    </Animated.View>
                  </>
                ) : (
                  // Non-selected: two layers that crossfade between large SVG and small dot
                  <>
                    <Animated.View style={[styles.markerLayer, { opacity: largeLayerOpacity }]}>
                      {renderMarkerVisual(markerVisualCategory, false)}
                    </Animated.View>
                    <Animated.View style={[styles.markerLayer, { opacity: smallLayerOpacity }]}>
                      {renderSmallMarkerVisual(markerVisualCategory)}
                    </Animated.View>
                  </>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Marker>
    );
  };

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
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => {
          // 点击空白区域时取消选中；Marker.onPress 触发后会短暂锁住这里
          if (selectedSpot && !markerJustPressedRef.current) {
            const spotId = selectedSpot.id;
            // Start deselect visual animation (selected SVG → default SVG)
            deselectAnimRef.current.stopAnimation();
            deselectAnimRef.current.setValue(1);
            setDeselectingSpotId(spotId);
            Animated.timing(deselectAnimRef.current, {
              toValue: 0,
              duration: 150,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => {
              setDeselectingSpotId(null);
            });
            // Clear store immediately so BottomSheet starts closing
            clearSelectedSpot();
          }
        }}
        showsUserLocation>

        {/* Pass 1: all non-selected markers */}
        {visibleSpots
          .filter(spot => spot.id !== selectedVisibleSpot?.id)
          .map(spot => renderSingleMarker(spot))}

        {/* Pass 2: selected marker rendered last → always on top of paint stack */}
        {selectedVisibleSpot ? renderSingleMarker(selectedVisibleSpot) : null}

      </MapView>

      <MapQuickActions
        bottom={quickActionsBottom}
        isFilterActive={isFilterPanelVisible}
        favoriteCount={favoriteCount}
        userSpotCount={userSpots.length}
        onPressFilter={() => openFilterPanel()}
        onPressFavorites={() => router.push('/my-favorites')}
        onPressMySpots={() => router.push('/my-spots')}
      />

      {isFilterPanelMounted ? (
        <View style={styles.filterOverlay} pointerEvents={isFilterPanelVisible ? 'box-none' : 'none'}>
          <Animated.View
            style={[styles.filterBackdrop, { opacity: filterBackdropOpacity }]}
            pointerEvents={isFilterPanelVisible ? 'auto' : 'none'}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeFilterPanel} />
          </Animated.View>

          <Animated.View
            style={[
              styles.filterPanel,
              {
                opacity: filterPanelOpacity,
                transform: [
                  { scale: filterPanelScale },
                  { translateY: filterPanelTranslateY },
                ],
              },
            ]}>
            <View style={styles.filterPanelHeader}>
              <Text style={styles.filterPanelTitle}>地图筛选</Text>
              <Pressable onPress={closeFilterPanel} style={styles.filterCloseButton}>
                <Ionicons name="close" size={16} color="#4A4A4A" />
              </Pressable>
            </View>

            <View style={styles.filterOptionsWrap}>
              {MARKER_FILTER_OPTIONS.map((item) => {
                const checked = selectedMarkerFilters.includes(item.key);

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => toggleMarkerFilter(item.key)}
                    style={[styles.filterOptionItem, checked ? styles.filterOptionItemActive : null]}>
                    <Text style={[styles.filterOptionText, checked ? styles.filterOptionTextActive : null]}>
                      {item.label}
                    </Text>
                    {checked ? <Ionicons name="checkmark" size={14} color="#ED8422" /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.filterActionsRow}>
              <Pressable onPress={handleSelectAllMarkerFilters} style={styles.filterSecondaryButton}>
                <Text style={styles.filterSecondaryButtonText}>重置/全选</Text>
              </Pressable>
              <Pressable onPress={closeFilterPanel} style={styles.filterPrimaryButton}>
                <Text style={styles.filterPrimaryButtonText}>应用</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}

      {selectedSpot ? (
        <Animated.View
          style={[
            styles.sheet,
            {
              height: fullSheetHeight,
              bottom: -sheetBottomOverlap,
              paddingBottom: sheetContainerBottomInset,
              transform: [{ translateY: sheetTranslateY }],
              // 背景交给内层 LinearGradient，外壳保持透明
              backgroundColor: 'transparent',
            },
          ]}>

          {/* ── Frosted glass background ── */}
          {/* collapsed/half: 顶亮底冷的渐变 → 磨砂玻璃冷光效果 */}
          {/* full: 接近不透明白底 → 保证内容可读 */}
          <LinearGradient
            colors={
              sheetStage === 'full'
                ? ['rgba(255,254,255,0.97)', 'rgba(255,254,255,0.97)']
                : ['rgba(255,255,255,0.94)', 'rgba(255,248,242,0.78)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sheetGlassBackground}
          />

          <View style={styles.sheetHandleArea} {...sheetPanResponder.panHandlers}>
            <SheetHandleIcon width={33} height={14} />
          </View>

          {sheetStage === 'collapsed' ? (
            <Pressable
              onPress={() => {
                setSheetStage('half');
                animateSheetToStage('half', 'collapsed');
              }}
              style={({ pressed }) => [
                styles.collapsedSummaryBlock,
                pressed ? styles.collapsedSummaryBlockPressed : null,
              ]}>
              <View style={styles.collapsedTopMetaRow}>
                <View style={[styles.collapsedTypeBadge, { backgroundColor: selectedTypeBadgePalette.background }]}>
                  <Text style={[styles.collapsedTypeBadgeText, { color: selectedTypeBadgePalette.text }]} numberOfLines={1}>
                    {collapsedTypeLabel}
                  </Text>
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
                  <View style={styles.collapsedPreviewPlaceholder} />
                )}
              </View>
            </Pressable>
          ) : sheetStage === 'half' ? (
            <View style={[styles.halfScrollViewport, { height: halfScrollViewportHeight }]}>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={[styles.halfContent, styles.halfContentScrollable]}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}>
                <View style={styles.halfSummaryBlock}>
                <View style={styles.halfTopMetaRow}>
                  <View style={[styles.collapsedTypeBadge, { backgroundColor: selectedTypeBadgePalette.background }]}>
                    <Text style={[styles.collapsedTypeBadgeText, { color: selectedTypeBadgePalette.text }]} numberOfLines={1}>
                      {collapsedTypeLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.halfMainInfoRow}>
                  <View style={styles.halfMainInfoLeft}>
                    <View style={styles.halfTitleRow}>
                      <View style={styles.halfTitleWrap}>
                        <Text style={styles.halfTitle} numberOfLines={1}>
                          {selectedSpot.name}
                        </Text>
                      </View>
                      <Text style={styles.halfDistance}>{collapsedDistanceText}</Text>
                    </View>

                    <View style={styles.halfAddressRow}>
                      <Text style={styles.halfAddress} numberOfLines={1}>
                        {halfLocationLine}
                      </Text>
                    </View>

                    {halfTags.length > 0 ? (
                      <View style={styles.halfTagsRow}>
                        {halfTags.map((tag) => (
                          <View key={`${selectedSpot.id}-${tag}`} style={styles.collapsedTag}>
                            <Text style={styles.collapsedTagText} numberOfLines={1}>
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.halfActionCluster}>
                    <Pressable onPress={handleOpenNavigation} style={styles.halfActionButton}>
                      <NavigationDefaultIcon width={25} height={25} />
                    </Pressable>
                    <Pressable onPress={handleShareSpotInfo} style={styles.halfActionButton}>
                      <ShareDefaultIcon width={25} height={25} />
                    </Pressable>
                    <Pressable
                      onPress={handleToggleFavoriteWithFeedback}
                      onPressIn={handleFavoritePressIn}
                      onPressOut={handleFavoritePressOut}
                      style={styles.halfActionButton}>
                      <FavoriteSuccessBurst progress={favoriteBurstProgress} />
                      <Animated.View style={{ transform: [{ scale: favoriteButtonScale }] }}>
                        {isSelectedSpotFavorite ? (
                          <FavouritePressedIcon width={25} height={25} />
                        ) : (
                          <FavouriteDefaultIcon width={25} height={25} />
                        )}
                      </Animated.View>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.halfFactsAndHeatRow}>
                  {halfInfoItems.length > 0 ? (
                    <View style={styles.halfFactsLeft}>
                      {halfInfoItems.map((item) => (
                        <Text key={`${selectedSpot.id}-${item}`} style={styles.halfFactText} numberOfLines={1}>
                          {item}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.halfFactsLeft}>
                      <Text style={styles.halfFactText} numberOfLines={1}>
                        详细信息待补充
                      </Text>
                    </View>
                  )}

                  <View style={styles.halfHeatInfo}>
                    <HeatIcon width={13} height={13} />
                    <Text style={styles.halfHeatText}>{selectedSpot.votes}</Text>
                  </View>
                </View>
              </View>

              {isUserOwnedSpot ? (
                <View style={styles.ownerActionsSection}>
                  <Text style={styles.ownerActionsTitle}>我的地点管理</Text>
                  <View style={styles.ownerStatusPill}>
                    <Text style={styles.ownerStatusText}>{ownerSpotStatusLabel}</Text>
                  </View>

                  <View style={styles.ownerActionsGrid}>
                    <Pressable onPress={handleEditSpot} style={styles.ownerActionButton}>
                      <Text style={styles.ownerActionButtonText}>编辑</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDeleteSpot}
                      style={[styles.ownerActionButton, styles.ownerDeleteButton]}>
                      <Text style={[styles.ownerActionButtonText, styles.ownerDeleteButtonText]}>删除</Text>
                    </Pressable>
                    <Pressable onPress={handlePickSpotPhoto} style={styles.ownerActionButton}>
                      <Text style={styles.ownerActionButtonText}>添加照片</Text>
                    </Pressable>
                    {shouldShowSubmitForReview ? (
                      <Pressable
                        disabled={!canSubmitForReview}
                        onPress={handleSubmitForReview}
                        style={[
                          styles.ownerActionButton,
                          styles.ownerSubmitButton,
                          !canSubmitForReview ? styles.ownerActionButtonDisabled : null,
                        ]}>
                        <Text
                          style={[
                            styles.ownerActionButtonText,
                            styles.ownerSubmitButtonText,
                            !canSubmitForReview ? styles.ownerSubmitButtonTextDisabled : null,
                          ]}>
                          {canSubmitForReview ? '提交审核' : '审核中'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {isAdminSystemSpot ? (
                <View style={styles.ownerActionsSection}>
                  <Text style={styles.ownerActionsTitle}>系统地点管理</Text>
                  <View style={styles.ownerActionsGrid}>
                    <Pressable onPress={handleEditSpot} style={styles.ownerActionButton}>
                      <Text style={styles.ownerActionButtonText}>编辑地点</Text>
                    </Pressable>
                    <Pressable onPress={openSystemPhotoManager} style={styles.ownerActionButton}>
                      <Text style={styles.ownerActionButtonText}>管理图片</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDeleteSystemSpot}
                      style={[styles.ownerActionButton, styles.ownerDeleteButton]}>
                      <Text style={[styles.ownerActionButtonText, styles.ownerDeleteButtonText]}>
                        删除地点
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.halfDetailContent}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.halfPhotosRow}>
                  {halfPhotoUris.length > 0 ? (
                    halfPhotoUris.map((uri) => (
                      <View key={`${selectedSpot.id}-${uri}`} style={styles.halfPhotoCard}>
                        <Image source={{ uri }} style={styles.halfPhoto} />
                      </View>
                    ))
                  ) : (
                    <View style={styles.halfPhotoEmptyState}>
                      <Ionicons name="images-outline" size={16} color="#8D877F" />
                      <Text style={styles.halfPhotoEmptyStateText}>地点图片待补充</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.halfDescriptionSection}>
                  <View style={styles.halfDivider} />
                  <Text style={styles.halfDescriptionText}>{halfDescription}</Text>
                  <View style={styles.halfDivider} />
                </View>

                {linkedWeeklyActivity ? (
                  <Pressable
                    onPress={() => handleOpenWeeklyActivity(linkedWeeklyActivity)}
                    style={({ pressed }) => [styles.halfWeeklyCard, pressed ? styles.halfWeeklyCardPressed : null]}>
                    {linkedWeeklyActivity.imageUri ? (
                      <Image source={{ uri: linkedWeeklyActivity.imageUri }} style={styles.halfWeeklyCardImage} />
                    ) : halfPhotoUris[0] ? (
                      <Image source={{ uri: halfPhotoUris[0] }} style={styles.halfWeeklyCardImage} />
                    ) : (
                      <View style={[styles.halfWeeklyCardImage, styles.halfWeeklyCardImagePlaceholder]} />
                    )}
                    <View style={styles.halfWeeklyCardOverlay}>
                      <View style={styles.halfWeeklyCardTextWrap}>
                        <Text style={styles.halfWeeklyCardTitle}>{linkedWeeklyActivity.title}</Text>
                        <Text style={styles.halfWeeklyCardSubtitle}>{linkedWeeklyActivity.summary}</Text>
                      </View>
                      <View style={styles.halfWeeklyCardButton}>
                        <Text style={styles.halfWeeklyCardButtonText}>{linkedWeeklyActivity.ctaLabel}</Text>
                      </View>
                    </View>
                  </Pressable>
                ) : null}

                <View style={styles.halfFeedbackWrap}>
                  <Pressable onPress={handleOpenSpotFeedback} style={styles.halfFeedbackButton}>
                    <Text style={styles.halfFeedbackButtonText}>反馈地点信息</Text>
                  </Pressable>
                </View>
              </View>

                <View style={[styles.sheetFooterSpacer, { height: tabBarHeight + insets.bottom + 56 }]} />
              </ScrollView>
            </View>
          ) : (
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.fullContent}
              showsVerticalScrollIndicator={false}>

              {/* ──────── §1 Hero Section ──────── */}
              <View style={styles.fullTopPhotoGestureArea}>
                {halfPhotoUris.length === 0 ? (
                  // No photos → placeholder
                  <View style={styles.fullTopPhotoPlaceholder} />
                ) : halfPhotoUris.length === 1 ? (
                  // Single photo → plain image
                  <Image source={{ uri: halfPhotoUris[0] }} style={styles.fullTopPhoto} resizeMode="cover" />
                ) : (
                  // Multiple photos → horizontal paging carousel
                  <View>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(e) => {
                        const idx = Math.round(
                          e.nativeEvent.contentOffset.x / windowWidth,
                        );
                        setHeroPhotoIndex(idx);
                      }}>
                      {halfPhotoUris.map((uri) => (
                        <Image
                          key={`hero-${uri}`}
                          source={{ uri }}
                          style={[styles.fullTopPhoto, { width: windowWidth }]}
                        />
                      ))}
                    </ScrollView>
                    {/* Dot page indicator */}
                    <View style={styles.heroDotRow}>
                      {halfPhotoUris.map((_, i) => (
                        <View
                          key={i}
                          style={[styles.heroDot, i === heroPhotoIndex ? styles.heroDotActive : null]}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* White card overlaps the bottom edge of hero */}
              <View style={styles.fullDetailPanel}>
                <View style={styles.fullBackRow}>
                  <Pressable
                    onPress={() => {
                      setSheetStage('half');
                      animateSheetToStage('half', 'full');
                    }}
                    style={styles.fullBackButton}>
                    <BackArrowIcon />
                  </Pressable>
                </View>

                <View style={styles.fullPanelContent}>

                  {/* ──────── §2 Summary Section ──────── */}
                  <View style={styles.fullSummarySection}>
                    <View style={styles.halfTopMetaRow}>
                      <View style={[styles.collapsedTypeBadge, { backgroundColor: selectedTypeBadgePalette.background }]}>
                        <Text style={[styles.collapsedTypeBadgeText, { color: selectedTypeBadgePalette.text }]} numberOfLines={1}>
                          {collapsedTypeLabel}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.fullPanelTitle} numberOfLines={2}>
                      {selectedSpot.name}
                    </Text>
                    {fullDistanceText ? (
                      <Text style={styles.fullSummaryDistance}>{fullDistanceText}</Text>
                    ) : null}

                    <View style={styles.fullPanelAddressRow}>
                      <Text style={styles.fullPanelDistrict}>{collapsedDistrict}</Text>
                      <Text style={styles.fullPanelAddressDot}>·</Text>
                      <Text style={styles.fullPanelAddress} numberOfLines={2}>{halfAddressDetail}</Text>
                    </View>

                    {halfTags.length > 0 ? (
                      <View style={styles.fullPanelTagsRow}>
                        {halfTags.map((tag) => (
                          <View key={`${selectedSpot.id}-${tag}-full`} style={styles.collapsedTag}>
                            <Text style={styles.collapsedTagText} numberOfLines={1}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  {/* ──────── §3 Action Section ──────── */}
                  <View style={styles.fullActionSection}>
                    <Pressable style={styles.fullActionItem} onPress={handleOpenNavigation}>
                      <NavigationDefaultIcon width={26} height={26} />
                      <Text style={styles.fullActionLabel}>导航</Text>
                    </Pressable>

                    <Pressable style={styles.fullActionItem} onPress={handleShareSpotInfo}>
                      <ShareDefaultIcon width={26} height={26} />
                      <Text style={styles.fullActionLabel}>分享</Text>
                    </Pressable>

                    <Pressable
                      style={styles.fullActionItem}
                      onPress={handleToggleFavoriteWithFeedback}
                      onPressIn={handleFavoritePressIn}
                      onPressOut={handleFavoritePressOut}>
                      <FavoriteSuccessBurst progress={favoriteBurstProgress} />
                      <Animated.View style={{ transform: [{ scale: favoriteButtonScale }] }}>
                        {isSelectedSpotFavorite ? (
                          <FavouritePressedIcon width={26} height={26} />
                        ) : (
                          <FavouriteDefaultIcon width={26} height={26} />
                        )}
                      </Animated.View>
                      <Text style={styles.fullActionLabel}>收藏</Text>
                    </Pressable>

                    <View style={styles.fullActionItem}>
                      <HeatIcon width={22} height={22} />
                      <Text style={styles.fullActionLabel}>{selectedSpot.votes} 热度</Text>
                    </View>
                  </View>

                  {/* ──────── §4 Facts Section ──────── */}
                  <View style={styles.fullFactsSection}>
                    {halfBusinessHours ? (
                      <View style={styles.fullFactRow}>
                        <Ionicons name="time-outline" size={14} color="#888888" />
                        <Text style={styles.fullFactText}>营业时间：{halfBusinessHours}</Text>
                      </View>
                    ) : null}
                    {halfContact ? (
                      <View style={styles.fullFactRow}>
                        <Ionicons name="call-outline" size={14} color="#888888" />
                        <Text style={styles.fullFactText}>联系方式：{halfContact}</Text>
                      </View>
                    ) : null}
                    {selectedSpot?.merchantStatus === 'claimed' ? (
                      <View style={styles.fullFactRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#ED8422" />
                        <Text style={styles.fullFactText}>商家已认证</Text>
                      </View>
                    ) : null}
                    {!halfBusinessHours && !halfContact && selectedSpot?.merchantStatus !== 'claimed' ? (
                      <View style={styles.fullFactRow}>
                        <Ionicons name="information-circle-outline" size={14} color="#A09A91" />
                        <Text style={styles.fullFactText}>营业时间和联系方式待补充</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* ──────── §5 Description Section ──────── */}
                  <View style={styles.fullDescriptionSection}>
                    <View style={styles.fullPanelDivider} />
                    <Text style={styles.fullDescriptionText}>{halfDescription}</Text>
                    <View style={styles.fullPanelDivider} />
                  </View>

                  {/* ──────── §6 Related / Feedback Section ──────── */}
                  <View style={styles.fullRelatedSection}>
                    {linkedWeeklyActivity ? (
                      <Pressable
                        onPress={() => handleOpenWeeklyActivity(linkedWeeklyActivity)}
                        style={({ pressed }) => [styles.halfWeeklyCard, pressed ? styles.halfWeeklyCardPressed : null]}>
                        {linkedWeeklyActivity.imageUri ? (
                          <Image source={{ uri: linkedWeeklyActivity.imageUri }} style={styles.halfWeeklyCardImage} />
                        ) : halfPhotoUris[0] ? (
                          <Image source={{ uri: halfPhotoUris[0] }} style={styles.halfWeeklyCardImage} />
                        ) : (
                          <View style={[styles.halfWeeklyCardImage, styles.halfWeeklyCardImagePlaceholder]} />
                        )}
                        <View style={styles.halfWeeklyCardOverlay}>
                          <View style={styles.halfWeeklyCardTextWrap}>
                            <Text style={styles.halfWeeklyCardTitle}>{linkedWeeklyActivity.title}</Text>
                            <Text style={styles.halfWeeklyCardSubtitle}>{linkedWeeklyActivity.summary}</Text>
                          </View>
                          <View style={styles.halfWeeklyCardButton}>
                            <Text style={styles.halfWeeklyCardButtonText}>{linkedWeeklyActivity.ctaLabel}</Text>
                          </View>
                        </View>
                      </Pressable>
                    ) : null}

                    <View style={styles.fullFeedbackSection}>
                      <Pressable onPress={handleOpenSpotFeedback} style={styles.fullFeedbackButton}>
                        <Text style={styles.fullFeedbackButtonText}>反馈地点信息</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Owner Section */}
                  {isUserOwnedSpot ? (
                    <View style={styles.ownerActionsSection}>
                      <Text style={styles.ownerActionsTitle}>我的地点管理</Text>
                      <View style={styles.ownerStatusPill}>
                        <Text style={styles.ownerStatusText}>{ownerSpotStatusLabel}</Text>
                      </View>
                      <View style={styles.ownerActionsGrid}>
                        <Pressable onPress={handleEditSpot} style={styles.ownerActionButton}>
                          <Text style={styles.ownerActionButtonText}>编辑</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleDeleteSpot}
                          style={[styles.ownerActionButton, styles.ownerDeleteButton]}>
                          <Text style={[styles.ownerActionButtonText, styles.ownerDeleteButtonText]}>删除</Text>
                        </Pressable>
                        <Pressable onPress={handlePickSpotPhoto} style={styles.ownerActionButton}>
                          <Text style={styles.ownerActionButtonText}>添加照片</Text>
                        </Pressable>
                        {shouldShowSubmitForReview ? (
                          <Pressable
                            disabled={!canSubmitForReview}
                            onPress={handleSubmitForReview}
                            style={[
                              styles.ownerActionButton,
                              styles.ownerSubmitButton,
                              !canSubmitForReview ? styles.ownerActionButtonDisabled : null,
                            ]}>
                            <Text
                              style={[
                                styles.ownerActionButtonText,
                                styles.ownerSubmitButtonText,
                                !canSubmitForReview ? styles.ownerSubmitButtonTextDisabled : null,
                              ]}>
                              {canSubmitForReview ? '提交审核' : '审核中'}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                  {isAdminSystemSpot ? (
                    <View style={styles.ownerActionsSection}>
                      <Text style={styles.ownerActionsTitle}>系统地点管理</Text>
                      <View style={styles.ownerActionsGrid}>
                        <Pressable onPress={handleEditSpot} style={styles.ownerActionButton}>
                          <Text style={styles.ownerActionButtonText}>编辑地点</Text>
                        </Pressable>
                        <Pressable onPress={openSystemPhotoManager} style={styles.ownerActionButton}>
                          <Text style={styles.ownerActionButtonText}>管理图片</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleDeleteSystemSpot}
                          style={[styles.ownerActionButton, styles.ownerDeleteButton]}>
                          <Text style={[styles.ownerActionButtonText, styles.ownerDeleteButtonText]}>
                            删除地点
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}


                </View>
              </View>
              <View style={[styles.sheetFooterSpacer, { height: tabBarHeight + insets.bottom + 56 }]} />
            </ScrollView>
          )}
        </Animated.View>
      ) : null}

      <Modal
        transparent
        animationType="slide"
        visible={isPhotoManagerVisible && isAdminSystemSpot}
        onRequestClose={closeSystemPhotoManager}>
        <View style={styles.photoManagerBackdrop}>
          <View style={styles.photoManagerSheet}>
            <View style={styles.photoManagerHeader}>
              <Text style={styles.photoManagerTitle}>管理图片</Text>
              <Pressable
                onPress={closeSystemPhotoManager}
                disabled={isManagingSystemPhotos}
                style={styles.photoManagerCloseButton}>
                <Ionicons name="close" size={16} color="#4A4A4A" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.photoManagerScroll}
              contentContainerStyle={styles.photoManagerContent}
              showsVerticalScrollIndicator={false}>
              {selectedSpotPhotoUris.length === 0 ? (
                <View style={styles.photoManagerEmptyCard}>
                  <Text style={styles.photoManagerEmptyText}>暂无图片，先上传一张封面图</Text>
                </View>
              ) : (
                selectedSpotPhotoUris.slice(0, MAX_SYSTEM_SPOT_PHOTOS).map((uri, index) => (
                  <View key={`${selectedSpot?.id ?? 'spot'}-${uri}-${index}`} style={styles.photoManagerCard}>
                    <Image source={{ uri }} style={styles.photoManagerImage} />
                    <View style={styles.photoManagerActions}>
                      <Pressable
                        disabled={isManagingSystemPhotos || index === 0}
                        onPress={() => handleSetSystemSpotCover(index)}
                        style={[
                          styles.photoManagerActionButton,
                          index === 0 ? styles.photoManagerActionButtonDisabled : null,
                        ]}>
                        <Text
                          style={[
                            styles.photoManagerActionText,
                            index === 0 ? styles.photoManagerActionTextDisabled : null,
                          ]}>
                          {index === 0 ? '当前封面' : '设为封面'}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={isManagingSystemPhotos}
                        onPress={() => handleReplaceSystemSpotPhoto(index)}
                        style={styles.photoManagerActionButton}>
                        <Text style={styles.photoManagerActionText}>替换</Text>
                      </Pressable>
                      <Pressable
                        disabled={isManagingSystemPhotos}
                        onPress={() => handleDeleteSystemSpotPhoto(index)}
                        style={[styles.photoManagerActionButton, styles.photoManagerDeleteButton]}>
                        <Text style={[styles.photoManagerActionText, styles.photoManagerDeleteText]}>
                          删除
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.photoManagerFooter}>
              <Text style={styles.photoManagerCountText}>
                {selectedSpotPhotoUris.length}/{MAX_SYSTEM_SPOT_PHOTOS}
              </Text>
              <Pressable
                disabled={
                  isManagingSystemPhotos || selectedSpotPhotoUris.length >= MAX_SYSTEM_SPOT_PHOTOS
                }
                onPress={handleAddSystemSpotPhoto}
                style={[
                  styles.photoManagerAddButton,
                  isManagingSystemPhotos || selectedSpotPhotoUris.length >= MAX_SYSTEM_SPOT_PHOTOS
                    ? styles.photoManagerActionButtonDisabled
                    : null,
                ]}>
                <Text style={styles.photoManagerAddButtonText}>
                  {isManagingSystemPhotos ? '处理中…' : '新增图片'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SpotFormModal
        visible={isCreateModalVisible}
        modalMode={modalMode}
        isAdminMode={ADMIN_MODE_ENABLED}
        showSpotTypeField={
          modalMode === 'create'
            ? ADMIN_MODE_ENABLED
            : ADMIN_MODE_ENABLED && editingSpotSource === 'system'
        }
        formValues={formValues}
        pendingFormattedAddress={pendingFormattedAddress}
        isResolvingPendingAddress={isResolvingPendingAddress}
        shouldUseReadonlyDistrict={shouldUseReadonlyDistrict}
        formError={formError}
        pendingCoords={pendingCoords}
        isSubmitting={isSubmittingSpot}
        onClose={closeCreateModal}
        onSubmit={handleSubmitSpot}
        onUpdateField={updateFormValue}
        onToggleTag={toggleTag}
        createCoverPhotoUri={createCoverImage?.uri ?? null}
        onPickCreateCoverPhoto={handlePickCreateCoverPhoto}
        onRemoveCreateCoverPhoto={handleRemoveCreateCoverPhoto}
      />

      {/* ── Map Guide (Layer 3 onboarding) ──────────────────────────── */}
      {showMapGuide ? (
        <View style={styles.mapGuideContainer} pointerEvents="box-none">
          <View style={styles.mapGuideCard}>
            <View style={styles.mapGuideHeader}>
              <Text style={styles.mapGuideTitle}>快速上手</Text>
              <Pressable onPress={handleDismissMapGuide} style={styles.mapGuideCloseBtn}>
                <Ionicons name="close" size={16} color="#888" />
              </Pressable>
            </View>
            {(
              [
                { icon: 'location-outline', text: '点击地图上的标记，查看地点详情' },
                { icon: 'chevron-up-outline', text: '上拉卡片，查看地点完整信息' },
                { icon: 'hand-left-outline', text: '长按地图，可以添加新地点' },
              ] as Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }>
            ).map(({ icon, text }) => (
              <View key={text} style={styles.mapGuideTipRow}>
                <Ionicons name={icon} size={15} color="#ED8422" />
                <Text style={styles.mapGuideTipText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
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
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  filterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.24)',
  },
  filterPanel: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E0D9',
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterPanelTitle: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '700',
  },
  filterCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionsWrap: {
    gap: 8,
  },
  filterOptionItem: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E3DC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterOptionItemActive: {
    borderColor: '#F2C596',
    backgroundColor: '#FFF8EF',
  },
  filterOptionText: {
    color: '#3C3C3C',
    fontSize: 13,
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#7E4D1F',
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterSecondaryButton: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9D3CC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSecondaryButtonText: {
    color: '#4C4C4C',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPrimaryButton: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ED8422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    // Shadow — supplements the SVG's built-in feDropShadow filter.
    // iOS: shadowColor renders against rasterised SVG content even without backgroundColor.
    // Android: elevation provides material shadow (SVG filter shadows unreliable on Android).
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  markerVisualBox: {
    width: MARKER_SELECTED_SVG_SIZE,
    height: MARKER_SELECTED_SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Absolute overlay layers inside markerVisualBox for large/small crossfade
  markerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
    // backgroundColor 由内联样式按 sheetStage 动态设置
    // 顶部细高光描边，增强玻璃层级感
    borderTopWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopColor: 'rgba(255,255,255,0.9)',
    // iOS shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    // Android elevation
    elevation: 12,
  },
  sheetGlassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  sheetScroll: {
    flex: 1,
  },
  halfScrollViewport: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
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
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedTypeBadge: {
    minHeight: 25,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  collapsedTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
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
    justifyContent: 'flex-start',
  },
  collapsedTitleWrap: {
    flexGrow: 0,
    flexShrink: 1,
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
    minWidth: 38,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#ED8422',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
  },
  collapsedPreviewImage: {
    width: 103,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#DCCAB4',
  },
  collapsedPreviewPlaceholder: {
    width: 103,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#DCCAB4',
  },
  halfContent: {
    width: 342,
    alignSelf: 'center',
    gap: 9,
    paddingBottom: 8,
  },
  halfContentScrollable: {
    paddingBottom: 20,
  },
  halfSummaryBlock: {
    width: 342,
    gap: 9,
  },
  halfTopMetaRow: {
    width: 342,
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  halfMainInfoRow: {
    width: 342,
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  halfMainInfoLeft: {
    flex: 1,
    minWidth: 0,
    height: 61,
    gap: 2,
    paddingRight: 10,
  },
  halfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    justifyContent: 'flex-start',
  },
  halfTitleWrap: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
  },
  halfTitle: {
    color: '#404040',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  halfDistance: {
    flexShrink: 0,
    color: '#404040',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
  },
  halfAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 14,
  },
  halfDistrict: {
    flexShrink: 0,
    color: '#424242',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
  },
  halfAddressDot: {
    flexShrink: 0,
    color: '#7A7A7A',
    fontSize: 10,
    lineHeight: 12,
  },
  halfAddress: {
    flex: 1,
    color: '#424242',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
  },
  halfTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 19,
  },
  halfActionCluster: {
    width: 116,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  halfActionButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#ED8422',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  favoriteBurstLayer: {
    position: 'absolute',
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBurstPiece: {
    position: 'absolute',
  },
  favoriteBurstBonePrimary: {
    top: 2,
    right: 1,
  },
  favoriteBurstBoneTopLeft: {
    top: 5,
    left: 3,
  },
  favoriteBurstBoneBottom: {
    bottom: 2,
    right: 6,
  },
  favoriteBurstStarLeft: {
    top: 6,
    left: 3,
  },
  favoriteBurstStarBottom: {
    bottom: 4,
    right: 5,
  },
  halfFactsAndHeatRow: {
    width: 342,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  halfFactsLeft: {
    width: 170,
    height: 32,
    justifyContent: 'space-between',
  },
  halfFactText: {
    color: '#686868',
    fontSize: 12,
    lineHeight: 14,
  },
  halfClaimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  halfClaimText: {
    color: '#ED8422',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  halfHeatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  halfHeatText: {
    color: '#ED8422',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  halfDetailContent: {
    width: 342,
    gap: 10,
  },
  ownerActionsSection: {
    width: 342,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE8E2',
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  ownerActionsTitle: {
    color: '#4B453F',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  ownerStatusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F4F1EC',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ownerStatusText: {
    color: '#5F5A53',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
  },
  ownerActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ownerActionButton: {
    minWidth: 72,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DAD4CD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  ownerActionButtonDisabled: {
    backgroundColor: '#F1EFEB',
    borderColor: '#E4DED7',
  },
  ownerActionButtonText: {
    color: '#3F3A33',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  ownerSubmitButton: {
    borderColor: '#2EA65A',
    backgroundColor: '#EAF7EF',
  },
  ownerSubmitButtonText: {
    color: '#1E7E44',
  },
  ownerSubmitButtonTextDisabled: {
    color: '#8B958D',
  },
  ownerDeleteButton: {
    borderColor: '#F1C8C8',
    backgroundColor: '#FFF6F6',
  },
  ownerDeleteButtonText: {
    color: '#B34747',
  },
  photoManagerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 36, 0.4)',
    justifyContent: 'flex-end',
  },
  photoManagerSheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  photoManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoManagerTitle: {
    color: '#3F3A33',
    fontSize: 16,
    fontWeight: '700',
  },
  photoManagerCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoManagerScroll: {
    flexGrow: 0,
  },
  photoManagerContent: {
    gap: 10,
    paddingBottom: 4,
  },
  photoManagerEmptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE8E2',
    backgroundColor: '#FFFDFC',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  photoManagerEmptyText: {
    color: '#8A8176',
    fontSize: 13,
    lineHeight: 18,
  },
  photoManagerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE8E2',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  photoManagerImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#DCCAB4',
  },
  photoManagerActions: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoManagerActionButton: {
    minWidth: 72,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DAD4CD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  photoManagerActionButtonDisabled: {
    opacity: 0.5,
  },
  photoManagerActionText: {
    color: '#3F3A33',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  photoManagerActionTextDisabled: {
    color: '#8B958D',
  },
  photoManagerDeleteButton: {
    borderColor: '#F1C8C8',
    backgroundColor: '#FFF6F6',
  },
  photoManagerDeleteText: {
    color: '#B34747',
  },
  photoManagerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0ECE7',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoManagerCountText: {
    color: '#8A8176',
    fontSize: 12,
    fontWeight: '600',
  },
  photoManagerAddButton: {
    minWidth: 92,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#ED8422',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  photoManagerAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  halfPhotosRow: {
    gap: 6,
  },
  halfPhotoCard: {
    width: 167,
    height: 105,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  halfPhoto: {
    width: 167,
    height: 105,
    borderRadius: 10,
    resizeMode: 'cover',
    backgroundColor: '#DCCAB4',
  },
  halfPhotoEmptyState: {
    width: 167,
    height: 105,
    borderRadius: 10,
    backgroundColor: '#DCCAB4',
    borderWidth: 1,
    borderColor: '#C9B9A7',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  halfPhotoEmptyStateText: {
    color: '#746C63',
    fontSize: 11,
    fontWeight: '600',
  },
  halfDescriptionSection: {
    width: 342,
    minHeight: 67,
    gap: 8,
    justifyContent: 'center',
  },
  halfDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(66,66,66,0.45)',
  },
  halfDescriptionText: {
    color: '#5E5E5E',
    fontSize: 12,
    lineHeight: 15,
  },
  halfWeeklyCard: {
    width: 342,
    height: 112,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#CFCFCF',
    position: 'relative',
  },
  halfWeeklyCardPressed: {
    opacity: 0.92,
  },
  halfWeeklyCardImage: {
    width: '100%',
    height: '100%',
  },
  halfWeeklyCardImagePlaceholder: {
    backgroundColor: '#C8C8C8',
  },
  halfWeeklyCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(11,19,36,0.46)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfWeeklyCardTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  halfWeeklyCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  halfWeeklyCardSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
  },
  halfWeeklyCardButton: {
    width: 68,
    height: 23,
    borderRadius: 999,
    backgroundColor: '#2EA65A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfWeeklyCardButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  halfFeedbackWrap: {
    width: 342,
    gap: 7,
    paddingBottom: 2,
  },
  halfFeedbackButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F0EAE2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2D4C4',
  },
  halfFeedbackButtonText: {
    color: '#6B5A48',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  halfFeedbackText: {
    color: '#6E6E6E',
    fontSize: 11,
    lineHeight: 15,
  },
  fullContent: {
    width: '100%',
    paddingBottom: 8,
  },
  fullTopPhotoGestureArea: {
    width: '100%',
  },
  fullTopPhoto: {
    width: '100%',
    height: 360,
    resizeMode: 'cover',
    backgroundColor: '#DCCAB4',
  },
  fullTopPhotoPlaceholder: {
    width: '100%',
    height: 360,
    backgroundColor: '#DCCAB4',
  },
  fullDetailPanel: {
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFEFF',
    paddingTop: 10,
    paddingBottom: 4,
  },
  fullBackRow: {
    width: 342,
    alignSelf: 'center',
    marginBottom: 6,
  },
  fullBackButton: {
    alignSelf: 'flex-start',
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 1,
  },
  fullPanelContent: {
    width: 342,
    alignSelf: 'center',
    gap: 16,
  },
  fullPanelSummaryBlock: {
    gap: 8,
  },
  fullPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fullPanelTitle: {
    flex: 1,
    color: '#3C3C3C',
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 30,
  },
  fullPanelDistance: {
    color: '#404040',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  fullPanelAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  fullPanelDistrict: {
    flexShrink: 0,
    color: '#444444',
    fontSize: 12,
    lineHeight: 16,
  },
  fullPanelAddressDot: {
    flexShrink: 0,
    color: '#777777',
    fontSize: 10,
    lineHeight: 15,
  },
  fullPanelAddress: {
    flex: 1,
    color: '#444444',
    fontSize: 12,
    lineHeight: 16,
  },
  fullPanelTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  fullPanelInfoActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  fullPanelInfoLeft: {
    flex: 1,
    gap: 4,
  },
  fullPanelInfoText: {
    color: '#686868',
    fontSize: 12,
    lineHeight: 14,
  },
  fullPanelInfoRight: {
    width: 122,
    gap: 6,
    alignItems: 'flex-end',
  },
  fullPanelActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullPanelHeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullPanelDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(66,66,66,0.45)',
  },
  fullPanelDescription: {
    minHeight: 74,
    justifyContent: 'center',
  },
  fullPanelDescriptionText: {
    color: '#5E5E5E',
    fontSize: 12,
    lineHeight: 17,
  },
  fullCommentsPlaceholder: {
    height: 160,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  fullCommentsPlaceholderText: {
    color: '#9A9A9A',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  // ── Hero carousel dots ────────────────────────────────────────────────────
  heroDotRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    pointerEvents: 'none',
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  heroDotActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  // ── Full detail page — new section styles ─────────────────────────────────
  fullSummarySection: {
    gap: 8,
    paddingTop: 2,
  },
  fullSummaryDistance: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 17,
    marginTop: -3,
  },
  fullActionSection: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-around' as const,
    backgroundColor: '#F5EEE4',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginVertical: 2,
  },
  fullActionItem: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 5,
  },
  fullActionLabel: {
    color: '#4A4A4A',
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  fullFactsSection: {
    gap: 9,
    paddingVertical: 4,
  },
  fullFactRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  fullFactText: {
    color: '#5A5A5A',
    fontSize: 13,
    lineHeight: 18,
  },
  fullDescriptionSection: {
    gap: 12,
    paddingVertical: 4,
  },
  fullDescriptionText: {
    color: '#5E5E5E',
    fontSize: 13,
    lineHeight: 21,
  },
  fullRelatedSection: {
    gap: 12,
  },
  fullFeedbackSection: {
    gap: 8,
  },
  fullFeedbackButton: {
    alignSelf: 'flex-start' as const,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0EDE9',
  },
  fullFeedbackButtonText: {
    color: '#3C3C3C',
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  fullFeedbackHint: {
    color: '#8A8A8A',
    fontSize: 11,
    lineHeight: 16,
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

  // ── Map Guide overlay ────────────────────────────────────────────
  mapGuideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 180,
    zIndex: 90,
  },
  mapGuideCard: {
    width: 300,
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  mapGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapGuideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ED8422',
    letterSpacing: 0.3,
  },
  mapGuideCloseBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGuideTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  mapGuideTipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#404040',
  },
});

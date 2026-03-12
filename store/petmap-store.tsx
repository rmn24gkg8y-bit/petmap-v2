import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  fetchSystemSpotsFromCloud,
  getFallbackSystemSpots,
} from '@/repo/cloudSpotsRepo';
import {
  hasSpotSubmissionEndpointConfigured,
  submitSpotForReviewToCloud,
} from '@/repo/cloudSubmissionRepo';
import {
  loadFormattedAddressBySpotId,
  loadFavoriteIds,
  loadRecentViewedIds,
  loadUserCreatedSpots,
  saveFormattedAddressBySpotId,
  saveFavoriteIds,
  saveRecentViewedIds,
  saveUserCreatedSpots,
} from '@/repo/storageRepo';
import type { Spot } from '@/types/spot';
import { getDistanceMeters } from '@/utils/distance';

type SortMode = 'popular' | 'name' | 'distance';
type UserLoc = { lat: number; lng: number } | null;

type PetMapStoreValue = {
  hasHydratedStorage: boolean;
  hasLoadedRemoteSpots: boolean;
  spots: Spot[];
  selectedSpotId: string | null;
  favoriteIds: string[];
  recentViewedIds: string[];
  searchQuery: string;
  selectedTag: string | null;
  selectedSpotType: Spot['spotType'] | null;
  showFavoritesOnly: boolean;
  showUserOnly: boolean;
  sortMode: SortMode;
  userLoc: UserLoc;
  selectedSpot: Spot | null;
  userSpots: Spot[];
  favoriteSpots: Spot[];
  recentViewedSpots: Spot[];
  allTags: string[];
  filteredSpots: Spot[];
  totalSpots: number;
  favoriteCount: number;
  addSpot: (spot: Spot) => void;
  updateSpot: (spot: Spot) => void;
  removeSpot: (id: string) => void;
  addSpotPhoto: (spotId: string, uri: string) => void;
  removeSpotPhoto: (spotId: string, uri: string) => void;
  setSpotFormattedAddress: (id: string, formattedAddress: string) => void;
  submitSpotForReview: (id: string) => Promise<{
    success: boolean;
    mode: 'cloud' | 'local';
    error?: string;
  }>;
  setSelectedSpot: (id: string) => void;
  clearSelectedSpot: () => void;
  toggleFavorite: (id: string) => void;
  addRecentViewed: (id: string) => void;
  setSearchQuery: (value: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setSelectedSpotType: (spotType: Spot['spotType'] | null) => void;
  setShowFavoritesOnly: (value: boolean) => void;
  setShowUserOnly: (value: boolean) => void;
  setSortMode: (mode: SortMode) => void;
  resetExploreFilters: () => void;
  setUserLoc: (loc: UserLoc) => void;
  isFavorite: (id: string) => boolean;
};

const PetMapContext = createContext<PetMapStoreValue | undefined>(undefined);

export function PetMapProvider({ children }: PropsWithChildren) {
  const fallbackSystemSpots = getFallbackSystemSpots();
  const [systemSpots, setSystemSpots] = useState<Spot[]>(fallbackSystemSpots);
  const [hasLoadedRemoteSpots, setHasLoadedRemoteSpots] = useState(false);
  const [userCreatedSpots, setUserCreatedSpots] = useState<Spot[]>([]);
  const [formattedAddressBySpotId, setFormattedAddressBySpotId] = useState<Record<string, string>>(
    {}
  );
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentViewedIds, setRecentViewedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSpotType, setSelectedSpotType] = useState<Spot['spotType'] | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUserOnly, setShowUserOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [userLoc, setUserLoc] = useState<UserLoc>(null);
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSystemSpots() {
      try {
        const remoteSpots = await fetchSystemSpotsFromCloud();

        if (!isMounted) {
          return;
        }

        setSystemSpots(remoteSpots);
        console.log('[PetMapStore][cloud] loaded system spots:', remoteSpots.length);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSystemSpots(fallbackSystemSpots);
        console.warn('[PetMapStore][cloud] failed, fallback to mock spots:', error);
      } finally {
        if (isMounted) {
          setHasLoadedRemoteSpots(true);
        }
      }
    }

    hydrateSystemSpots();

    return () => {
      isMounted = false;
    };
  }, [fallbackSystemSpots]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateStorage() {
      const [
        storedFavoriteIds,
        storedRecentViewedIds,
        storedUserCreatedSpots,
        storedFormattedAddressBySpotId,
      ] = await Promise.all([
        loadFavoriteIds(),
        loadRecentViewedIds(),
        loadUserCreatedSpots(),
        loadFormattedAddressBySpotId(),
      ]);

      if (!isMounted) {
        return;
      }

      const formattedAddressKeys = Object.keys(storedFormattedAddressBySpotId);
      console.log(
        '[PetMapStore][hydrate] loaded formattedAddressBySpotId keys:',
        formattedAddressKeys.length,
        formattedAddressKeys
      );

      setFavoriteIds(storedFavoriteIds);
      setRecentViewedIds(storedRecentViewedIds);
      setUserCreatedSpots(
        storedUserCreatedSpots.map((spot) =>
          spot.source === 'user' && spot.submissionStatus === undefined
            ? { ...spot, submissionStatus: 'local' }
            : spot
        )
      );
      setFormattedAddressBySpotId((current) => ({
        ...storedFormattedAddressBySpotId,
        ...current,
      }));
      setHasHydratedStorage(true);
    }

    hydrateStorage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    saveFavoriteIds(favoriteIds);
  }, [favoriteIds, hasHydratedStorage]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    saveRecentViewedIds(recentViewedIds);
  }, [recentViewedIds, hasHydratedStorage]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    saveUserCreatedSpots(userCreatedSpots);
  }, [userCreatedSpots, hasHydratedStorage]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    const formattedAddressKeys = Object.keys(formattedAddressBySpotId);
    console.log(
      '[PetMapStore][persist] save formattedAddressBySpotId keys:',
      formattedAddressKeys.length,
      formattedAddressKeys
    );
    saveFormattedAddressBySpotId(formattedAddressBySpotId);
  }, [formattedAddressBySpotId, hasHydratedStorage]);

  const value = useMemo(() => {
    const systemSpotHitCount = systemSpots.filter(
      (spot) => typeof formattedAddressBySpotId[spot.id] === 'string'
    ).length;
    console.log('[PetMapStore][compose] system spot cache hits:', systemSpotHitCount);

    const spots = [
      ...systemSpots.map((spot) =>
        formattedAddressBySpotId[spot.id]
          ? { ...spot, formattedAddress: formattedAddressBySpotId[spot.id] }
          : spot
      ),
      ...userCreatedSpots.map((spot) =>
        spot.formattedAddress || !formattedAddressBySpotId[spot.id]
          ? spot
          : { ...spot, formattedAddress: formattedAddressBySpotId[spot.id] }
      ),
    ].map((spot) => (spot.spotType ? spot : { ...spot, spotType: 'other' as const }));
    const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) ?? null;
    const userSpots = spots.filter((spot) => spot.source === 'user');
    const favoriteSpots = spots.filter((spot) => favoriteIds.includes(spot.id));
    const isFavorite = (id: string) => favoriteIds.includes(id);
    const addRecentViewed = (id: string) =>
      setRecentViewedIds((current) => {
        const next = [id, ...current.filter((item) => item !== id)];

        return next.slice(0, 5);
      });
    const recentViewedSpots = recentViewedIds
      .map((id) => spots.find((spot) => spot.id === id) ?? null)
      .filter((spot): spot is Spot => spot !== null);
    const allTags = [...new Set(spots.flatMap((spot) => spot.tags))].sort((a, b) =>
      a.localeCompare(b, 'zh-CN')
    );
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filteredBySearch =
      normalizedQuery === ''
        ? spots
        : spots.filter((spot) => {
            const haystacks = [
              spot.name,
              spot.district,
              spot.addressHint,
              spot.description,
              ...spot.tags,
            ];

            return haystacks.some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
          });
    const filteredByFavorites = showFavoritesOnly
      ? filteredBySearch.filter((spot) => favoriteIds.includes(spot.id))
      : filteredBySearch;
    const filteredBySource = showUserOnly
      ? filteredByFavorites.filter((spot) => spot.source === 'user')
      : filteredByFavorites;
    const filteredByTag =
      selectedTag === null
        ? filteredBySource
        : filteredBySource.filter((spot) => spot.tags.includes(selectedTag));
    const filteredBySpotType =
      selectedSpotType === null
        ? filteredByTag
        : filteredByTag.filter((spot) => spot.spotType === selectedSpotType);
    const filteredSpots = [...filteredBySpotType].sort((a, b) => {
      if (sortMode === 'distance') {
        if (!userLoc) {
          return b.votes - a.votes;
        }

        return (
          getDistanceMeters(userLoc, { lat: a.lat, lng: a.lng }) -
          getDistanceMeters(userLoc, { lat: b.lat, lng: b.lng })
        );
      }

      if (sortMode === 'name') {
        return a.name.localeCompare(b.name, 'zh-CN');
      }

      return b.votes - a.votes;
    });

    return {
      hasHydratedStorage,
      hasLoadedRemoteSpots,
      spots,
      selectedSpotId,
      favoriteIds,
      recentViewedIds,
      searchQuery,
      selectedTag,
      selectedSpotType,
      showFavoritesOnly,
      showUserOnly,
      sortMode,
      userLoc,
      selectedSpot,
      userSpots,
      favoriteSpots,
      recentViewedSpots,
      allTags,
      filteredSpots,
      totalSpots: spots.length,
      favoriteCount: favoriteIds.length,
      addSpot: (spot: Spot) => {
        setUserCreatedSpots((current) => [...current, spot]);
      },
      updateSpot: (spot: Spot) => {
        if (spot.source !== 'user') {
          return;
        }

        setUserCreatedSpots((current) =>
          current.map((item) => (item.id === spot.id ? spot : item))
        );
      },
      removeSpot: (id: string) => {
        setUserCreatedSpots((current) => current.filter((spot) => spot.id !== id));
        setSelectedSpotId((current) => (current === id ? null : current));
        setFavoriteIds((current) => current.filter((item) => item !== id));
        setRecentViewedIds((current) => current.filter((item) => item !== id));
      },
      addSpotPhoto: (spotId: string, uri: string) => {
        const normalizedUri = uri.trim();

        if (!normalizedUri) {
          return;
        }

        setUserCreatedSpots((current) =>
          current.map((spot) =>
            spot.id === spotId && spot.source === 'user'
              ? {
                  ...spot,
                  photoUris: (spot.photoUris ?? []).includes(normalizedUri)
                    ? spot.photoUris ?? []
                    : [...(spot.photoUris ?? []), normalizedUri],
                }
              : spot
          )
        );
      },
      removeSpotPhoto: (spotId: string, uri: string) => {
        setUserCreatedSpots((current) =>
          current.map((spot) =>
            spot.id === spotId && spot.source === 'user'
              ? {
                  ...spot,
                  photoUris: (spot.photoUris ?? []).filter((item) => item !== uri),
                }
              : spot
          )
        );
      },
      setSpotFormattedAddress: (id: string, formattedAddress: string) => {
        const nextValue = formattedAddress.trim();

        if (!nextValue) {
          return;
        }

        setFormattedAddressBySpotId((current) => {
          if (current[id] === nextValue) {
            return current;
          }

          const nextMap = { ...current, [id]: nextValue };
          const nextKeys = Object.keys(nextMap);
          console.log(
            '[PetMapStore][setSpotFormattedAddress]',
            id,
            nextValue,
            'keys:',
            nextKeys.length
          );

          return nextMap;
        });
        setUserCreatedSpots((current) =>
          current.map((spot) => (spot.id === id ? { ...spot, formattedAddress: nextValue } : spot))
        );
      },
      submitSpotForReview: async (id: string) => {
        const targetSpot = userCreatedSpots.find((spot) => spot.id === id);

        if (
          !targetSpot ||
          targetSpot.source !== 'user' ||
          targetSpot.submissionStatus === 'pending_review'
        ) {
          return {
            success: false,
            mode: 'local' as const,
            error: '该地点当前无法提交审核',
          };
        }

        if (!hasSpotSubmissionEndpointConfigured()) {
          setUserCreatedSpots((current) =>
            current.map((spot) =>
              spot.id === id &&
              spot.source === 'user' &&
              (spot.submissionStatus === undefined || spot.submissionStatus === 'local')
                ? { ...spot, submissionStatus: 'pending_review' }
                : spot
            )
          );

          return { success: true, mode: 'local' as const };
        }

        try {
          await submitSpotForReviewToCloud(targetSpot);
          setUserCreatedSpots((current) =>
            current.map((spot) =>
              spot.id === id &&
              spot.source === 'user' &&
              (spot.submissionStatus === undefined || spot.submissionStatus === 'local')
                ? { ...spot, submissionStatus: 'pending_review' }
                : spot
            )
          );

          return { success: true, mode: 'cloud' as const };
        } catch (error) {
          console.warn('[PetMapStore][submitSpotForReview] failed:', error);

          return {
            success: false,
            mode: 'cloud' as const,
            error: error instanceof Error ? error.message : '提交失败，请稍后重试',
          };
        }
      },
      setSelectedSpot: (id: string) => {
        setSelectedSpotId(id);
        addRecentViewed(id);
      },
      clearSelectedSpot: () => setSelectedSpotId(null),
      toggleFavorite: (id: string) =>
        setFavoriteIds((current) =>
          current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        ),
      addRecentViewed,
      setSearchQuery,
      setSelectedTag,
      setSelectedSpotType,
      setShowFavoritesOnly,
      setShowUserOnly,
      setSortMode,
      resetExploreFilters: () => {
        setSearchQuery('');
        setSelectedTag(null);
        setSelectedSpotType(null);
        setShowFavoritesOnly(false);
        setShowUserOnly(false);
        setSortMode('popular');
      },
      setUserLoc,
      isFavorite,
    };
  }, [
    hasHydratedStorage,
    hasLoadedRemoteSpots,
    favoriteIds,
    recentViewedIds,
    searchQuery,
    selectedSpotId,
    selectedTag,
    selectedSpotType,
    showFavoritesOnly,
    showUserOnly,
    sortMode,
    formattedAddressBySpotId,
    systemSpots,
    userLoc,
    userCreatedSpots,
  ]);

  return <PetMapContext.Provider value={value}>{children}</PetMapContext.Provider>;
}

export function usePetMapStore() {
  const context = useContext(PetMapContext);

  if (!context) {
    throw new Error('usePetMapStore must be used within a PetMapProvider');
  }

  return context;
}

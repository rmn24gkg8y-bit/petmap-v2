import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { mockSpots } from '@/repo/spotsRepo';
import {
  loadFavoriteIds,
  loadRecentViewedIds,
  loadUserCreatedSpots,
  saveFavoriteIds,
  saveRecentViewedIds,
  saveUserCreatedSpots,
} from '@/repo/storageRepo';
import type { Spot } from '@/types/spot';
import { getDistanceMeters } from '@/utils/distance';

type SortMode = 'popular' | 'name' | 'distance';
type UserLoc = { lat: number; lng: number } | null;

type PetMapStoreValue = {
  spots: Spot[];
  selectedSpotId: string | null;
  favoriteIds: string[];
  recentViewedIds: string[];
  searchQuery: string;
  selectedTag: string | null;
  showFavoritesOnly: boolean;
  showUserOnly: boolean;
  sortMode: SortMode;
  userLoc: UserLoc;
  selectedSpot: Spot | null;
  userSpots: Spot[];
  recentViewedSpots: Spot[];
  allTags: string[];
  filteredSpots: Spot[];
  totalSpots: number;
  favoriteCount: number;
  addSpot: (spot: Spot) => void;
  updateSpot: (spot: Spot) => void;
  removeSpot: (id: string) => void;
  setSelectedSpot: (id: string) => void;
  clearSelectedSpot: () => void;
  toggleFavorite: (id: string) => void;
  addRecentViewed: (id: string) => void;
  setSearchQuery: (value: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setShowFavoritesOnly: (value: boolean) => void;
  setShowUserOnly: (value: boolean) => void;
  setSortMode: (mode: SortMode) => void;
  resetExploreFilters: () => void;
  setUserLoc: (loc: UserLoc) => void;
  isFavorite: (id: string) => boolean;
};

const PetMapContext = createContext<PetMapStoreValue | undefined>(undefined);

export function PetMapProvider({ children }: PropsWithChildren) {
  const [userCreatedSpots, setUserCreatedSpots] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentViewedIds, setRecentViewedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUserOnly, setShowUserOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [userLoc, setUserLoc] = useState<UserLoc>(null);
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateStorage() {
      const [storedFavoriteIds, storedRecentViewedIds, storedUserCreatedSpots] = await Promise.all([
        loadFavoriteIds(),
        loadRecentViewedIds(),
        loadUserCreatedSpots(),
      ]);

      if (!isMounted) {
        return;
      }

      setFavoriteIds(storedFavoriteIds);
      setRecentViewedIds(storedRecentViewedIds);
      setUserCreatedSpots(storedUserCreatedSpots);
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

  const value = useMemo(() => {
    const spots = [...mockSpots, ...userCreatedSpots];
    const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) ?? null;
    const userSpots = spots.filter((spot) => spot.source === 'user');
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
    const filteredSpots = [...filteredByTag].sort((a, b) => {
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
      spots,
      selectedSpotId,
      favoriteIds,
      recentViewedIds,
      searchQuery,
      selectedTag,
      showFavoritesOnly,
      showUserOnly,
      sortMode,
      userLoc,
      selectedSpot,
      userSpots,
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
      setShowFavoritesOnly,
      setShowUserOnly,
      setSortMode,
      resetExploreFilters: () => {
        setSearchQuery('');
        setSelectedTag(null);
        setShowFavoritesOnly(false);
        setShowUserOnly(false);
        setSortMode('popular');
      },
      setUserLoc,
      isFavorite,
    };
  }, [
    favoriteIds,
    recentViewedIds,
    searchQuery,
    selectedSpotId,
    selectedTag,
    showFavoritesOnly,
    showUserOnly,
    sortMode,
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

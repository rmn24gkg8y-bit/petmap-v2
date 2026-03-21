import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  fetchSpotsFromSupabase,
  getFallbackSystemSpots,
} from '@/repo/cloudSpotsRepo';
import { PLATFORM_INBOX_MESSAGES } from '@/constants/inbox';
import {
  fetchSubmissionReviewStatusesBySpotIds,
  submitSpotToSupabase,
} from '@/repo/cloudSubmissionRepo';
import {
  loadFormattedAddressBySpotId,
  loadFeedbackRecords,
  loadFavoriteIds,
  loadInboxReadAtByMessageId,
  loadNotifiedReviewStateBySpotId,
  loadRecentViewedIds,
  loadReviewNotifications,
  loadUserCreatedSpots,
  saveFormattedAddressBySpotId,
  saveFeedbackRecords,
  saveFavoriteIds,
  saveInboxReadAtByMessageId,
  saveNotifiedReviewStateBySpotId,
  saveRecentViewedIds,
  saveReviewNotifications,
  saveUserCreatedSpots,
} from '@/repo/storageRepo';
import type { FeedbackRecord, InboxItem, SpotReviewNotification } from '@/types/inbox';
import type { Spot } from '@/types/spot';
import { getDistanceMeters } from '@/utils/distance';

type SortMode = 'popular' | 'name' | 'distance';
type UserLoc = { lat: number; lng: number } | null;

function buildInitialFeedbackLifecycle(feedbackType: FeedbackRecord['feedbackType']): Pick<
  FeedbackRecord,
  'status' | 'reply'
> {
  const now = new Date().toISOString();

  if (feedbackType === 'bug') {
    return {
      status: 'in_progress',
    };
  }

  if (feedbackType === 'product') {
    return {
      status: 'replied',
      reply: {
        content: '这条建议已经收到，我们会结合 PetMap 当前阶段继续评估，后续会优先吸收适合前台主流程的改进方向。',
        repliedAt: now,
      },
    };
  }

  return {
    status: 'received',
  };
}

type PetMapStoreValue = {
  hasHydratedStorage: boolean;
  hasLoadedRemoteSpots: boolean;
  spots: Spot[];
  selectedSpotId: string | null;
  favoriteIds: string[];
  recentViewedIds: string[];
  searchQuery: string;
  selectedTags: string[];
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
  feedbackRecords: FeedbackRecord[];
  inboxItems: InboxItem[];
  hasUnreadInboxItems: boolean;
  addSpot: (spot: Spot) => void;
  addSystemSpot: (spot: Spot) => void;
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
  toggleSelectedTag: (tag: string) => void;
  clearSelectedTags: () => void;
  setSelectedSpotType: (spotType: Spot['spotType'] | null) => void;
  setShowFavoritesOnly: (value: boolean) => void;
  setShowUserOnly: (value: boolean) => void;
  setSortMode: (mode: SortMode) => void;
  resetExploreFilters: () => void;
  setUserLoc: (loc: UserLoc) => void;
  isFavorite: (id: string) => boolean;
  isInboxItemRead: (id: string) => boolean;
  markInboxItemAsRead: (id: string) => void;
  markAllInboxItemsAsRead: () => void;
  addFeedbackRecord: (
    record: Omit<FeedbackRecord, 'id' | 'sourceType' | 'createdAt' | 'status' | 'reply'>
  ) => void;
  syncPendingSpotReviews: (opts?: { force?: boolean }) => Promise<void>;
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
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackRecord[]>([]);
  const [reviewNotifications, setReviewNotifications] = useState<SpotReviewNotification[]>([]);
  const [inboxReadAtByMessageId, setInboxReadAtByMessageId] = useState<Record<string, string>>({});
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentViewedIds, setRecentViewedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSpotType, setSelectedSpotType] = useState<Spot['spotType'] | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUserOnly, setShowUserOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [userLoc, setUserLoc] = useState<UserLoc>(null);
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);

  // Guards for syncPendingSpotReviews: prevent concurrent calls and rapid re-firing.
  const isSyncingReviewsRef = useRef(false);
  const lastSyncReviewsAtRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSystemSpots() {
      try {
        const remoteSpots = await fetchSpotsFromSupabase();

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
        storedFeedbackRecords,
        storedInboxReadAtByMessageId,
        storedReviewNotifications,
        storedNotifiedReviewStateBySpotId,
      ] = await Promise.all([
        loadFavoriteIds(),
        loadRecentViewedIds(),
        loadUserCreatedSpots(),
        loadFormattedAddressBySpotId(),
        loadFeedbackRecords(),
        loadInboxReadAtByMessageId(),
        loadReviewNotifications(),
        loadNotifiedReviewStateBySpotId(),
      ]);

      if (!isMounted) {
        return;
      }

      // Step 1: normalize submissionStatus for legacy spots
      let normalizedUserSpots = storedUserCreatedSpots.map((spot) =>
        spot.source === 'user' && spot.submissionStatus === undefined
          ? { ...spot, submissionStatus: 'local' as const }
          : spot
      );

      // Step 2: sync review statuses from Supabase for pending_review spots
      const pendingSpotIds = normalizedUserSpots
        .filter((s) => s.submissionStatus === 'pending_review')
        .map((s) => s.id);

      let pendingReviewNotifications = storedReviewNotifications;

      if (pendingSpotIds.length > 0) {
        try {
          const reviewStatuses = await fetchSubmissionReviewStatusesBySpotIds(pendingSpotIds);

          if (!isMounted) {
            return;
          }

          const statusMap = new Map(reviewStatuses.map((r) => [r.spot_id, r]));
          const newNotifiedState = { ...storedNotifiedReviewStateBySpotId };
          const newNotifications: SpotReviewNotification[] = [];

          normalizedUserSpots = normalizedUserSpots.map((spot) => {
            const entry = statusMap.get(spot.id);
            const rs = entry?.review_status;

            if (!rs || rs === 'pending') return spot;

            if (rs === 'approved') {
              if (newNotifiedState[spot.id] !== 'approved') {
                newNotifiedState[spot.id] = 'approved';
                newNotifications.push({
                  id: `review-${spot.id}-approved`,
                  sourceType: 'review',
                  reviewResult: 'approved',
                  title: '地点审核已通过',
                  content: `你提交的地点「${spot.name}」已通过审核，现已发布到地图。`,
                  createdAt: new Date().toISOString(),
                  spotId: spot.id,
                  spotName: spot.name,
                });
              }
              return { ...spot, verified: true, reviewNote: undefined };
            }

            // rejected → reset to local so user can edit and re-submit
            const reviewNote = entry?.review_note ?? undefined;
            if (newNotifiedState[spot.id] !== 'rejected') {
              newNotifiedState[spot.id] = 'rejected';
              const noteText = reviewNote
                ? `你提交的地点「${spot.name}」未通过审核：${reviewNote}`
                : `你提交的地点「${spot.name}」未通过审核，请补充信息后重新提交。`;
              newNotifications.push({
                id: `review-${spot.id}-rejected`,
                sourceType: 'review',
                reviewResult: 'rejected',
                title: '地点审核未通过',
                content: noteText,
                createdAt: new Date().toISOString(),
                spotId: spot.id,
                spotName: spot.name,
              });
            }
            return {
              ...spot,
              submissionStatus: 'local' as const,
              verified: false,
              reviewNote,
            };
          });

          if (newNotifications.length > 0) {
            pendingReviewNotifications = [...newNotifications, ...storedReviewNotifications];
            saveReviewNotifications(pendingReviewNotifications);
            saveNotifiedReviewStateBySpotId(newNotifiedState);
          }
        } catch (err) {
          console.error('[PetMapStore][hydrate] review status sync failed:', err);
        }
      }

      setFavoriteIds(storedFavoriteIds);
      setRecentViewedIds(storedRecentViewedIds);
      setUserCreatedSpots(normalizedUserSpots);
      setFormattedAddressBySpotId((current) => ({
        ...storedFormattedAddressBySpotId,
        ...current,
      }));
      setFeedbackRecords(storedFeedbackRecords);
      setReviewNotifications(pendingReviewNotifications);
      setInboxReadAtByMessageId(storedInboxReadAtByMessageId);
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

    saveFormattedAddressBySpotId(formattedAddressBySpotId);
  }, [formattedAddressBySpotId, hasHydratedStorage]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    saveFeedbackRecords(feedbackRecords);
  }, [feedbackRecords, hasHydratedStorage]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    saveInboxReadAtByMessageId(inboxReadAtByMessageId);
  }, [hasHydratedStorage, inboxReadAtByMessageId]);

  const value = useMemo(() => {
    // IDs present in the authoritative system spots list
    const systemSpotIds = new Set(systemSpots.map((s) => s.id));

    // User spots whose IDs have been promoted into systemSpots (= approved / published)
    const publishedUserSpotIds = new Set(
      userCreatedSpots.filter((s) => systemSpotIds.has(s.id)).map((s) => s.id)
    );

    const spots = [
      // System spots: exclude IDs that are also in userCreatedSpots to avoid duplicates
      ...systemSpots
        .filter((spot) => !publishedUserSpotIds.has(spot.id))
        .map((spot) =>
          formattedAddressBySpotId[spot.id]
            ? { ...spot, formattedAddress: formattedAddressBySpotId[spot.id] }
            : spot
        ),
      // User spots: if already in systemSpots, mark verified so My Spots shows "已发布"
      ...userCreatedSpots.map((spot) => {
        const withAddress =
          spot.formattedAddress || !formattedAddressBySpotId[spot.id]
            ? spot
            : { ...spot, formattedAddress: formattedAddressBySpotId[spot.id] };

        return publishedUserSpotIds.has(spot.id)
          ? { ...withAddress, verified: true }
          : withAddress;
      }),
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
      selectedTags.length === 0
        ? filteredBySource
        : filteredBySource.filter((spot) =>
            selectedTags.every((tag) => spot.tags.includes(tag))
          );
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
    const inboxItems = [...feedbackRecords, ...reviewNotifications, ...PLATFORM_INBOX_MESSAGES].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const isInboxItemRead = (id: string) => typeof inboxReadAtByMessageId[id] === 'string';
    const hasUnreadInboxItems = inboxItems.some((item) => !isInboxItemRead(item.id));

    return {
      hasHydratedStorage,
      hasLoadedRemoteSpots,
      spots,
      selectedSpotId,
      favoriteIds,
      recentViewedIds,
      searchQuery,
      selectedTags,
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
      feedbackRecords,
      inboxItems,
      hasUnreadInboxItems,
      addSpot: (spot: Spot) => {
        setUserCreatedSpots((current) => [...current, spot]);
      },
      addSystemSpot: (spot: Spot) => {
        setSystemSpots((current) => [spot, ...current]);
      },
      updateSpot: (spot: Spot) => {
        if (spot.source === 'system') {
          setSystemSpots((current) =>
            current.map((item) => (item.id === spot.id ? spot : item))
          );
          return;
        }

        setUserCreatedSpots((current) =>
          current.map((item) => (item.id === spot.id ? spot : item))
        );
      },
      removeSpot: (id: string) => {
        setSystemSpots((current) => current.filter((spot) => spot.id !== id));
        setUserCreatedSpots((current) => current.filter((spot) => spot.id !== id));
        setSelectedSpotId((current) => (current === id ? null : current));
        setFavoriteIds((current) => current.filter((item) => item !== id));
        setRecentViewedIds((current) => current.filter((item) => item !== id));
        setFormattedAddressBySpotId((current) => {
          if (!current[id]) {
            return current;
          }
          const next = { ...current };
          delete next[id];
          return next;
        });
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

          return { ...current, [id]: nextValue };
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

        try {
          await submitSpotToSupabase(targetSpot);
          setUserCreatedSpots((current) =>
            current.map((spot) =>
              spot.id === id &&
              spot.source === 'user' &&
              (spot.submissionStatus === undefined || spot.submissionStatus === 'local')
                ? { ...spot, submissionStatus: 'pending_review', reviewNote: undefined }
                : spot
            )
          );

          return { success: true, mode: 'cloud' as const };
        } catch (error) {
          console.error('[PetMapStore][submitSpotForReview] Supabase error:', error);

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
      toggleSelectedTag: (tag: string) =>
        setSelectedTags((current) =>
          current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
        ),
      clearSelectedTags: () => setSelectedTags([]),
      setSelectedSpotType,
      setShowFavoritesOnly,
      setShowUserOnly,
      setSortMode,
      resetExploreFilters: () => {
        setSearchQuery('');
        setSelectedTags([]);
        setSelectedSpotType(null);
        setShowFavoritesOnly(false);
        setShowUserOnly(false);
        setSortMode('popular');
      },
      setUserLoc,
      isFavorite,
      isInboxItemRead,
      markInboxItemAsRead: (id: string) => {
        setInboxReadAtByMessageId((current) => {
          if (current[id]) {
            return current;
          }

          return {
            ...current,
            [id]: new Date().toISOString(),
          };
        });
      },
      markAllInboxItemsAsRead: () => {
        const now = new Date().toISOString();

        setInboxReadAtByMessageId((current) => {
          const unreadItems = inboxItems.filter((item) => !current[item.id]);

          if (unreadItems.length === 0) {
            return current;
          }

          const nextReadMap = { ...current };

          for (const item of unreadItems) {
            nextReadMap[item.id] = now;
          }

          return nextReadMap;
        });
      },
      addFeedbackRecord: (
        record: Omit<FeedbackRecord, 'id' | 'sourceType' | 'createdAt' | 'status' | 'reply'>
      ) => {
        const createdAt = new Date().toISOString();
        const lifecycle = buildInitialFeedbackLifecycle(record.feedbackType);

        setFeedbackRecords((current) => [
          {
            id: `feedback-${Date.now()}`,
            sourceType: 'feedback',
            feedbackType: record.feedbackType,
            title: record.title,
            content: record.content,
            createdAt,
            status: lifecycle.status,
            reply: lifecycle.reply,
            contextType: record.contextType,
            spotId: record.spotId,
            spotName: record.spotName,
            activityKey: record.activityKey,
            activityTitle: record.activityTitle,
          },
          ...current,
        ]);
      },
      syncPendingSpotReviews: async (opts?: { force?: boolean }) => {
        // In-flight guard: prevent concurrent calls regardless of force flag.
        if (isSyncingReviewsRef.current) {
          return;
        }

        // Cooldown: skip if called within 30s, unless force=true (manual pull-to-refresh).
        const now = Date.now();
        if (!opts?.force && now - lastSyncReviewsAtRef.current < 30_000) {
          return;
        }

        const pendingIds = userCreatedSpots
          .filter((s) => s.submissionStatus === 'pending_review')
          .map((s) => s.id);

        if (pendingIds.length === 0) {
          return;
        }

        isSyncingReviewsRef.current = true;
        lastSyncReviewsAtRef.current = now;

        try {
          const statuses = await fetchSubmissionReviewStatusesBySpotIds(pendingIds);
          const statusMap = new Map(statuses.map((r) => [r.spot_id, r]));

          setUserCreatedSpots((current) =>
            current.map((spot) => {
              const entry = statusMap.get(spot.id);
              const rs = entry?.review_status;

              if (!rs || rs === 'pending') {
                return spot;
              }

              if (rs === 'approved') {
                return { ...spot, verified: true, reviewNote: undefined };
              }

              // rejected
              return {
                ...spot,
                submissionStatus: 'local' as const,
                verified: false,
                reviewNote: entry?.review_note ?? undefined,
              };
            })
          );
        } catch (err) {
          console.error('[PetMapStore][syncPendingSpotReviews] failed:', err);
        } finally {
          isSyncingReviewsRef.current = false;
        }
      },
    };
  }, [
    hasHydratedStorage,
    hasLoadedRemoteSpots,
    favoriteIds,
    recentViewedIds,
    searchQuery,
    selectedSpotId,
    selectedTags,
    selectedSpotType,
    showFavoritesOnly,
    showUserOnly,
    sortMode,
    feedbackRecords,
    reviewNotifications,
    inboxReadAtByMessageId,
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

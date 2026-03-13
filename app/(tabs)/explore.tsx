import { router } from 'expo-router';
import { type ComponentProps, useMemo, useState } from 'react';
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

import {
  SPOT_TYPE_LABELS,
  SPOT_TYPE_OPTIONS,
} from '@/constants/spotFormOptions';
import { getSpotIdentityBadge } from '@/constants/spotIdentity';
import {
  EmptyStateCard,
  PrimaryButton,
  SectionHeader,
  StatusBadge,
  TagChip,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

const PET_FRIENDLY_LABELS = {
  high: '宠物友好高',
  medium: '宠物友好中',
  low: '宠物友好待确认',
} as const;

const SORT_OPTIONS = [
  { label: '热门', value: 'popular' as const },
  { label: '名称', value: 'name' as const },
  { label: '距离', value: 'distance' as const },
];

type ExploreSpot = ReturnType<typeof usePetMapStore>['filteredSpots'][number];
type ExploreBadge = {
  label: string;
  variant: ComponentProps<typeof StatusBadge>['variant'];
};

function getExploreStatusBadge(spot: ExploreSpot) {
  if (spot.submissionStatus === 'pending_review') {
    return { label: '审核中', variant: 'pending' as const };
  }

  if (spot.verified) {
    return { label: '已发布', variant: 'favorite' as const };
  }

  if (spot.source === 'user') {
    return { label: '待提交', variant: 'local' as const };
  }

  return null;
}

function ExploreSpotCard({
  spot,
  address,
  description,
  badges,
  tags,
  distanceText,
  heatText,
  onPress,
}: {
  spot: ExploreSpot;
  address: string;
  description?: string;
  badges: ExploreBadge[];
  tags: string[];
  distanceText: string;
  heatText: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.spotCard}>
      <View style={styles.spotCardTop}>
        {spot.photoUris?.[0] ? (
          <Image source={{ uri: spot.photoUris[0] }} style={styles.spotImage} />
        ) : (
          <View style={styles.spotImagePlaceholder}>
            <Text style={styles.spotImagePlaceholderText}>暂无图片</Text>
          </View>
        )}

        <View style={styles.spotMeta}>
          <View style={styles.spotHeaderRow}>
            <Text style={styles.spotTitle} numberOfLines={1}>
              {spot.name}
            </Text>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{distanceText}</Text>
            </View>
          </View>

          <Text style={styles.spotAddress} numberOfLines={1}>
            {address}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{heatText}</Text>
            {spot.petFriendlyLevel ? (
              <Text style={styles.metaText}>{PET_FRIENDLY_LABELS[spot.petFriendlyLevel]}</Text>
            ) : null}
          </View>

          {description ? (
            <Text style={styles.spotDescription} numberOfLines={1}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.spotFooter}>
        {badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((badge) => (
              <StatusBadge key={`${spot.id}-${badge.label}`} label={badge.label} variant={badge.variant} />
            ))}
          </View>
        ) : null}

        {tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <TagChip key={`${spot.id}-${tag}`} label={tag} compact />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

type ExploreListItem =
  | { type: 'sticky'; key: 'sticky' }
  | {
      type: 'spot';
      key: string;
      spot: ExploreSpot;
    };

export default function ExploreScreen() {
  const {
    filteredSpots,
    allTags,
    searchQuery,
    selectedTags,
    selectedSpotType,
    showFavoritesOnly,
    showUserOnly,
    sortMode,
    userLoc,
    setSelectedSpot,
    setSearchQuery,
    toggleSelectedTag,
    clearSelectedTags,
    setSelectedSpotType,
    setShowFavoritesOnly,
    setShowUserOnly,
    setSortMode,
    resetExploreFilters,
    isFavorite,
    recentViewedSpots,
  } = usePetMapStore();
  const [openMenu, setOpenMenu] = useState<'sort' | 'type' | null>(null);

  const listData = useMemo<ExploreListItem[]>(
    () => [
      { type: 'sticky', key: 'sticky' },
      ...filteredSpots.map((spot) => ({
        type: 'spot' as const,
        key: spot.id,
        spot,
      })),
    ],
    [filteredSpots]
  );

  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? '热门';
  const selectedTypeLabel = selectedSpotType ? SPOT_TYPE_LABELS[selectedSpotType] : '全部';

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    setOpenMenu(null);
    router.navigate('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionHeader eyebrow="发现地点" title="Explore" style={styles.sectionHeader} />

            <View style={styles.searchRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="搜索地点、区域或标签"
                style={styles.searchInput}
                onFocus={() => setOpenMenu(null)}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                  <Text style={styles.clearSearchButtonText}>清空</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListFooterComponent={
          filteredSpots.length === 0 ? (
            <EmptyStateCard
              title="暂时没有符合条件的地点"
              description="试试更换关键词、标签，或者直接清除筛选。"
              hint={showUserOnly ? '还没有你添加的地点' : undefined}
              action={<PrimaryButton label="清除筛选" onPress={resetExploreFilters} />}
            />
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === 'sticky') {
            return (
              <View style={styles.stickyBar}>
                <View style={styles.toolbarRow}>
                  <View style={styles.toolbarGroup}>
                    <Text style={styles.sectionLabel}>来源</Text>
                    <View style={styles.toolbarOptions}>
                      <TagChip label="全部" compact active={!showUserOnly} onPress={() => setShowUserOnly(false)} />
                      <TagChip
                        label="我添加的"
                        compact
                        active={showUserOnly}
                        onPress={() => setShowUserOnly(true)}
                      />
                    </View>
                  </View>

                  <View style={styles.toolbarGroup}>
                    <Text style={styles.sectionLabel}>范围</Text>
                    <View style={styles.toolbarOptions}>
                      <TagChip
                        label="全部"
                        compact
                        active={!showFavoritesOnly}
                        onPress={() => setShowFavoritesOnly(false)}
                      />
                      <TagChip
                        label="已收藏"
                        compact
                        active={showFavoritesOnly}
                        onPress={() => setShowFavoritesOnly(true)}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.recentSection}>
                  <Text style={styles.sectionLabel}>最近看过</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentContent}>
                    {recentViewedSpots.length > 0 ? (
                      recentViewedSpots.map((spot) => (
                        <Pressable
                          key={spot.id}
                          onPress={() => handleSelectSpot(spot.id)}
                          style={styles.recentItem}>
                          <Text style={styles.recentItemText} numberOfLines={1}>
                            {spot.name}
                          </Text>
                        </Pressable>
                      ))
                    ) : (
                      <View style={styles.recentEmptyChip}>
                        <Text style={styles.recentEmptyText}>还没有最近看过</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>

                <View style={styles.selectorSection}>
                  <View style={styles.selectorRow}>
                    <View style={styles.selectorColumn}>
                      <Text style={styles.sectionLabel}>排序</Text>
                      <Pressable
                        onPress={() => setOpenMenu((current) => (current === 'sort' ? null : 'sort'))}
                        style={[
                          styles.selectorButton,
                          openMenu === 'sort' ? styles.selectorButtonActive : null,
                        ]}>
                        <Text style={styles.selectorButtonText}>{selectedSortLabel}</Text>
                        <Text style={styles.selectorChevron}>{openMenu === 'sort' ? '▲' : '▼'}</Text>
                      </Pressable>
                    </View>

                    <View style={styles.selectorColumn}>
                      <Text style={styles.sectionLabel}>类型</Text>
                      <Pressable
                        onPress={() => setOpenMenu((current) => (current === 'type' ? null : 'type'))}
                        style={[
                          styles.selectorButton,
                          openMenu === 'type' ? styles.selectorButtonActive : null,
                        ]}>
                        <Text style={styles.selectorButtonText} numberOfLines={1}>
                          {selectedTypeLabel}
                        </Text>
                        <Text style={styles.selectorChevron}>{openMenu === 'type' ? '▲' : '▼'}</Text>
                      </Pressable>
                    </View>
                  </View>

                  {openMenu === 'sort' ? (
                    <View style={[styles.dropdownMenu, styles.dropdownMenuLeft]}>
                      {SORT_OPTIONS.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            setSortMode(option.value);
                            setOpenMenu(null);
                          }}
                          style={[
                            styles.dropdownItem,
                            sortMode === option.value ? styles.dropdownItemActive : null,
                          ]}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              sortMode === option.value ? styles.dropdownItemTextActive : null,
                            ]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  {openMenu === 'type' ? (
                    <View style={[styles.dropdownMenu, styles.dropdownMenuRight]}>
                      <Pressable
                        onPress={() => {
                          setSelectedSpotType(null);
                          setOpenMenu(null);
                        }}
                        style={[
                          styles.dropdownItem,
                          selectedSpotType === null ? styles.dropdownItemActive : null,
                        ]}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedSpotType === null ? styles.dropdownItemTextActive : null,
                          ]}>
                          全部
                        </Text>
                      </Pressable>

                      {SPOT_TYPE_OPTIONS.map((spotType) => (
                        <Pressable
                          key={spotType}
                          onPress={() => {
                            setSelectedSpotType(spotType);
                            setOpenMenu(null);
                          }}
                          style={[
                            styles.dropdownItem,
                            selectedSpotType === spotType ? styles.dropdownItemActive : null,
                          ]}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedSpotType === spotType ? styles.dropdownItemTextActive : null,
                            ]}>
                            {SPOT_TYPE_LABELS[spotType]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.tagsSection}>
                  <View style={styles.tagsHeader}>
                    <Text style={styles.sectionLabel}>标签</Text>
                    {selectedTags.length > 0 ? (
                      <Pressable onPress={clearSelectedTags} style={styles.clearAllButton}>
                        <Text style={styles.clearAllButtonText}>清空</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}>
                    <Pressable onPress={clearSelectedTags}>
                      <TagChip label="全部" active={selectedTags.length === 0} />
                    </Pressable>

                    {allTags.map((tag) => (
                      <Pressable key={tag} onPress={() => toggleSelectedTag(tag)}>
                        <TagChip label={tag} active={selectedTags.includes(tag)} />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            );
          }

          const spot = item.spot;
          const identityBadge = getSpotIdentityBadge(spot);
          const statusBadge = getExploreStatusBadge(spot);
          const displayAddress =
            spot.formattedAddress?.trim() ||
            [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
            '地址待补充';
          const badges = [
            { label: identityBadge.label, variant: identityBadge.variant },
            ...(statusBadge ? [statusBadge] : []),
            ...(isFavorite(spot.id) ? [{ label: '已收藏', variant: 'favorite' as const }] : []),
          ].filter(
            (badge, index, source) =>
              source.findIndex((item) => item.label === badge.label && item.variant === badge.variant) === index
          ).slice(0, 2);
          const distanceText = userLoc
            ? formatDistance(getDistanceMeters(userLoc, { lat: spot.lat, lng: spot.lng }))
            : '距离未知';
          const heatText = `${spot.votes} 热度`;

          return (
            <ExploreSpotCard
              spot={spot}
              address={displayAddress}
              badges={badges}
              tags={spot.tags.slice(0, 2)}
              description={spot.description?.trim()}
              distanceText={distanceText}
              heatText={heatText}
              onPress={() => handleSelectSpot(spot.id)}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + theme.spacing.sm,
    flexGrow: 1,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  sectionHeader: {
    marginBottom: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm - 2,
    marginTop: theme.spacing.sm + 2,
  },
  searchInput: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  clearSearchButton: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.chipBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearSearchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stickyBar: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFFF5',
    padding: 14,
    gap: 14,
    ...theme.shadows.card,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toolbarGroup: {
    flex: 1,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  toolbarOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  recentSection: {
    gap: 8,
  },
  recentContent: {
    gap: 8,
    paddingBottom: 2,
  },
  recentItem: {
    maxWidth: 180,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recentItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  recentEmptyChip: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recentEmptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  selectorSection: {
    position: 'relative',
    gap: 8,
    zIndex: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorColumn: {
    flex: 1,
    gap: 6,
  },
  selectorButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectorButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  selectorButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  selectorChevron: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 66,
    width: '48%',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: 6,
    ...theme.shadows.card,
  },
  dropdownMenuLeft: {
    left: 0,
  },
  dropdownMenuRight: {
    right: 0,
  },
  dropdownItem: {
    borderRadius: theme.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  dropdownItemText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  tagsSection: {
    gap: 8,
  },
  tagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  clearAllButton: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterScrollContent: {
    gap: theme.spacing.xs,
    paddingBottom: 2,
  },
  spotCard: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
    ...theme.shadows.card,
  },
  spotCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  spotImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceMuted,
  },
  spotImagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  spotImagePlaceholderText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  spotMeta: {
    flex: 1,
    gap: 4,
  },
  spotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  spotTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  metaPill: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  spotAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  spotDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  spotFooter: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
});

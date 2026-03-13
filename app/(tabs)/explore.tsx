import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  SPOT_TYPE_LABELS,
  SPOT_TYPE_OPTIONS,
} from '@/constants/spotFormOptions';
import { getSpotIdentityBadge } from '@/constants/spotIdentity';
import {
  EmptyStateCard,
  PrimaryButton,
  SectionHeader,
  SpotCard,
  StatusBadge,
  TagChip,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

const SORT_MODE_LABELS = {
  popular: '热门推荐',
  name: '名称排序',
  distance: '距离优先',
} as const;

const PET_FRIENDLY_LABELS = {
  high: '宠物友好高',
  medium: '宠物友好中',
  low: '宠物友好待确认',
} as const;

function getExploreStatusBadge(
  spot: ReturnType<typeof usePetMapStore>['filteredSpots'][number]
) {
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

type ExploreListItem =
  | { type: 'sticky'; key: 'sticky' }
  | { type: 'aux'; key: 'aux' }
  | {
      type: 'spot';
      key: string;
      spot: ReturnType<typeof usePetMapStore>['filteredSpots'][number];
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
  const [isTagExpanded, setIsTagExpanded] = useState(false);

  const listData = useMemo<ExploreListItem[]>(
    () => [
      { type: 'sticky', key: 'sticky' },
      { type: 'aux', key: 'aux' },
      ...filteredSpots.map((spot) => ({
        type: 'spot' as const,
        key: spot.id,
        spot,
      })),
    ],
    [filteredSpots]
  );
  const selectedSpotTypeLabel = selectedSpotType ? SPOT_TYPE_LABELS[selectedSpotType] : '全部类型';
  const selectedTagsLabel = selectedTags.length === 0 ? '全部标签' : selectedTags.join(' + ');
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedTags.length > 0 ||
    selectedSpotType !== null ||
    showFavoritesOnly ||
    showUserOnly ||
    sortMode !== 'popular';

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    router.navigate('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        stickyHeaderIndices={[1]}
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
                <View style={styles.stickyControls}>
                  <View style={styles.stickyRow}>
                    <Text style={styles.stickyLabel}>来源</Text>
                    <TagChip label="全部" compact active={!showUserOnly} onPress={() => setShowUserOnly(false)} />
                    <TagChip
                      label="我添加的"
                      compact
                      active={showUserOnly}
                      onPress={() => setShowUserOnly(true)}
                    />
                  </View>

                  <View style={styles.stickyRow}>
                    <Text style={styles.stickyLabel}>范围</Text>
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

                  <View style={styles.stickyRow}>
                    <Text style={styles.stickyLabel}>排序</Text>
                    <TagChip
                      label="热门"
                      compact
                      active={sortMode === 'popular'}
                      onPress={() => setSortMode('popular')}
                    />
                    <TagChip
                      label="名称"
                      compact
                      active={sortMode === 'name'}
                      onPress={() => setSortMode('name')}
                    />
                    <TagChip
                      label="距离"
                      compact
                      active={sortMode === 'distance'}
                      onPress={() => setSortMode('distance')}
                    />
                  </View>
                  <View style={styles.stickyRow}>
                    <Text style={styles.stickyLabel}>类型</Text>
                    <TagChip
                      label="全部"
                      compact
                      active={selectedSpotType === null}
                      onPress={() => setSelectedSpotType(null)}
                    />
                    {SPOT_TYPE_OPTIONS.map((spotType) => (
                      <TagChip
                        key={spotType}
                        label={SPOT_TYPE_LABELS[spotType]}
                        compact
                        active={selectedSpotType === spotType}
                        onPress={() => setSelectedSpotType(spotType)}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.stickyFooter}>
                  <Text style={styles.resultSummary}>
                    {SORT_MODE_LABELS[sortMode]} · {selectedSpotTypeLabel} · {selectedTagsLabel} · {filteredSpots.length} 个结果
                  </Text>
                  <View style={styles.stickyFooterActions}>
                    {hasActiveFilters ? (
                      <Pressable onPress={resetExploreFilters} style={styles.clearAllButton}>
                        <Text style={styles.clearAllButtonText}>清空筛选</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => setIsTagExpanded((current) => !current)}
                      style={styles.moreFilterButton}>
                      <Text style={styles.moreFilterButtonText}>
                        {isTagExpanded ? '收起标签' : '更多筛选'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }

          if (item.type === 'aux') {
            return (
              <View style={styles.auxSection}>
                {isTagExpanded ? (
                  <View style={styles.expandedTagSection}>
                    <Text style={styles.expandedTagTitle}>标签筛选</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagContent}>
                      <Pressable
                        onPress={clearSelectedTags}>
                        <TagChip label="全部" active={selectedTags.length === 0} />
                      </Pressable>

                      {allTags.map((tag) => (
                        <Pressable
                          key={tag}
                          onPress={() => toggleSelectedTag(tag)}>
                          <TagChip label={tag} active={selectedTags.includes(tag)} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {sortMode === 'distance' && !userLoc ? (
                  <Text style={styles.helperText}>暂未获取位置，已自动按热门排序</Text>
                ) : null}

                {recentViewedSpots.length > 0 ? (
                  <View style={styles.recentSection}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.recentContent}>
                      {recentViewedSpots.map((spot) => (
                        <Pressable
                          key={spot.id}
                          onPress={() => handleSelectSpot(spot.id)}
                          style={styles.recentItem}>
                          <Text style={styles.recentItemText} numberOfLines={1}>
                            {spot.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
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
          const quickFacts = [
            spot.petFriendlyLevel ? PET_FRIENDLY_LABELS[spot.petFriendlyLevel] : null,
            spot.priceLevel ? `价格 ${spot.priceLevel}` : null,
          ].filter((value): value is string => Boolean(value));

          return (
            <SpotCard
              title={spot.name}
              address={displayAddress}
              photoUri={spot.photoUris?.[0]}
              badges={
                <>
                  <StatusBadge
                    label={identityBadge.label}
                    variant={identityBadge.variant}
                  />
                  {statusBadge ? (
                    <StatusBadge
                      label={statusBadge.label}
                      variant={statusBadge.variant}
                    />
                  ) : null}
                  {isFavorite(spot.id) ? (
                    <StatusBadge
                      label="已收藏"
                      variant="favorite"
                    />
                  ) : null}
                </>
              }
              tags={spot.tags.slice(0, 3)}
              horizontalTags={spot.tags.length > 2}
              onPressTop={() => handleSelectSpot(spot.id)}
              onPressBottom={() => handleSelectSpot(spot.id)}
              description={spot.description}
              descriptionLines={2}
              footer={
                <View style={styles.cardFooter}>
                  <View style={styles.quickFactsRow}>
                    {quickFacts.length > 0 ? (
                      quickFacts.map((fact) => (
                        <Text key={fact} style={styles.quickFactChip}>
                          {fact}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.quickFactPlaceholder}>打开详情可查看更多信息</Text>
                    )}
                  </View>
                  <View style={styles.footerMetaRow}>
                    {userLoc ? (
                      <Text style={styles.distance}>
                        距离你约 {formatDistance(getDistanceMeters(userLoc, { lat: spot.lat, lng: spot.lng }))}
                      </Text>
                    ) : (
                      <Text style={styles.distancePlaceholder}>尚未获取位置</Text>
                    )}
                    <Text style={styles.votes}>{spot.votes} votes</Text>
                  </View>
                </View>
              }
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
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFFF2',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs + 2,
    ...theme.shadows.card,
  },
  stickyControls: {
    gap: 6,
  },
  stickyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  stickyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginRight: 2,
  },
  stickyFooter: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  stickyFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  resultSummary: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  moreFilterButton: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.chipBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  moreFilterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  clearAllButton: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearAllButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  expandedTagSection: {
    marginTop: 6,
  },
  expandedTagTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  tagContent: {
    gap: theme.spacing.xs,
    paddingBottom: 2,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  auxSection: {
    marginBottom: theme.spacing.xs,
    gap: 6,
  },
  recentSection: {
    marginTop: 2,
  },
  recentContent: {
    gap: 8,
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
  cardFooter: {
    marginTop: theme.spacing.sm + 2,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    gap: theme.spacing.sm,
  },
  quickFactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  quickFactChip: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  quickFactPlaceholder: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  distance: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  distancePlaceholder: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  votes: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
    selectedTag,
    showFavoritesOnly,
    showUserOnly,
    sortMode,
    userLoc,
    setSelectedSpot,
    setSearchQuery,
    setSelectedTag,
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
                </View>

                <View style={styles.stickyFooter}>
                  <Text style={styles.resultSummary}>
                    {SORT_MODE_LABELS[sortMode]} · {selectedTag ?? '全部标签'} · {filteredSpots.length} 个结果
                  </Text>
                  <Pressable
                    onPress={() => setIsTagExpanded((current) => !current)}
                    style={styles.moreFilterButton}>
                    <Text style={styles.moreFilterButtonText}>
                      {isTagExpanded ? '收起标签' : '更多筛选'}
                    </Text>
                  </Pressable>
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
                        onPress={() => setSelectedTag(null)}>
                        <TagChip label="全部" active={selectedTag === null} />
                      </Pressable>

                      {allTags.map((tag) => (
                        <Pressable
                          key={tag}
                          onPress={() => setSelectedTag(tag)}>
                          <TagChip label={tag} active={selectedTag === tag} />
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
          const displayAddress =
            spot.formattedAddress?.trim() ||
            [spot.district, spot.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
            '地址待补充';

          return (
            <SpotCard
              title={spot.name}
              address={displayAddress}
              photoUri={spot.photoUris?.[0]}
              badges={
                <>
                  <StatusBadge
                    label={isFavorite(spot.id) ? '已收藏' : '未收藏'}
                    variant={isFavorite(spot.id) ? 'favorite' : 'favoriteInactive'}
                  />
                  <StatusBadge
                    label={spot.source === 'user' ? '我添加的' : '系统收录'}
                    variant={spot.source === 'user' ? 'user' : 'system'}
                  />
                </>
              }
              tags={spot.tags}
              horizontalTags
              onPressTop={() => handleSelectSpot(spot.id)}
              onPressBottom={() => handleSelectSpot(spot.id)}
              description={spot.description}
              descriptionLines={2}
              footer={
                <View style={styles.cardFooter}>
                  {userLoc ? (
                    <Text style={styles.distance}>
                      距离你约 {formatDistance(getDistanceMeters(userLoc, { lat: spot.lat, lng: spot.lng }))}
                    </Text>
                  ) : (
                    <Text style={styles.distancePlaceholder}>尚未获取位置</Text>
                  )}
                  <Text style={styles.votes}>{spot.votes} votes</Text>
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
    marginBottom: 0,
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
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.sm,
    ...theme.shadows.card,
  },
  stickyControls: {
    gap: theme.spacing.xs,
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
    marginTop: theme.spacing.sm - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  resultSummary: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  moreFilterButton: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moreFilterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
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
    marginBottom: 6,
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
    paddingVertical: 8,
  },
  recentItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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

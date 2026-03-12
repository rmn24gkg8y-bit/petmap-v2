import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
            <Text style={styles.eyebrow}>发现地点</Text>
            <Text style={styles.title}>Explore</Text>

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
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>暂时没有符合条件的地点</Text>
              <Text style={styles.emptyDescription}>试试更换关键词、标签，或者直接清除筛选。</Text>
              {showUserOnly ? <Text style={styles.emptyHint}>还没有你添加的地点</Text> : null}
              <Pressable onPress={resetExploreFilters} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>清除筛选</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === 'sticky') {
            return (
              <View style={styles.stickyBar}>
                <View style={styles.stickyControls}>
                  <View style={styles.stickyRow}>
                    <Text style={styles.stickyLabel}>来源</Text>
                    <Pressable
                      onPress={() => setShowUserOnly(false)}
                      style={[
                        styles.stickyChip,
                        !showUserOnly ? styles.stickyChipActive : styles.stickyChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.stickyChipText,
                          !showUserOnly ? styles.stickyChipTextActive : styles.stickyChipTextInactive,
                        ]}>
                        全部
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowUserOnly(true)}
                      style={[
                        styles.stickyChip,
                        showUserOnly ? styles.stickyChipActive : styles.stickyChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.stickyChipText,
                          showUserOnly ? styles.stickyChipTextActive : styles.stickyChipTextInactive,
                        ]}>
                        我添加的
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.stickyRow}>
                    <Text style={styles.stickyLabel}>范围</Text>
                    <Pressable
                      onPress={() => setShowFavoritesOnly(false)}
                      style={[
                        styles.stickyChip,
                        !showFavoritesOnly ? styles.stickyChipActive : styles.stickyChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.stickyChipText,
                          !showFavoritesOnly
                            ? styles.stickyChipTextActive
                            : styles.stickyChipTextInactive,
                        ]}>
                        全部
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowFavoritesOnly(true)}
                      style={[
                        styles.stickyChip,
                        showFavoritesOnly ? styles.stickyChipActive : styles.stickyChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.stickyChipText,
                          showFavoritesOnly
                            ? styles.stickyChipTextActive
                            : styles.stickyChipTextInactive,
                        ]}>
                        已收藏
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.stickyRow}>
                    <Text style={styles.stickyLabel}>排序</Text>
                    <Pressable
                      onPress={() => setSortMode('popular')}
                      style={[
                        styles.stickyChip,
                        sortMode === 'popular' ? styles.stickyChipActive : styles.stickyChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.stickyChipText,
                          sortMode === 'popular'
                            ? styles.stickyChipTextActive
                            : styles.stickyChipTextInactive,
                        ]}>
                        热门
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSortMode('name')}
                      style={[
                        styles.stickyChip,
                        sortMode === 'name' ? styles.stickyChipActive : styles.stickyChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.stickyChipText,
                          sortMode === 'name'
                            ? styles.stickyChipTextActive
                            : styles.stickyChipTextInactive,
                        ]}>
                        名称
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSortMode('distance')}
                      style={[
                        styles.stickyChip,
                        sortMode === 'distance'
                          ? styles.stickyChipActive
                          : styles.stickyChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.stickyChipText,
                          sortMode === 'distance'
                            ? styles.stickyChipTextActive
                            : styles.stickyChipTextInactive,
                        ]}>
                        距离
                      </Text>
                    </Pressable>
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
                        onPress={() => setSelectedTag(null)}
                        style={[
                          styles.tagChip,
                          selectedTag === null ? styles.tagChipActive : styles.tagChipInactive,
                        ]}>
                        <Text
                          style={[
                            styles.tagChipText,
                            selectedTag === null
                              ? styles.tagChipTextActive
                              : styles.tagChipTextInactive,
                          ]}>
                          全部
                        </Text>
                      </Pressable>

                      {allTags.map((tag) => (
                        <Pressable
                          key={tag}
                          onPress={() => setSelectedTag(tag)}
                          style={[
                            styles.tagChip,
                            selectedTag === tag ? styles.tagChipActive : styles.tagChipInactive,
                          ]}>
                          <Text
                            style={[
                              styles.tagChipText,
                              selectedTag === tag
                                ? styles.tagChipTextActive
                                : styles.tagChipTextInactive,
                            ]}>
                            {tag}
                          </Text>
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
            <View style={styles.card}>
              <Pressable onPress={() => handleSelectSpot(spot.id)}>
                <View style={styles.cardTopRow}>
                  {spot.photoUris?.[0] ? (
                    <Image source={{ uri: spot.photoUris[0] }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Text style={styles.thumbnailPlaceholderText}>暂无图片</Text>
                    </View>
                  )}
                  <View style={styles.cardTopMeta}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.name}>{spot.name}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <Text style={styles.favoriteStatus}>
                        {isFavorite(spot.id) ? '已收藏' : '未收藏'}
                      </Text>
                      <Text
                        style={[
                          styles.sourceBadge,
                          spot.source === 'user' ? styles.userSourceBadge : styles.systemSourceBadge,
                        ]}>
                        {spot.source === 'user' ? '我添加的' : '系统收录'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.meta}>{displayAddress}</Text>
              </Pressable>

              {spot.tags.length > 0 ? (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  directionalLockEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.spotTagScroll}
                  contentContainerStyle={styles.spotTagContent}>
                  {spot.tags.map((tag) => (
                    <Text key={`${spot.id}-${tag}`} style={styles.spotTagChip}>
                      {tag}
                    </Text>
                  ))}
                </ScrollView>
              ) : null}

              <Pressable onPress={() => handleSelectSpot(spot.id)}>
                <Text style={styles.description} numberOfLines={2}>
                  {spot.description}
                </Text>
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
              </Pressable>
            </View>
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
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  title: {
    marginTop: theme.spacing.xs,
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
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
  stickyChip: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stickyChipActive: {
    backgroundColor: theme.colors.primary,
  },
  stickyChipInactive: {
    backgroundColor: theme.colors.chipBackground,
  },
  stickyChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stickyChipTextActive: {
    color: '#FFFFFF',
  },
  stickyChipTextInactive: {
    color: '#111827',
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
  tagChip: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagChipActive: {
    backgroundColor: theme.colors.primary,
  },
  tagChipInactive: {
    backgroundColor: theme.colors.chipBackground,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#FFFFFF',
  },
  tagChipTextInactive: {
    color: theme.colors.textPrimary,
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
  emptyState: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
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
  emptyHint: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cardTopMeta: {
    flex: 1,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  thumbnailPlaceholderText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  name: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 10,
  },
  favoriteStatus: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sourceBadge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  systemSourceBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textSecondary,
  },
  userSourceBadge: {
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primary,
  },
  meta: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  spotTagScroll: {
    marginTop: theme.spacing.sm,
  },
  spotTagContent: {
    gap: theme.spacing.xs,
    paddingBottom: 2,
  },
  spotTagChip: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  description: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
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

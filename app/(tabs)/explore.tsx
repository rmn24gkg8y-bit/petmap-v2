import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { usePetMapStore } from '@/store/petmap-store';
import { formatDistance, getDistanceMeters } from '@/utils/distance';

const SORT_MODE_LABELS = {
  popular: '热门推荐',
  name: '名称排序',
  distance: '距离优先',
} as const;

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

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    router.navigate('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredSpots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Explore</Text>
            <Text style={styles.subtitle}>发现当前收录的宠物友好地点</Text>

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

            <View style={styles.controlSection}>
              <Text style={styles.controlTitle}>地点来源</Text>
              <View style={styles.sortRow}>
                <Pressable
                  onPress={() => setShowUserOnly(false)}
                  style={[
                    styles.sortChip,
                    !showUserOnly ? styles.sortChipActive : styles.sortChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.sortChipText,
                      !showUserOnly ? styles.sortChipTextActive : styles.sortChipTextInactive,
                    ]}>
                    全部来源
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowUserOnly(true)}
                  style={[
                    styles.sortChip,
                    showUserOnly ? styles.sortChipActive : styles.sortChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.sortChipText,
                      showUserOnly ? styles.sortChipTextActive : styles.sortChipTextInactive,
                    ]}>
                    仅看我添加的
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.controlSection}>
              <Text style={styles.controlTitle}>地点范围</Text>
              <View style={styles.sortRow}>
                <Pressable
                  onPress={() => setShowFavoritesOnly(false)}
                  style={[
                    styles.sortChip,
                    !showFavoritesOnly ? styles.sortChipActive : styles.sortChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.sortChipText,
                      !showFavoritesOnly
                        ? styles.sortChipTextActive
                        : styles.sortChipTextInactive,
                    ]}>
                    全部地点
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowFavoritesOnly(true)}
                  style={[
                    styles.sortChip,
                    showFavoritesOnly ? styles.sortChipActive : styles.sortChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.sortChipText,
                      showFavoritesOnly
                        ? styles.sortChipTextActive
                        : styles.sortChipTextInactive,
                    ]}>
                    仅看已收藏
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.controlSection}>
              <Text style={styles.controlTitle}>排序方式</Text>
              <View style={styles.sortRow}>
                <Pressable
                  onPress={() => setSortMode('popular')}
                  style={[
                    styles.sortChip,
                    sortMode === 'popular' ? styles.sortChipActive : styles.sortChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.sortChipText,
                      sortMode === 'popular'
                        ? styles.sortChipTextActive
                        : styles.sortChipTextInactive,
                    ]}>
                    热门推荐
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSortMode('name')}
                  style={[
                    styles.sortChip,
                    sortMode === 'name' ? styles.sortChipActive : styles.sortChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.sortChipText,
                      sortMode === 'name' ? styles.sortChipTextActive : styles.sortChipTextInactive,
                    ]}>
                    名称排序
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSortMode('distance')}
                  style={[
                    styles.sortChip,
                    sortMode === 'distance' ? styles.sortChipActive : styles.sortChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.sortChipText,
                      sortMode === 'distance'
                        ? styles.sortChipTextActive
                        : styles.sortChipTextInactive,
                    ]}>
                    距离优先
                  </Text>
                </Pressable>
              </View>

              {sortMode === 'distance' && !userLoc ? (
                <Text style={styles.helperText}>暂未获取位置，当前已自动降级为热门推荐</Text>
              ) : null}
            </View>

            <View style={styles.controlSection}>
              <Text style={styles.controlTitle}>标签筛选</Text>
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

            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>
                当前搜索：{searchQuery ? searchQuery : '无'}
              </Text>
              <Text style={styles.feedbackText}>
                当前来源过滤：{showUserOnly ? '仅看我添加的' : '全部'}
              </Text>
              <Text style={styles.feedbackText}>
                当前收藏过滤：{showFavoritesOnly ? '仅看已收藏' : '全部'}
              </Text>
              <Text style={styles.feedbackText}>当前排序：{SORT_MODE_LABELS[sortMode]}</Text>
              <Text style={styles.feedbackText}>当前标签：{selectedTag ?? '全部'}</Text>
              <Text style={styles.feedbackText}>当前结果数：{filteredSpots.length} 个地点</Text>
            </View>

            {recentViewedSpots.length > 0 ? (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>最近浏览</Text>

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
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>暂时没有符合条件的地点</Text>
            <Text style={styles.emptyDescription}>
              试试更换关键词或清除筛选
            </Text>
            {showUserOnly ? <Text style={styles.emptyHint}>还没有你添加的地点</Text> : null}
            <Pressable onPress={resetExploreFilters} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>清除筛选</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handleSelectSpot(item.id)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.favoriteStatus}>
                {isFavorite(item.id) ? '已收藏' : '未收藏'}
              </Text>
            </View>
            <Text style={styles.sourceBadge}>
              {item.source === 'user' ? '我添加的' : '系统收录'}
            </Text>
            <Text style={styles.meta}>
              {item.district} · {item.addressHint}
            </Text>
            <Text style={styles.tags}>{item.tags.join(' · ')}</Text>
            <Text style={styles.description}>{item.description}</Text>
            {userLoc ? (
              <Text style={styles.distance}>
                距离你约 {formatDistance(getDistanceMeters(userLoc, { lat: item.lat, lng: item.lng }))}
              </Text>
            ) : null}
            <Text style={styles.votes}>{item.votes} votes</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  clearSearchButton: {
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearSearchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  controlSection: {
    marginTop: 20,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  sortChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sortChipActive: {
    backgroundColor: '#111827',
  },
  sortChipInactive: {
    backgroundColor: '#FFFFFF',
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  sortChipTextInactive: {
    color: '#111827',
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  tagContent: {
    gap: 10,
    marginTop: 12,
    paddingBottom: 4,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tagChipActive: {
    backgroundColor: '#2563EB',
  },
  tagChipInactive: {
    backgroundColor: '#FFFFFF',
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#FFFFFF',
  },
  tagChipTextInactive: {
    color: '#111827',
  },
  feedbackCard: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 6,
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
  },
  recentSection: {
    marginTop: 20,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  recentContent: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  recentItem: {
    maxWidth: 180,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recentItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  emptyState: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  emptyDescription: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  favoriteStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  meta: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  tags: {
    marginTop: 8,
    fontSize: 13,
    color: '#2563EB',
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
  },
  distance: {
    marginTop: 10,
    fontSize: 13,
    color: '#111827',
  },
  votes: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
});

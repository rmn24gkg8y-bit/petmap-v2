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
    userSpots,
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
            <Text style={styles.eyebrow}>发现地点</Text>
            <Text style={styles.title}>Explore</Text>
            <Text style={styles.subtitle}>按关键词、标签和来源快速找到适合你和宠物的地点。</Text>

            <Pressable onPress={() => router.push('/my-spots')} style={styles.mySpotsEntry}>
              <View style={styles.mySpotsCopy}>
                <Text style={styles.mySpotsTitle}>我的地点</Text>
                <Text style={styles.mySpotsSubtitle}>我添加的地点（{userSpots.length}）</Text>
              </View>
              <Text style={styles.mySpotsArrow}>管理</Text>
            </Pressable>

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
              <Text style={styles.feedbackTitle}>当前筛选</Text>
              <View style={styles.feedbackGrid}>
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>搜索</Text>
                  <Text style={styles.feedbackValue}>{searchQuery ? searchQuery : '无'}</Text>
                </View>
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>来源</Text>
                  <Text style={styles.feedbackValue}>{showUserOnly ? '仅看我添加的' : '全部'}</Text>
                </View>
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>收藏过滤</Text>
                  <Text style={styles.feedbackValue}>{showFavoritesOnly ? '仅看已收藏' : '全部'}</Text>
                </View>
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>排序</Text>
                  <Text style={styles.feedbackValue}>{SORT_MODE_LABELS[sortMode]}</Text>
                </View>
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>标签</Text>
                  <Text style={styles.feedbackValue}>{selectedTag ?? '全部'}</Text>
                </View>
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>结果</Text>
                  <Text style={styles.feedbackValue}>{filteredSpots.length} 个地点</Text>
                </View>
              </View>
            </View>

            {recentViewedSpots.length > 0 ? (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>最近浏览</Text>
                <Text style={styles.recentSubtitle}>快速回到你刚刚看过的地点</Text>

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
            <Text style={styles.emptyDescription}>试试更换关键词、标签，或者直接清除筛选。</Text>
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
            </View>
            <View style={styles.badgeRow}>
              <Text style={styles.favoriteStatus}>
                {isFavorite(item.id) ? '已收藏' : '未收藏'}
              </Text>
              <Text
                style={[
                  styles.sourceBadge,
                  item.source === 'user' ? styles.userSourceBadge : styles.systemSourceBadge,
                ]}>
                {item.source === 'user' ? '我添加的' : '系统收录'}
              </Text>
            </View>
            <Text style={styles.meta}>
              {item.district} · {item.addressHint}
            </Text>
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <Text key={`${item.id}-${tag}`} style={styles.spotTagChip}>
                  {tag}
                </Text>
              ))}
            </View>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.cardFooter}>
              {userLoc ? (
                <Text style={styles.distance}>
                  距离你约 {formatDistance(getDistanceMeters(userLoc, { lat: item.lat, lng: item.lng }))}
                </Text>
              ) : (
                <Text style={styles.distancePlaceholder}>尚未获取位置</Text>
              )}
              <Text style={styles.votes}>{item.votes} votes</Text>
            </View>
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
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#2563EB',
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  mySpotsEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  mySpotsCopy: {
    flex: 1,
  },
  mySpotsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  mySpotsSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  mySpotsArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  searchInput: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  clearSearchButton: {
    borderRadius: 12,
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
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
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
    paddingVertical: 9,
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
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  feedbackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  feedbackItem: {
    width: '47%',
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  feedbackValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  recentSection: {
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  recentSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  recentContent: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  recentItem: {
    maxWidth: 180,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
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
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
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
    borderRadius: 14,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  name: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  favoriteStatus: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  systemSourceBadge: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },
  userSourceBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  meta: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  spotTagChip: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  distance: {
    fontSize: 13,
    color: '#111827',
  },
  distancePlaceholder: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  votes: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
});

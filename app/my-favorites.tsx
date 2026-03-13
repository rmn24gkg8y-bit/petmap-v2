import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyStateCard, PrimaryButton, SectionHeader, SpotCard, StatusBadge, TagChip } from '@/components/ui';
import { getSpotIdentityBadge } from '@/constants/spotIdentity';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';

type FavoriteSourceFilter = 'all' | 'system' | 'user' | 'pending';

export default function MyFavoritesScreen() {
  const { favoriteSpots, setSelectedSpot, toggleFavorite } = usePetMapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<FavoriteSourceFilter>('all');
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredFavoriteSpots = useMemo(() => {
    return favoriteSpots.filter((spot) => {
      const identityBadge = getSpotIdentityBadge(spot);
      const matchesSource =
        selectedSourceFilter === 'all' || identityBadge.variant === selectedSourceFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          spot.name,
          spot.formattedAddress ?? '',
          spot.district,
          spot.addressHint,
          ...spot.tags,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));

      return matchesSource && matchesSearch;
    });
  }, [favoriteSpots, normalizedQuery, selectedSourceFilter]);

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    router.navigate({
      pathname: '/(tabs)',
      params: {
        returnTo: 'my-favorites',
      },
    });
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '我的收藏' }} />

      <FlatList
        data={filteredFavoriteSpots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponentStyle={styles.listHeader}
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionHeader
              eyebrow="收藏管理"
              title="我的收藏"
              subtitle={`快速回到你标记过的重要地点，共 ${favoriteSpots.length} 个。`}
            />
            <View style={styles.toolbar}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="搜索收藏地点、地址或标签"
                style={styles.searchInput}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}>
                <TagChip
                  label="全部"
                  active={selectedSourceFilter === 'all'}
                  onPress={() => setSelectedSourceFilter('all')}
                />
                <TagChip
                  label="平台整理"
                  active={selectedSourceFilter === 'system'}
                  onPress={() => setSelectedSourceFilter('system')}
                />
                <TagChip
                  label="用户添加"
                  active={selectedSourceFilter === 'user'}
                  onPress={() => setSelectedSourceFilter('user')}
                />
                <TagChip
                  label="审核中"
                  active={selectedSourceFilter === 'pending'}
                  onPress={() => setSelectedSourceFilter('pending')}
                />
              </ScrollView>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.listEmpty}>
            {favoriteSpots.length === 0 ? (
              <EmptyStateCard
                title="你还没有收藏任何地点"
                description="可以去 Explore 或地图页挑选并收藏地点"
                action={
                  <PrimaryButton label="前往 Explore" onPress={() => router.navigate('/(tabs)/explore')} />
                }
              />
            ) : (
              <EmptyStateCard
                title="没有符合条件的收藏地点"
                description="试试更换关键词，或切换来源筛选。"
              />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const identityBadge = getSpotIdentityBadge(item);

          return (
            <SpotCard
              title={item.name}
              address={
                item.formattedAddress?.trim() ||
                [item.district, item.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
                '地址待补充'
              }
              photoUri={item.photoUris?.[0]}
              badges={
                <StatusBadge
                  label={identityBadge.label}
                  variant={identityBadge.variant}
                />
              }
              tags={item.tags.slice(0, 3)}
              description={item.description}
              onPressTop={() => handleSelectSpot(item.id)}
              footer={
                <View style={styles.cardFooter}>
                  <PrimaryButton
                    label="查看地点"
                    onPress={() => handleSelectSpot(item.id)}
                    style={styles.actionButton}
                  />
                  <PrimaryButton
                    label="取消收藏"
                    variant="secondary"
                    onPress={() => toggleFavorite(item.id)}
                    style={styles.actionButton}
                  />
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
    gap: theme.spacing.sm,
  },
  listHeader: {
    marginBottom: theme.spacing.xs,
  },
  listEmpty: {
    marginTop: theme.spacing.sm,
  },
  toolbar: {
    gap: theme.spacing.sm,
  },
  searchInput: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  filterContent: {
    gap: theme.spacing.xs,
    paddingBottom: 2,
  },
  cardFooter: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  actionButton: {
    paddingVertical: 10,
  },
});

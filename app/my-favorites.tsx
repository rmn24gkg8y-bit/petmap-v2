import { router, Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyStateCard, PrimaryButton, SectionHeader, SpotCard, StatusBadge } from '@/components/ui';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';

export default function MyFavoritesScreen() {
  const { favoriteSpots, setSelectedSpot } = usePetMapStore();

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    router.navigate('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '我的收藏' }} />

      <FlatList
        data={favoriteSpots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponentStyle={styles.listHeader}
        ListHeaderComponent={
          <SectionHeader
            eyebrow="收藏管理"
            title="我的收藏"
            subtitle={`快速回到你标记过的重要地点，共 ${favoriteSpots.length} 个。`}
          />
        }
        ListEmptyComponent={
          <View style={styles.listEmpty}>
            <EmptyStateCard
              title="你还没有收藏任何地点"
              description="可以去 Explore 或地图页挑选并收藏地点"
              action={
                <PrimaryButton label="前往 Explore" onPress={() => router.navigate('/(tabs)/explore')} />
              }
            />
          </View>
        }
        renderItem={({ item }) => (
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
                label={item.source === 'user' ? '我添加的' : '系统收录'}
                variant={item.source === 'user' ? 'user' : 'system'}
              />
            }
            tags={item.tags.slice(0, 3)}
            description={item.description}
            onPress={() => handleSelectSpot(item.id)}
          />
        )}
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
  listHeader: {
    marginBottom: theme.spacing.xs,
  },
  listEmpty: {
    marginTop: theme.spacing.sm,
  },
});

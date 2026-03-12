import { router, Stack } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>收藏管理</Text>
            <Text style={styles.title}>我的收藏</Text>
            <Text style={styles.subtitle}>快速回到你标记过的重要地点，共 {favoriteSpots.length} 个。</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>你还没有收藏任何地点</Text>
            <Text style={styles.emptyDescription}>可以去 Explore 或地图页挑选并收藏地点</Text>
            <Pressable onPress={() => router.navigate('/(tabs)/explore')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>前往 Explore</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handleSelectSpot(item.id)} style={styles.card}>
            <View style={styles.cardTopRow}>
              {item.photoUris?.[0] ? (
                <Image source={{ uri: item.photoUris[0] }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Text style={styles.thumbnailPlaceholderText}>暂无图片</Text>
                </View>
              )}
              <View style={styles.cardTopMeta}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  <Text
                    style={[
                      styles.sourceBadge,
                      item.source === 'user' ? styles.userSourceBadge : styles.systemSourceBadge,
                    ]}>
                    {item.source === 'user' ? '我添加的' : '系统收录'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.formattedAddress?.trim() ||
                [item.district, item.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
                '地址待补充'}
            </Text>
            {item.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {item.tags.slice(0, 3).map((tag) => (
                  <Text key={`${item.id}-${tag}`} style={styles.tagChip}>
                    {tag}
                  </Text>
                ))}
              </View>
            ) : null}
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          </Pressable>
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
  header: {
    marginBottom: theme.spacing.md,
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
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
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
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
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
  name: {
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagChip: {
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
});

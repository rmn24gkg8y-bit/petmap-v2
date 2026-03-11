import { router, Stack } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePetMapStore } from '@/store/petmap-store';

export default function MySpotsScreen() {
  const { userSpots, setSelectedSpot, submitSpotForReview } = usePetMapStore();

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    router.navigate('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '我的地点' }} />

      <FlatList
        data={userSpots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>内容管理</Text>
            <Text style={styles.title}>我的地点</Text>
            <Text style={styles.subtitle}>管理你本机保存的地点，共 {userSpots.length} 个。</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>你还没有添加任何地点</Text>
            <Text style={styles.emptyDescription}>可以去地图页长按添加一个地点</Text>
            <Pressable onPress={() => router.navigate('/(tabs)')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>前往地图添加</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => handleSelectSpot(item.id)}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.sourceBadge}>我添加的</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    item.submissionStatus === 'pending_review'
                      ? styles.pendingBadge
                      : styles.localBadge,
                  ]}>
                  {item.submissionStatus === 'pending_review' ? '待审核' : '仅本机保存'}
                </Text>
              </View>
              <Text style={styles.meta}>
                {item.district} · {item.addressHint}
              </Text>
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <Text key={`${item.id}-${tag}`} style={styles.tagChip}>
                    {tag}
                  </Text>
                ))}
              </View>
            </Pressable>

            {item.submissionStatus !== 'pending_review' ? (
              <Pressable
                onPress={() => submitSpotForReview(item.id)}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>提交审核</Text>
              </Pressable>
            ) : null}
          </View>
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
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
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
  name: {
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
  sourceBadge: {
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  localBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
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
  tagChip: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
});

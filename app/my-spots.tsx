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
            <Text style={styles.title}>我的地点</Text>
            <Text style={styles.subtitle}>管理你本机保存的地点，共 {userSpots.length} 个</Text>
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
              <Text style={styles.sourceBadge}>我添加的</Text>
              <Text style={styles.statusText}>
                {item.submissionStatus === 'pending_review' ? '待审核' : '仅本机保存'}
              </Text>
              <Text style={styles.meta}>
                {item.district} · {item.addressHint}
              </Text>
              <Text style={styles.tags}>{item.tags.join(' · ')}</Text>
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
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
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
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
  statusText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  tags: {
    marginTop: 8,
    fontSize: 13,
    color: '#2563EB',
  },
});

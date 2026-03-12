import { router, Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyStateCard, PrimaryButton, SectionHeader, SpotCard, StatusBadge } from '@/components/ui';
import { theme } from '@/constants/theme';
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
          <SectionHeader
            eyebrow="内容管理"
            title="我的地点"
            subtitle={`管理你本机保存的地点，共 ${userSpots.length} 个。`}
          />
        }
        ListEmptyComponent={
          <EmptyStateCard
            title="你还没有添加任何地点"
            description="可以去地图页长按添加一个地点"
            action={<PrimaryButton label="前往地图添加" onPress={() => router.navigate('/(tabs)')} />}
          />
        }
        renderItem={({ item }) => (
          <View>
            <SpotCard
              title={item.name}
              address={
                item.formattedAddress?.trim() ||
                [item.district, item.addressHint].map((value) => value.trim()).filter(Boolean).join(' · ') ||
                '地址待补充'
              }
              photoUri={item.photoUris?.[0]}
              badges={
                <>
                  <StatusBadge label="我添加的" variant="user" />
                  <StatusBadge
                    label={item.submissionStatus === 'pending_review' ? '待审核' : '仅本机保存'}
                    variant={item.submissionStatus === 'pending_review' ? 'pending' : 'local'}
                  />
                </>
              }
              tags={item.tags.slice(0, 3)}
              onPressTop={() => handleSelectSpot(item.id)}
              footer={
                item.submissionStatus !== 'pending_review' ? (
                  <PrimaryButton
                    label="提交审核"
                    onPress={() => submitSpotForReview(item.id)}
                    style={styles.submitButton}
                  />
                ) : null
              }
            />
          </View>
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
  submitButton: {
    marginTop: theme.spacing.md,
  },
});

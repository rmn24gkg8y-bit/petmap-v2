import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateCard, PrimaryButton, SectionHeader, SpotCard, StatusBadge } from '@/components/ui';
import { SPOT_TYPE_LABELS } from '@/constants/spotFormOptions';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { Spot } from '@/types/spot';

type SpotGroupKey = 'pending' | 'published' | 'other';

function getSpotGroupKey(spot: Spot): SpotGroupKey {
  if (spot.submissionStatus === 'pending_review') {
    return 'pending';
  }

  if (spot.verified) {
    return 'published';
  }

  return 'other';
}

function getSpotStatusMeta(spot: Spot) {
  if (spot.submissionStatus === 'pending_review') {
    return {
      label: '审核中',
      variant: 'pending' as const,
      hint: '地点正在审核中，可先查看或继续完善信息。',
    };
  }

  if (spot.verified) {
    return {
      label: '已发布',
      variant: 'favorite' as const,
      hint: '地点已上线，可继续维护信息。',
    };
  }

  return {
    label: '待提交',
    variant: 'local' as const,
    hint: '完善后可提交审核。',
  };
}

export default function MySpotsScreen() {
  const { userSpots, setSelectedSpot, submitSpotForReview, removeSpot } = usePetMapStore();
  const groupedSpots = useMemo(() => {
    const pending = userSpots.filter((spot) => getSpotGroupKey(spot) === 'pending');
    const published = userSpots.filter((spot) => getSpotGroupKey(spot) === 'published');
    const others = userSpots.filter((spot) => getSpotGroupKey(spot) === 'other');

    return [
      { key: 'pending' as const, title: '审核中', spots: pending },
      { key: 'published' as const, title: '已发布', spots: published },
      { key: 'other' as const, title: '待提交', spots: others },
    ].filter((group) => group.spots.length > 0);
  }, [userSpots]);

  function handleSelectSpot(id: string) {
    setSelectedSpot(id);
    router.navigate('/(tabs)');
  }

  function handleEditSpot(id: string) {
    setSelectedSpot(id);
    router.navigate('/(tabs)');
  }

  function handleDeleteSpot(id: string) {
    Alert.alert('确认删除地点？', '删除后将无法恢复', [
      {
        text: '取消',
        style: 'cancel',
      },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => removeSpot(id),
      },
    ]);
  }

  async function handleSubmitForReview(id: string) {
    const result = await submitSpotForReview(id);

    if (result.success) {
      if (result.mode === 'cloud') {
        Alert.alert('提交成功', '该地点已提交到云端审核队列');
      } else {
        Alert.alert('已标记待审核', '当前未接入云端，已先在本地标记为待审核');
      }
      return;
    }

    Alert.alert('提交失败', result.error ?? '提交失败，请稍后重试');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '我的地点' }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="内容管理"
          title="我的地点"
          subtitle={`管理你本机保存的地点，共 ${userSpots.length} 个。`}
          style={styles.listHeader}
        />

        {userSpots.length === 0 ? (
          <View style={styles.listEmpty}>
            <EmptyStateCard
              title="你还没有添加任何地点"
              description="可以去地图页长按添加一个地点"
              action={<PrimaryButton label="前往地图添加" onPress={() => router.navigate('/(tabs)')} />}
            />
          </View>
        ) : (
          groupedSpots.map((group) => (
            <View key={group.key} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupCount}>{group.spots.length} 个</Text>
              </View>
              {group.spots.map((item) => {
                const statusMeta = getSpotStatusMeta(item);
                const groupKey = getSpotGroupKey(item);

                return (
                  <SpotCard
                    key={item.id}
                    title={item.name}
                    address={
                      item.formattedAddress?.trim() ||
                      [item.district, item.addressHint]
                        .map((value) => value.trim())
                        .filter(Boolean)
                        .join(' · ') ||
                      '地址待补充'
                    }
                    photoUri={item.photoUris?.[0]}
                    badges={
                      <>
                        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                        <StatusBadge label={SPOT_TYPE_LABELS[item.spotType]} variant="system" />
                      </>
                    }
                    tags={item.tags.slice(0, 3)}
                    onPressTop={() => handleSelectSpot(item.id)}
                    footer={
                      <View style={styles.cardFooter}>
                        <Text style={styles.statusHintText}>{statusMeta.hint}</Text>
                        <View style={styles.actionsRow}>
                          {groupKey === 'other' ? (
                            <>
                              <PrimaryButton
                                label="提交审核"
                                onPress={() => handleSubmitForReview(item.id)}
                                style={styles.actionButton}
                              />
                              <PrimaryButton
                                label="去地图编辑"
                                variant="secondary"
                                onPress={() => handleEditSpot(item.id)}
                                style={styles.actionButton}
                              />
                            </>
                          ) : null}
                          {groupKey === 'pending' ? (
                            <>
                              <PrimaryButton
                                label="查看地点"
                                onPress={() => handleSelectSpot(item.id)}
                                style={styles.actionButton}
                              />
                              <PrimaryButton
                                label="去地图编辑"
                                variant="secondary"
                                onPress={() => handleEditSpot(item.id)}
                                style={styles.actionButton}
                              />
                            </>
                          ) : null}
                          {groupKey === 'published' ? (
                            <>
                              <PrimaryButton
                                label="查看地点"
                                onPress={() => handleSelectSpot(item.id)}
                                style={styles.actionButton}
                              />
                              <PrimaryButton
                                label="去地图编辑"
                                variant="secondary"
                                onPress={() => handleEditSpot(item.id)}
                                style={styles.actionButton}
                              />
                              <PrimaryButton
                                label="删除地点"
                                variant="danger"
                                onPress={() => handleDeleteSpot(item.id)}
                                style={styles.actionButton}
                              />
                            </>
                          ) : null}
                        </View>
                      </View>
                    }
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
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
    marginBottom: theme.spacing.sm,
  },
  listEmpty: {
    marginTop: theme.spacing.sm,
  },
  groupSection: {
    marginBottom: theme.spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  groupCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  cardFooter: {
    marginTop: theme.spacing.sm + 2,
    gap: theme.spacing.sm,
  },
  statusHintText: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  actionButton: {
    paddingVertical: 10,
  },
});

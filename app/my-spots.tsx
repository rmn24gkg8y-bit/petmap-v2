import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyStateCard, PrimaryButton, SectionHeader, SpotCard, StatusBadge, TagChip } from '@/components/ui';
import { SPOT_TYPE_LABELS } from '@/constants/spotFormOptions';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { Spot } from '@/types/spot';

type SpotGroupKey = 'pending' | 'published' | 'other';
type StatusFilterKey = 'all' | SpotGroupKey;

const SPOT_STATUS_COPY: Record<
  SpotGroupKey,
  {
    groupTitle: string;
    groupDescription: string;
    badgeLabel: string;
    badgeVariant: 'pending' | 'favorite' | 'local';
    hint: string;
  }
> = {
  other: {
    groupTitle: '待提交',
    groupDescription: '尚未提交审核，可继续完善后提交。',
    badgeLabel: '待提交',
    badgeVariant: 'local',
    hint: '完善后可提交审核。',
  },
  pending: {
    groupTitle: '审核中',
    groupDescription: '已提交，等待审核处理。',
    badgeLabel: '审核中',
    badgeVariant: 'pending',
    hint: '地点正在审核中，可先查看或继续完善信息。',
  },
  published: {
    groupTitle: '已发布',
    groupDescription: '已上线，可继续维护地点信息。',
    badgeLabel: '已发布',
    badgeVariant: 'favorite',
    hint: '地点已上线，可继续维护信息。',
  },
};

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
  return SPOT_STATUS_COPY[getSpotGroupKey(spot)];
}

export default function MySpotsScreen() {
  const { userSpots, setSelectedSpot, submitSpotForReview, removeSpot } = usePetMapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilterKey>('all');
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredUserSpots = useMemo(() => {
    return userSpots.filter((spot) => {
      const groupKey = getSpotGroupKey(spot);
      const matchesStatus = selectedStatusFilter === 'all' || groupKey === selectedStatusFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          spot.name,
          spot.formattedAddress ?? '',
          spot.district,
          spot.addressHint,
          ...spot.tags,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesSearch;
    });
  }, [normalizedQuery, selectedStatusFilter, userSpots]);
  const groupedSpots = useMemo(() => {
    const pending = filteredUserSpots.filter((spot) => getSpotGroupKey(spot) === 'pending');
    const published = filteredUserSpots.filter((spot) => getSpotGroupKey(spot) === 'published');
    const others = filteredUserSpots.filter((spot) => getSpotGroupKey(spot) === 'other');

    return [
      {
        key: 'pending' as const,
        title: SPOT_STATUS_COPY.pending.groupTitle,
        description: SPOT_STATUS_COPY.pending.groupDescription,
        spots: pending,
      },
      {
        key: 'published' as const,
        title: SPOT_STATUS_COPY.published.groupTitle,
        description: SPOT_STATUS_COPY.published.groupDescription,
        spots: published,
      },
      {
        key: 'other' as const,
        title: SPOT_STATUS_COPY.other.groupTitle,
        description: SPOT_STATUS_COPY.other.groupDescription,
        spots: others,
      },
    ].filter((group) => group.spots.length > 0);
  }, [filteredUserSpots]);

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
          <>
            <View style={styles.toolbar}>
              <View style={styles.searchRow}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="搜索我的地点、地址或标签"
                  style={styles.searchInput}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}>
                <TagChip
                  label="全部"
                  active={selectedStatusFilter === 'all'}
                  onPress={() => setSelectedStatusFilter('all')}
                />
                <TagChip
                  label="待提交"
                  active={selectedStatusFilter === 'other'}
                  onPress={() => setSelectedStatusFilter('other')}
                />
                <TagChip
                  label="审核中"
                  active={selectedStatusFilter === 'pending'}
                  onPress={() => setSelectedStatusFilter('pending')}
                />
                <TagChip
                  label="已发布"
                  active={selectedStatusFilter === 'published'}
                  onPress={() => setSelectedStatusFilter('published')}
                />
              </ScrollView>
            </View>

            {groupedSpots.length === 0 ? (
              <View style={styles.listEmpty}>
                <EmptyStateCard
                  title="没有符合条件的地点"
                  description="试试更换关键词，或切换状态筛选。"
                />
              </View>
            ) : (
              groupedSpots.map((group) => (
                <View key={group.key} style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderContent}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                      <Text style={styles.groupDescription}>{group.description}</Text>
                    </View>
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
                            <StatusBadge label={statusMeta.badgeLabel} variant={statusMeta.badgeVariant} />
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
          </>
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
  toolbar: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  filterContent: {
    gap: theme.spacing.xs,
    paddingBottom: 2,
  },
  groupSection: {
    marginBottom: theme.spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  groupHeaderContent: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  groupDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
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

import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateCard, SectionHeader, TagChip } from '@/components/ui';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { InboxItem } from '@/types/inbox';

type InboxFilterKey = 'all' | 'feedback' | 'platform';

function formatInboxDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '时间待确认';
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}

function getInboxChipLabel(item: InboxItem) {
  if (item.sourceType === 'platform') {
    if (item.messageType === 'activity') {
      return '活动通知';
    }

    if (item.messageType === 'release') {
      return '版本更新';
    }

    return '内容提醒';
  }

  if (item.feedbackType === 'spot') {
    return '地点反馈';
  }

  if (item.feedbackType === 'activity') {
    return '活动反馈';
  }

  if (item.feedbackType === 'bug') {
    return 'Bug 反馈';
  }

  return '产品建议';
}

function getInboxContextText(item: InboxItem) {
  if (item.sourceType !== 'feedback') {
    return '';
  }

  if (item.contextType === 'spot' && item.spotName) {
    return `反馈对象：${item.spotName}`;
  }

  if (item.contextType === 'activity' && item.activityTitle) {
    return `反馈对象：${item.activityTitle}`;
  }

  return '通用反馈';
}

export default function InboxScreen() {
  const { inboxItems, feedbackRecords } = usePetMapStore();
  const [selectedFilter, setSelectedFilter] = useState<InboxFilterKey>('all');
  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') {
      return inboxItems;
    }

    return inboxItems.filter((item) => item.sourceType === selectedFilter);
  }, [inboxItems, selectedFilter]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '消息中心' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="消息与反馈"
          title="Inbox"
          subtitle="在这里统一查看你提交过的反馈，以及平台发出的活动通知、版本更新和内容提醒。"
          style={styles.header}
        />

        <View style={styles.filterRow}>
          <TagChip
            label="全部"
            active={selectedFilter === 'all'}
            onPress={() => setSelectedFilter('all')}
          />
          <TagChip
            label="反馈记录"
            active={selectedFilter === 'feedback'}
            onPress={() => setSelectedFilter('feedback')}
          />
          <TagChip
            label="平台消息"
            active={selectedFilter === 'platform'}
            onPress={() => setSelectedFilter('platform')}
          />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{feedbackRecords.length}</Text>
            <Text style={styles.summaryLabel}>我的反馈</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {inboxItems.filter((item) => item.sourceType === 'platform').length}
            </Text>
            <Text style={styles.summaryLabel}>平台消息</Text>
          </View>
        </View>

        {filteredItems.length === 0 ? (
          <EmptyStateCard
            title="暂时没有可展示的消息"
            description="提交反馈后，你的记录会出现在这里；平台消息也会逐步补充。"
          />
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.messageCard}>
              <View style={styles.messageTopRow}>
                <TagChip label={getInboxChipLabel(item)} compact />
                <Text style={styles.messageTime}>{formatInboxDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.messageTitle}>{item.title}</Text>
              <Text style={styles.messageContent} numberOfLines={4}>
                {item.content}
              </Text>
              {item.sourceType === 'feedback' ? (
                <View style={styles.messageMetaRow}>
                  <Text style={styles.messageMeta}>{getInboxContextText(item)}</Text>
                  <Text style={styles.messageStatus}>已收到</Text>
                </View>
              ) : null}
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
    gap: theme.spacing.md,
  },
  header: {
    marginBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  summaryItem: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messageCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadows.card,
  },
  messageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  messageTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  messageContent: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  messageMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  messageMeta: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messageStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});

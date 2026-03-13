import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateCard, PrimaryButton, SectionHeader, TagChip } from '@/components/ui';
import { theme } from '@/constants/theme';
import { usePetMapStore } from '@/store/petmap-store';
import type { InboxItem } from '@/types/inbox';

function formatDetailDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '时间待确认';
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSourceLabel(item: InboxItem) {
  return item.sourceType === 'feedback' ? '反馈记录' : '平台消息';
}

function getTypeLabel(item: InboxItem) {
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
    return '地点信息反馈';
  }

  if (item.feedbackType === 'activity') {
    return '活动内容反馈';
  }

  if (item.feedbackType === 'bug') {
    return 'Bug 反馈';
  }

  return '产品建议';
}

function getContextLabel(item: InboxItem) {
  if (item.sourceType !== 'feedback') {
    return '';
  }

  if (item.contextType === 'spot' && item.spotName) {
    return `反馈对象：${item.spotName}`;
  }

  if (item.contextType === 'activity' && item.activityTitle) {
    return `反馈对象：${item.activityTitle}`;
  }

  return '反馈对象：通用反馈';
}

function getFeedbackStatusLabel(item: InboxItem) {
  if (item.sourceType !== 'feedback') {
    return '';
  }

  if (item.status === 'in_progress') {
    return '正在整理';
  }

  if (item.status === 'replied') {
    return '已回复';
  }

  return '已收到';
}

export default function InboxDetailScreen() {
  const params = useLocalSearchParams<{ messageId?: string }>();
  const { inboxItems } = usePetMapStore();
  const messageId = Array.isArray(params.messageId) ? params.messageId[0] : params.messageId;
  const item = inboxItems.find((entry) => entry.id === messageId);

  function handleOpenTarget() {
    if (!item || item.sourceType !== 'platform' || !item.target) {
      return;
    }

    if (
      item.target.pathname === '/activity/[activityKey]' &&
      item.target.params?.activityKey
    ) {
      router.push({
        pathname: item.target.pathname,
        params: {
          activityKey: item.target.params.activityKey,
        },
      });
      return;
    }

    router.push(item.target.pathname);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: item ? '消息详情' : '消息不存在' }} />
      {!item ? (
        <View style={styles.emptyWrap}>
          <EmptyStateCard
            title="消息不存在"
            description="当前没有找到对应内容，可能这条消息已不存在或尚未加载。"
            action={<PrimaryButton label="返回消息中心" onPress={() => router.replace('/inbox')} />}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionHeader
            eyebrow={getSourceLabel(item)}
            title={item.title}
            subtitle="这里会展示这条消息或反馈记录的完整内容。"
            style={styles.header}
          />

          <View style={styles.metaCard}>
            <View style={styles.metaTopRow}>
              <TagChip label={getTypeLabel(item)} compact />
              <Text style={styles.metaTime}>{formatDetailDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.metaSource}>来源：{getSourceLabel(item)}</Text>
            {item.sourceType === 'feedback' ? (
              <View style={styles.feedbackMetaRow}>
                <Text style={styles.contextText}>{getContextLabel(item)}</Text>
                <Text style={styles.statusText}>状态：{getFeedbackStatusLabel(item)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.contentCard}>
            <Text style={styles.contentTitle}>完整内容</Text>
            <Text style={styles.contentText}>{item.content}</Text>
          </View>

          {item.sourceType === 'feedback' && item.reply ? (
            <View style={styles.replyCard}>
              <View style={styles.replyTopRow}>
                <Text style={styles.replyTitle}>平台回复</Text>
                <Text style={styles.replyTime}>{formatDetailDate(item.reply.repliedAt)}</Text>
              </View>
              <Text style={styles.replyText}>{item.reply.content}</Text>
            </View>
          ) : null}

          {item.sourceType === 'platform' && item.target ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionHint}>如果你想继续处理这条消息，可以直接前往对应页面。</Text>
              <PrimaryButton
                label={item.target.ctaLabel}
                onPress={handleOpenTarget}
                style={styles.actionButton}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  emptyWrap: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + theme.spacing.sm,
    gap: theme.spacing.md,
  },
  header: {
    marginBottom: 0,
  },
  metaCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadows.card,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  metaTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  metaSource: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  feedbackMetaRow: {
    gap: 4,
  },
  contextText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contentCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  replyCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadows.card,
  },
  replyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  replyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  replyTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  actionCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  actionHint: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  actionButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyStateCard, PrimaryButton } from '@/components/ui';
import { usePetMapStore } from '@/store/petmap-store';
import type { InboxItem } from '@/types/inbox';

function BackArrowIcon() {
  return (
    <Svg width={8} height={16} viewBox="0 0 11 19" fill="none">
      <Path
        d="M9.5 17.5L1.5 9.5L9.5 1.5"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
  if (item.sourceType === 'review') return '审核通知';
  return item.sourceType === 'feedback' ? '反馈记录' : '平台消息';
}

function getTypeLabel(item: InboxItem) {
  if (item.sourceType === 'review') {
    return item.reviewResult === 'approved' ? '审核通过' : '审核未通过';
  }

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
  const insets = useSafeAreaInsets();
  const { inboxItems, markInboxItemAsRead, setSelectedSpot } = usePetMapStore();
  const messageId = Array.isArray(params.messageId) ? params.messageId[0] : params.messageId;
  const item = inboxItems.find((entry) => entry.id === messageId);

  useEffect(() => {
    if (!messageId || !item) {
      return;
    }

    markInboxItemAsRead(messageId);
  }, [item, markInboxItemAsRead, messageId]);

  // Navigate to a spot on the Map, expanding the sheet to half.
  // Safe even if spotId is stale: setSelectedSpot sets a non-matching id,
  // Map derives selectedSpot = null, BottomSheet stays hidden — no crash.
  function handleOpenSpot(spotId: string) {
    setSelectedSpot(spotId);
    router.navigate({ pathname: '/(tabs)', params: { openToHalf: '1' } });
  }

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

  function handleOpenFeedbackObject() {
    if (!item || item.sourceType !== 'feedback') {
      return;
    }

    if (item.contextType === 'spot' && item.spotId) {
      handleOpenSpot(item.spotId);
      return;
    }

    if (item.contextType === 'activity' && item.activityKey) {
      router.push({
        pathname: '/activity/[activityKey]',
        params: {
          activityKey: item.activityKey,
        },
      });
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Orange Header ─────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
            <BackArrowIcon />
          </Pressable>
          <Text style={styles.headerTitle}>消息详情</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </SafeAreaView>

      {/* ── Body ─────────────────────────────────────────────────── */}
      {!item ? (
        <View style={styles.emptyWrap}>
          <EmptyStateCard
            title="消息不存在"
            description="当前没有找到对应内容，可能这条消息已不存在或尚未加载。"
            action={<PrimaryButton label="返回消息中心" onPress={() => router.replace('/inbox')} />}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}>

          {/* ── 消息身份卡 ─────────────────────────────────────── */}
          <View style={styles.infoCard}>
            <View style={styles.infoTopRow}>
              <View style={[
                styles.typeBadge,
                item.sourceType === 'review' ? styles.typeBadgeReview : null,
              ]}>
                <Text style={[
                  styles.typeBadgeText,
                  item.sourceType === 'review' ? styles.typeBadgeTextReview : null,
                ]}>
                  {getTypeLabel(item)}
                </Text>
              </View>
              <Text style={styles.infoDate}>{formatDetailDate(item.createdAt)}</Text>
            </View>

            <Text style={styles.infoTitle}>{item.title}</Text>

            {/* Review: 结果 badge + 地点 */}
            {item.sourceType === 'review' ? (
              <View style={styles.reviewMetaGroup}>
                <View style={[
                  styles.reviewResultBadge,
                  item.reviewResult === 'approved' ? styles.reviewResultApproved : styles.reviewResultRejected,
                ]}>
                  <Text style={[
                    styles.reviewResultText,
                    item.reviewResult === 'approved' ? styles.reviewResultTextApproved : styles.reviewResultTextRejected,
                  ]}>
                    {item.reviewResult === 'approved' ? '审核已通过' : '审核未通过'}
                  </Text>
                </View>
                <Text style={styles.reviewSpotLabel}>地点：{item.spotName}</Text>
              </View>
            ) : null}

            {/* Feedback: 对象 + 状态 */}
            {item.sourceType === 'feedback' ? (
              <View style={styles.feedbackMetaRow}>
                <Text style={styles.feedbackContextText}>{getContextLabel(item)}</Text>
                <Text style={styles.feedbackStatusText}>{getFeedbackStatusLabel(item)}</Text>
              </View>
            ) : null}

            {/* Platform: 来源标注 */}
            {item.sourceType === 'platform' ? (
              <Text style={styles.sourceLabel}>来源：{getSourceLabel(item)}</Text>
            ) : null}
          </View>

          {/* ── 消息正文卡 ─────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>消息内容</Text>
            <Text style={styles.contentText}>{item.content}</Text>
          </View>

          {/* ── 平台回复卡（仅 feedback 且有 reply）────────────── */}
          {item.sourceType === 'feedback' && item.reply ? (
            <View style={styles.replyCard}>
              <View style={styles.replyTopRow}>
                <Text style={styles.replyEyebrow}>平台回复</Text>
                <Text style={styles.replyTime}>{formatDetailDate(item.reply.repliedAt)}</Text>
              </View>
              <Text style={styles.replyText}>{item.reply.content}</Text>
            </View>
          ) : null}

          {/* ── 行动区：review 前往地点 ────────────────────────── */}
          {item.sourceType === 'review' ? (
            <View style={styles.ctaCard}>
              <Text style={styles.ctaHint}>
                {item.reviewResult === 'approved'
                  ? '地点已通过审核，可以直接在地图上查看。'
                  : '你可以前往地图查看该地点，修改信息后重新提交审核。'}
              </Text>
              <PrimaryButton
                label="前往地点"
                onPress={() => handleOpenSpot(item.spotId)}
                style={styles.ctaButton}
              />
            </View>
          ) : null}

          {/* ── 行动区：feedback 前往对应对象 ──────────────────── */}
          {item.sourceType === 'feedback' &&
          ((item.contextType === 'spot' && item.spotId) ||
            (item.contextType === 'activity' && item.activityKey)) ? (
            <View style={styles.ctaCard}>
              <Text style={styles.ctaHint}>
                你可以回到这条反馈最初对应的对象，继续查看当前内容。
              </Text>
              <PrimaryButton
                label={item.contextType === 'spot' ? '前往地点' : '去查看该活动专题'}
                onPress={handleOpenFeedbackObject}
                style={styles.ctaButton}
              />
            </View>
          ) : null}

          {/* ── 行动区：platform 自定义跳转 ─────────────────────── */}
          {item.sourceType === 'platform' && item.target ? (
            <View style={styles.ctaCard}>
              <Text style={styles.ctaHint}>
                如果你想继续处理这条消息，可以直接前往对应页面。
              </Text>
              <PrimaryButton
                label={item.target.ctaLabel}
                onPress={handleOpenTarget}
                style={styles.ctaButton}
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
    backgroundColor: '#F5F3EF',
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#ED8422',
  },
  headerRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 30,
    height: 30,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.94 }],
  },
  headerPlaceholder: {
    width: 30,
    height: 30,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // ── Scroll ────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },

  // ── Empty state ───────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },

  // ── 消息身份卡 ────────────────────────────────────────────────────
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#C97010',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(237,132,34,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeReview: {
    backgroundColor: 'rgba(237,132,34,0.2)',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ED8422',
  },
  typeBadgeTextReview: {
    color: '#C06C10',
  },
  infoDate: {
    fontSize: 12,
    color: '#B0ABA4',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 24,
  },

  // Review meta
  reviewMetaGroup: {
    gap: 6,
  },
  reviewResultBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  reviewResultApproved: {
    backgroundColor: 'rgba(22,163,74,0.1)',
  },
  reviewResultRejected: {
    backgroundColor: 'rgba(220,38,38,0.08)',
  },
  reviewResultText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewResultTextApproved: {
    color: '#16A34A',
  },
  reviewResultTextRejected: {
    color: '#DC2626',
  },
  reviewSpotLabel: {
    fontSize: 13,
    color: '#6B6258',
    lineHeight: 18,
  },

  // Feedback meta
  feedbackMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedbackContextText: {
    flex: 1,
    fontSize: 13,
    color: '#6B6258',
    lineHeight: 18,
  },
  feedbackStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ED8422',
  },

  // Platform meta
  sourceLabel: {
    fontSize: 13,
    color: '#6B6258',
  },

  // ── 消息正文卡 ────────────────────────────────────────────────────
  sectionCard: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#C97010',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ED8422',
    letterSpacing: 0.4,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#404040',
  },

  // ── 平台回复卡 ────────────────────────────────────────────────────
  replyCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(237,132,34,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(237,132,34,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  replyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ED8422',
    letterSpacing: 0.4,
  },
  replyTime: {
    fontSize: 12,
    color: '#B0ABA4',
  },
  replyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#404040',
  },

  // ── 行动卡 ────────────────────────────────────────────────────────
  ctaCard: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    shadowColor: '#C97010',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  ctaHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B6258',
  },
  ctaButton: {
    alignSelf: 'stretch',
  },
});

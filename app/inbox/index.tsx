import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyStateCard } from '@/components/ui';
import { usePetMapStore } from '@/store/petmap-store';
import type { InboxItem } from '@/types/inbox';

type InboxFilterKey = 'all' | 'unread' | 'feedback' | 'system';

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

function formatInboxDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间待确认';
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function getInboxChipLabel(item: InboxItem) {
  if (item.sourceType === 'review') return '审核通知';
  if (item.sourceType === 'platform') {
    if (item.messageType === 'activity') return '活动通知';
    if (item.messageType === 'release') return '版本更新';
    return '内容提醒';
  }
  if (item.feedbackType === 'spot') return '地点反馈';
  if (item.feedbackType === 'activity') return '活动反馈';
  if (item.feedbackType === 'bug') return 'Bug 反馈';
  return '产品建议';
}

function getInboxContextText(item: InboxItem) {
  if (item.sourceType !== 'feedback') return '';
  if (item.contextType === 'spot' && item.spotName) return `反馈对象：${item.spotName}`;
  if (item.contextType === 'activity' && item.activityTitle) return `反馈对象：${item.activityTitle}`;
  return '通用反馈';
}

const FILTERS: { key: InboxFilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'feedback', label: '反馈记录' },
  { key: 'system', label: '系统消息' },
];

export default function InboxScreen() {
  const {
    inboxItems,
    hasUnreadInboxItems,
    isInboxItemRead,
    markAllInboxItemsAsRead,
  } = usePetMapStore();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<InboxFilterKey>('all');

  const unreadCount = useMemo(
    () => inboxItems.filter((item) => !isInboxItemRead(item.id)).length,
    [inboxItems, isInboxItemRead],
  );
  const systemMessageCount = useMemo(
    () => inboxItems.filter((item) => item.sourceType === 'platform' || item.sourceType === 'review').length,
    [inboxItems],
  );
  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return inboxItems;
    if (selectedFilter === 'unread') return inboxItems.filter((item) => !isInboxItemRead(item.id));
    if (selectedFilter === 'system') return inboxItems.filter((item) => item.sourceType === 'platform' || item.sourceType === 'review');
    return inboxItems.filter((item) => item.sourceType === selectedFilter);
  }, [inboxItems, isInboxItemRead, selectedFilter]);

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
          <Text style={styles.headerTitle}>消息中心</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
      </SafeAreaView>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setSelectedFilter(key)}
              style={({ pressed }) => [
                styles.filterChip,
                selectedFilter === key ? styles.filterChipActive : styles.filterChipInactive,
                pressed && styles.filterChipPressed,
              ]}>
              <Text style={[
                styles.filterChipText,
                selectedFilter === key ? styles.filterChipTextActive : styles.filterChipTextInactive,
              ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{inboxItems.length}</Text>
              <Text style={styles.statLabel}>总消息</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, unreadCount > 0 ? styles.statValueUnread : null]}>
                {unreadCount}
              </Text>
              <Text style={styles.statLabel}>未读</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{systemMessageCount}</Text>
              <Text style={styles.statLabel}>系统消息</Text>
            </View>
          </View>
          {hasUnreadInboxItems ? (
            <Pressable
              onPress={markAllInboxItemsAsRead}
              style={({ pressed }) => [styles.markAllButton, pressed ? styles.markAllButtonPressed : null]}>
              <Text style={styles.markAllButtonText}>全部已读</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Message list */}
        {filteredItems.length === 0 ? (
          <EmptyStateCard
            title="暂时没有消息"
            description="提交反馈后记录会出现在这里，平台通知也会陆续补充。"
          />
        ) : (
          <View style={styles.messageList}>
            {filteredItems.map((item) => {
              const isRead = isInboxItemRead(item.id);
              const isReview = item.sourceType === 'review';

              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/inbox/${item.id}`)}
                  style={({ pressed }) => [
                    styles.messageCard,
                    !isRead && isReview ? styles.messageCardUnreadReview : null,
                    !isRead && !isReview ? styles.messageCardUnread : null,
                    pressed ? styles.messageCardPressed : null,
                  ]}>

                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTopLeft}>
                      <View style={[styles.typeBadge, isReview ? styles.typeBadgeReview : null]}>
                        <Text style={[styles.typeBadgeText, isReview ? styles.typeBadgeTextReview : null]}>
                          {getInboxChipLabel(item)}
                        </Text>
                      </View>
                      {!isRead ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.cardDate}>{formatInboxDate(item.createdAt)}</Text>
                  </View>

                  <Text style={[styles.cardTitle, !isRead ? styles.cardTitleUnread : null]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardContent} numberOfLines={3}>
                    {item.content}
                  </Text>

                  {item.sourceType === 'feedback' ? (
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardMeta}>{getInboxContextText(item)}</Text>
                      <Text style={styles.cardStatus}>已收到</Text>
                    </View>
                  ) : null}

                  {item.sourceType === 'review' ? (
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardMeta}>地点：{item.spotName}</Text>
                      <Text style={[
                        styles.cardStatus,
                        item.reviewResult === 'approved' ? styles.cardStatusApproved : styles.cardStatusRejected,
                      ]}>
                        {item.reviewResult === 'approved' ? '已通过' : '未通过'}
                      </Text>
                    </View>
                  ) : null}

                </Pressable>
              );
            })}
          </View>
        )}

      </ScrollView>
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
  backButtonPlaceholder: {
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

  // ── Filter chips ──────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#ED8422',
  },
  filterChipInactive: {
    backgroundColor: '#FFFEFF',
    borderWidth: 1,
    borderColor: '#E0D8D0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextInactive: {
    color: '#6B6258',
  },
  filterChipPressed: {
    opacity: 0.72,
  },

  // ── Stats ─────────────────────────────────────────────────────────
  statsSection: {
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#FFFEFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#303030',
  },
  statValueUnread: {
    color: '#ED8422',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B0ABA4',
  },
  markAllButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: '#FFFEFF',
    borderWidth: 1,
    borderColor: 'rgba(237,132,34,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  markAllButtonPressed: {
    opacity: 0.75,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ED8422',
  },

  // ── Message list ──────────────────────────────────────────────────
  messageList: {
    gap: 10,
  },
  messageCard: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  messageCardUnread: {
    backgroundColor: '#FFF8F2',
    borderWidth: 1,
    borderColor: 'rgba(237,132,34,0.22)',
  },
  messageCardUnreadReview: {
    backgroundColor: '#FFF4E8',
    borderWidth: 1,
    borderColor: 'rgba(237,132,34,0.38)',
  },
  messageCardPressed: {
    opacity: 0.88,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(237,132,34,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeReview: {
    backgroundColor: 'rgba(237,132,34,0.2)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ED8422',
  },
  typeBadgeTextReview: {
    color: '#C06C10',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#ED8422',
  },
  cardDate: {
    fontSize: 12,
    color: '#B0ABA4',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#303030',
    lineHeight: 22,
  },
  cardTitleUnread: {
    fontWeight: '800',
    color: '#1A1008',
  },
  cardContent: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B6258',
  },
  cardMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    flex: 1,
    fontSize: 12,
    color: '#B0ABA4',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ED8422',
  },
  cardStatusApproved: {
    color: '#16A34A',
  },
  cardStatusRejected: {
    color: '#DC2626',
  },
});

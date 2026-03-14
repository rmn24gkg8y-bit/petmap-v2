import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui';
import { ACTIVITY_COLLECTIONS } from '@/constants/activityCollections';
import { getSpotIdentityBadge } from '@/constants/spotIdentity';
import { SPOT_TYPE_LABELS } from '@/constants/spotFormOptions';
import { theme } from '@/constants/theme';
import type { Spot } from '@/types/spot';

type SpotDetailSheetProps = {
  selectedSpot: Spot;
  selectedSpotPhotoUris: string[];
  selectedSpotDisplayAddress: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClearSelected: () => void;
  onSubmitForReview: () => void;
  onEditSpot: () => void;
  onDeleteSpot: () => void;
  onOpenNavigation: () => void;
  onShareSpotInfo: () => void;
  onPickSpotPhoto: () => void;
  onRemoveSpotPhoto: (uri: string) => void;
};

const PET_FRIENDLY_DISPLAY_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: '非常友好',
  medium: '一般友好',
  low: '需确认',
};

const PRICE_LEVEL_DISPLAY_LABELS: Record<'$' | '$$' | '$$$', string> = {
  $: '$',
  $$: '$$',
  $$$: '$$$',
};

const MERCHANT_STATUS_DISPLAY_LABELS: Record<'none' | 'claimed', string> = {
  none: '未认领',
  claimed: '商家已认领',
};

export function SpotDetailSheet({
  selectedSpot,
  selectedSpotPhotoUris,
  selectedSpotDisplayAddress,
  isFavorite,
  onToggleFavorite,
  onClearSelected,
  onSubmitForReview,
  onEditSpot,
  onDeleteSpot,
  onOpenNavigation,
  onShareSpotInfo,
  onPickSpotPhoto,
  onRemoveSpotPhoto,
}: SpotDetailSheetProps) {
  const identityBadge = getSpotIdentityBadge(selectedSpot);
  const shouldShowPlatformMaintenanceHint = identityBadge.variant === 'system';
  const relatedActivities = ACTIVITY_COLLECTIONS.filter((activity) =>
    activity.spotIds.includes(selectedSpot.id)
  ).slice(0, 3);
  const visibleTags = selectedSpot.tags.slice(0, 4);
  const hiddenTagCount = Math.max(selectedSpot.tags.length - visibleTags.length, 0);
  const locationHint = [selectedSpot.district, selectedSpot.addressHint]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' · ');
  const showLocationHint = Boolean(locationHint) && locationHint !== selectedSpotDisplayAddress;
  const description = selectedSpot.description.trim();
  const hasBusinessInfo =
    Boolean(selectedSpot.merchantStatus) ||
    Boolean(selectedSpot.businessHours) ||
    Boolean(selectedSpot.contact);
  const quickFacts = [
    { key: 'votes', label: '热度', value: `${selectedSpot.votes}` },
    selectedSpot.petFriendlyLevel
      ? {
          key: 'pet-friendly',
          label: '友好度',
          value: PET_FRIENDLY_DISPLAY_LABELS[selectedSpot.petFriendlyLevel],
        }
      : null,
    selectedSpot.priceLevel
      ? {
          key: 'price',
          label: '价格',
          value: PRICE_LEVEL_DISPLAY_LABELS[selectedSpot.priceLevel],
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;
  const businessItems = [
    selectedSpot.businessHours
      ? { key: 'hours', label: '营业时间', value: selectedSpot.businessHours }
      : null,
    selectedSpot.contact ? { key: 'contact', label: '联系方式', value: selectedSpot.contact } : null,
    selectedSpot.merchantStatus
      ? {
          key: 'merchant',
          label: '商家状态',
          value: MERCHANT_STATUS_DISPLAY_LABELS[selectedSpot.merchantStatus],
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;
  const shouldShowPhotoSection = selectedSpot.source === 'user' || selectedSpotPhotoUris.length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>当前选中地点</Text>

      <View style={styles.heroHeader}>
        <View style={styles.heroCopy}>
          <Text style={styles.spotTitle}>{selectedSpot.name}</Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.badge, styles.typeBadge]}>{SPOT_TYPE_LABELS[selectedSpot.spotType]}</Text>
            <StatusBadge label={identityBadge.label} variant={identityBadge.variant} />
            {selectedSpot.verified ? <Text style={[styles.badge, styles.verifiedBadge]}>已认证</Text> : null}
          </View>
        </View>

        <Pressable
          onPress={onToggleFavorite}
          style={[styles.favoriteButton, isFavorite ? styles.favoriteButtonActive : null]}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={16}
            color={isFavorite ? '#1D4ED8' : theme.colors.textSecondary}
          />
          <Text style={[styles.favoriteButtonText, isFavorite ? styles.favoriteButtonTextActive : null]}>
            {isFavorite ? '已收藏' : '收藏'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.primaryMetaBlock}>
        <Text style={styles.spotMetaText}>{selectedSpotDisplayAddress}</Text>
        {showLocationHint ? <Text style={styles.spotSubMetaText}>{locationHint}</Text> : null}
      </View>

      <View style={styles.primaryActionRow}>
        <Pressable onPress={onOpenNavigation} style={[styles.primaryActionButton, styles.actionButtonWide]}>
          <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>去这里</Text>
        </Pressable>
        <Pressable onPress={onShareSpotInfo} style={styles.secondaryActionButton}>
          <Ionicons name="share-social-outline" size={15} color={theme.colors.textPrimary} />
          <Text style={styles.secondaryActionButtonText}>分享</Text>
        </Pressable>
      </View>

      {quickFacts.length > 0 ? (
        <View style={styles.quickFactsRow}>
          {quickFacts.map((item) => (
            <View key={item.key} style={styles.quickFactChip}>
              <Text style={styles.quickFactLabel}>{item.label}</Text>
              <Text style={styles.quickFactValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {visibleTags.length > 0 ? (
        <View style={styles.tagRow}>
          {visibleTags.map((tag) => (
            <Text key={tag} style={styles.tagChip}>
              {tag}
            </Text>
          ))}
          {hiddenTagCount > 0 ? <Text style={styles.tagMoreText}>+{hiddenTagCount}</Text> : null}
        </View>
      ) : null}

      {description ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>地点简介</Text>
          </View>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>
      ) : null}

      {shouldShowPhotoSection ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>图片</Text>
            {selectedSpot.source === 'user' ? (
              <Pressable onPress={onPickSpotPhoto} style={styles.sectionLinkButton}>
                <Ionicons name="add" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionLinkButtonText}>添加图片</Text>
              </Pressable>
            ) : null}
          </View>

          {selectedSpotPhotoUris.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}>
              {selectedSpotPhotoUris.map((uri) => (
                <View key={`${selectedSpot.id}-${uri}`} style={styles.userPhotoCard}>
                  <Image source={{ uri }} style={styles.userPhotoImage} />
                  {selectedSpot.source === 'user' ? (
                    <Pressable onPress={() => onRemoveSpotPhoto(uri)} style={styles.photoRemoveButton}>
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : selectedSpot.source === 'user' ? (
            <Pressable onPress={onPickSpotPhoto} style={styles.photoEmptyCard}>
              <Ionicons name="images-outline" size={18} color={theme.colors.textTertiary} />
              <Text style={styles.photoEmptyText}>还没有图片，点击添加第一张</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {relatedActivities.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>相关活动</Text>
            <Text style={styles.sectionCaption}>{relatedActivities.length} 条</Text>
          </View>

          <View style={styles.relatedActivitiesList}>
            {relatedActivities.map((activity) => (
              <Pressable
                key={activity.key}
                onPress={() => router.push(`/activity/${activity.key}`)}
                style={styles.relatedActivityCard}>
                <View style={styles.relatedActivityTopRow}>
                  <StatusBadge
                    label={activity.statusLabel}
                    variant={activity.interactionMode === 'upcoming' ? 'pending' : 'system'}
                  />
                </View>
                <Text style={styles.relatedActivityTitle} numberOfLines={1}>
                  {activity.title}
                </Text>
                <Text style={styles.relatedActivitySummary} numberOfLines={2}>
                  {activity.summary}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {hasBusinessInfo ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>补充信息</Text>
          </View>
          <View style={styles.detailList}>
            {businessItems.map((item) => (
              <View key={item.key} style={styles.detailItem}>
                <Text style={styles.detailItemLabel}>{item.label}</Text>
                <Text style={styles.detailItemValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {shouldShowPlatformMaintenanceHint ? (
        <View style={[styles.section, styles.platformSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>信息维护</Text>
          </View>
          <View style={styles.platformStateRow}>
            <Text style={styles.platformStateChip}>平台整理中</Text>
            <Text style={styles.platformComingSoonChip}>商家认领即将支持</Text>
          </View>
          <Text style={styles.platformHintText}>
            该地点由平台整理维护，欢迎反馈修正；商家认领后可支持信息更新。
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/feedback',
                params: {
                  type: 'spot',
                  contextType: 'spot',
                  spotId: selectedSpot.id,
                  spotName: selectedSpot.name,
                  spotAddress: selectedSpotDisplayAddress,
                  spotIdentityLabel: identityBadge.label,
                },
              })
            }
            style={styles.platformFeedbackButton}>
            <Text style={styles.platformFeedbackButtonText}>反馈地点信息</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>更多操作</Text>
        </View>

        <View style={styles.secondaryActionsGroup}>
          <Pressable onPress={onClearSelected} style={styles.ghostActionButton}>
            <Text style={styles.ghostActionButtonText}>清空选择</Text>
          </Pressable>

          {selectedSpot.source === 'user' && selectedSpot.submissionStatus !== 'pending_review' ? (
            <Pressable onPress={onSubmitForReview} style={styles.ghostActionButton}>
              <Text style={styles.ghostActionButtonText}>提交审核</Text>
            </Pressable>
          ) : null}

          {selectedSpot.source === 'user' ? (
            <Pressable onPress={onEditSpot} style={styles.ghostActionButton}>
              <Text style={styles.ghostActionButtonText}>编辑地点</Text>
            </Pressable>
          ) : null}

          {selectedSpot.source === 'user' ? (
            <Pressable onPress={onDeleteSpot} style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>删除地点</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: 8,
  },
  heroCopy: {
    flex: 1,
  },
  spotTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 10,
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: theme.colors.chipBackground,
    color: theme.colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    color: theme.colors.success,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  favoriteButtonActive: {
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
  },
  favoriteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  favoriteButtonTextActive: {
    color: theme.colors.primary,
  },
  primaryMetaBlock: {
    marginTop: 12,
    gap: 4,
  },
  spotMetaText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  spotSubMetaText: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textTertiary,
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: 14,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  actionButtonWide: {
    flex: 1,
  },
  primaryActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionButton: {
    minWidth: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quickFactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 12,
  },
  quickFactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickFactLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  quickFactValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 12,
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
  tagMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  section: {
    marginTop: 18,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionCaption: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sectionLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionLinkButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  photoRow: {
    gap: theme.spacing.sm,
  },
  userPhotoCard: {
    width: 156,
    height: 112,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    position: 'relative',
  },
  userPhotoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 19, 36, 0.65)',
  },
  photoEmptyCard: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  relatedActivitiesList: {
    gap: 8,
  },
  relatedActivityCard: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  relatedActivityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relatedActivityTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  relatedActivitySummary: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  detailList: {
    gap: 8,
  },
  detailItem: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  detailItemLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  detailItemValue: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textPrimary,
  },
  platformSection: {
    gap: 12,
  },
  platformStateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  platformStateChip: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  platformComingSoonChip: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  platformHintText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  platformFeedbackButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  platformFeedbackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  secondaryActionsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  ghostActionButton: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ghostActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  dangerButton: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger,
  },
});

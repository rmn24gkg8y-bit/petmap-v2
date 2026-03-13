import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  SPOT_TYPE_LABELS,
} from '@/constants/spotFormOptions';
import { getSpotIdentityBadge } from '@/constants/spotIdentity';
import { theme } from '@/constants/theme';
import { StatusBadge } from '@/components/ui';
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
  const hasCoreMetaInfo =
    Boolean(selectedSpot.petFriendlyLevel) ||
    Boolean(selectedSpot.priceLevel);
  const hasAuxiliaryInfo =
    Boolean(selectedSpot.merchantStatus) ||
    Boolean(selectedSpot.businessHours) ||
    Boolean(selectedSpot.contact);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>当前选中地点</Text>
      <Text style={styles.spotTitle}>{selectedSpot.name}</Text>
      <View style={styles.badgeRow}>
        <Text style={[styles.badge, styles.typeBadge]}>{SPOT_TYPE_LABELS[selectedSpot.spotType]}</Text>
        <StatusBadge label={identityBadge.label} variant={identityBadge.variant} />
        {selectedSpot.verified ? <Text style={[styles.badge, styles.verifiedBadge]}>已认证</Text> : null}
      </View>
      <View style={styles.addressBlock}>
        <Text style={styles.spotMetaText}>{selectedSpotDisplayAddress}</Text>
      </View>
      <View style={styles.quickActionsRow}>
        <Pressable onPress={onOpenNavigation} style={styles.quickActionChip}>
          <Ionicons name="navigate-outline" size={15} color="#1F2937" />
          <Text style={styles.quickActionChipText}>去这里</Text>
        </Pressable>
        <Pressable onPress={onShareSpotInfo} style={styles.quickActionChip}>
          <Ionicons name="share-social-outline" size={15} color="#1F2937" />
          <Text style={styles.quickActionChipText}>分享地点</Text>
        </Pressable>
      </View>
      {hasCoreMetaInfo ? (
        <View style={styles.infoRow}>
          {selectedSpot.petFriendlyLevel ? (
            <Text style={styles.infoChip}>
              友好度：{PET_FRIENDLY_DISPLAY_LABELS[selectedSpot.petFriendlyLevel]}
            </Text>
          ) : null}
          {selectedSpot.priceLevel ? (
            <Text style={styles.infoChip}>
              价格：{PRICE_LEVEL_DISPLAY_LABELS[selectedSpot.priceLevel]}
            </Text>
          ) : null}
        </View>
      ) : null}
      {selectedSpot.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {selectedSpot.tags.map((tag) => (
            <Text key={tag} style={styles.tagChip}>
              {tag}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.photoSection}>
        <View style={styles.photoSectionHeader}>
          <Text style={styles.photoSectionTitle}>图片预览</Text>
          {selectedSpot.source === 'user' ? (
            <Pressable onPress={onPickSpotPhoto} style={styles.photoAddButton}>
              <Ionicons name="add" size={14} color="#1D4ED8" />
              <Text style={styles.photoAddButtonText}>添加图片</Text>
            </Pressable>
          ) : (
            <Text style={styles.photoSectionHint}>即将支持</Text>
          )}
        </View>
        {selectedSpot.source === 'user' ? (
          selectedSpotPhotoUris.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}>
              {selectedSpotPhotoUris.map((uri) => (
                <View key={`${selectedSpot.id}-${uri}`} style={styles.userPhotoCard}>
                  <Image source={{ uri }} style={styles.userPhotoImage} />
                  <Pressable onPress={() => onRemoveSpotPhoto(uri)} style={styles.photoRemoveButton}>
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Pressable onPress={onPickSpotPhoto} style={styles.photoEmptyCard}>
              <Ionicons name="images-outline" size={18} color="#6B7280" />
              <Text style={styles.photoEmptyText}>还没有图片，点击添加第一张</Text>
            </Pressable>
          )
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.photoPlaceholderCard}>
                <Text style={styles.photoPlaceholderIcon}>+</Text>
                <Text style={styles.photoPlaceholderText}>未来可展示地点图片</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      {hasAuxiliaryInfo ? (
        <View style={styles.metaList}>
          {selectedSpot.merchantStatus ? (
            <Text style={styles.metaItem}>
              商家状态：{MERCHANT_STATUS_DISPLAY_LABELS[selectedSpot.merchantStatus]}
            </Text>
          ) : null}
          {selectedSpot.businessHours ? (
            <Text style={styles.metaItem}>营业时间：{selectedSpot.businessHours}</Text>
          ) : null}
          {selectedSpot.contact ? <Text style={styles.metaItem}>联系方式：{selectedSpot.contact}</Text> : null}
        </View>
      ) : null}
      {shouldShowPlatformMaintenanceHint ? (
        <View style={styles.platformHintSection}>
          <View style={styles.platformStateRow}>
            <Text style={styles.platformStateChip}>信息持续整理中</Text>
          </View>
          <Text style={styles.platformHintText}>
            该地点由平台整理维护，欢迎反馈修正；商家认领后可支持信息更新。
          </Text>
          <View style={styles.platformHintActions}>
            <Text style={styles.platformComingSoonChip}>商家认领（即将支持）</Text>
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
        </View>
      ) : null}
      <Text style={styles.cardDescription}>
        {selectedSpot.description || '暂无地点简介，后续可以继续补充。'}
      </Text>
      <View style={styles.detailMetaRow}>
        <Text style={styles.detailMetaLabel}>热度</Text>
        <Text style={styles.votes}>{selectedSpot.votes} votes</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onToggleFavorite} style={styles.primaryActionButton}>
          <Text style={styles.primaryActionText}>{isFavorite ? '已收藏' : '收藏'}</Text>
        </Pressable>

        <Pressable onPress={onClearSelected} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>清空选择</Text>
        </Pressable>

        {selectedSpot.source === 'user' && selectedSpot.submissionStatus !== 'pending_review' ? (
          <Pressable onPress={onSubmitForReview} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>提交审核</Text>
          </Pressable>
        ) : null}

        {selectedSpot.source === 'user' ? (
          <Pressable onPress={onEditSpot} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>编辑地点</Text>
          </Pressable>
        ) : null}

        {selectedSpot.source === 'user' ? (
          <Pressable onPress={onDeleteSpot} style={styles.dangerButton}>
            <Text style={styles.dangerButtonText}>删除地点</Text>
          </Pressable>
        ) : null}
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
    paddingBottom: theme.spacing.sm,
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
  spotTitle: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 12,
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
  addressBlock: {
    marginTop: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 10,
  },
  infoChip: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  metaList: {
    marginTop: 8,
    gap: 6,
  },
  metaItem: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  platformHintSection: {
    marginTop: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  platformHintText: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  platformStateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  platformHintActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  platformComingSoonChip: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  platformFeedbackButton: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  platformFeedbackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  spotMetaText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 10,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickActionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 10,
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
  photoSection: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  photoAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoAddButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  photoSectionHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  photoRow: {
    gap: 12,
    paddingTop: 12,
    paddingBottom: 2,
  },
  photoPlaceholderCard: {
    width: 152,
    height: 110,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  photoPlaceholderIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: theme.colors.textSecondary,
  },
  photoPlaceholderText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: theme.colors.textTertiary,
  },
  photoEmptyCard: {
    marginTop: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  photoEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  userPhotoCard: {
    width: 152,
    height: 110,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  userPhotoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  detailMetaLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  votes: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 16,
  },
  primaryActionButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dangerButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.danger,
  },
});

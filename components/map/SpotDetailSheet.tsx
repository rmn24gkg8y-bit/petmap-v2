import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>当前选中地点</Text>
      <Text style={styles.spotTitle}>{selectedSpot.name}</Text>
      <View style={styles.badgeRow}>
        <Text
          style={[
            styles.badge,
            selectedSpot.source === 'user' ? styles.userBadge : styles.systemBadge,
          ]}>
          {selectedSpot.source === 'user' ? '我添加的' : '系统收录'}
        </Text>
        {selectedSpot.source === 'user' ? (
          <Text
            style={[
              styles.badge,
              selectedSpot.submissionStatus === 'pending_review'
                ? styles.pendingBadge
                : styles.localBadge,
            ]}>
            {selectedSpot.submissionStatus === 'pending_review' ? '待审核' : '仅本机保存'}
          </Text>
        ) : null}
      </View>
      <View style={styles.addressBlock}>
        <Text style={styles.addressLabel}>
          {selectedSpot.formattedAddress ? '真实地址' : '位置说明'}
        </Text>
        <Text style={styles.spotMetaText}>{selectedSpotDisplayAddress}</Text>
      </View>
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
      <Text style={styles.cardDescription}>
        {selectedSpot.description || '暂无地点简介，后续可以继续补充。'}
      </Text>
      <View style={styles.detailMetaRow}>
        <Text style={styles.detailMetaLabel}>热度</Text>
        <Text style={styles.votes}>{selectedSpot.votes} votes</Text>
      </View>

      <View style={styles.spotActionsRow}>
        <Pressable onPress={onOpenNavigation} style={styles.spotActionChip}>
          <Ionicons name="navigate-outline" size={15} color="#1F2937" />
          <Text style={styles.spotActionChipText}>去这里</Text>
        </Pressable>
        <Pressable onPress={onShareSpotInfo} style={styles.spotActionChip}>
          <Ionicons name="share-social-outline" size={15} color="#1F2937" />
          <Text style={styles.spotActionChipText}>分享地点</Text>
        </Pressable>
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
  userBadge: {
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primary,
  },
  systemBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textSecondary,
  },
  pendingBadge: {
    backgroundColor: '#FFEDD5',
    color: theme.colors.warning,
  },
  localBadge: {
    backgroundColor: '#DCFCE7',
    color: theme.colors.success,
  },
  addressBlock: {
    marginTop: 12,
    gap: 6,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  spotMetaText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 14,
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
  spotActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 12,
  },
  spotActionChip: {
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
  spotActionChipText: {
    fontSize: 12,
    fontWeight: '600',
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

import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DISTRICT_OPTIONS,
  PET_FRIENDLY_LEVEL_LABELS,
  PET_FRIENDLY_LEVEL_OPTIONS,
  SPOT_TYPE_LABELS,
  SPOT_TYPE_OPTIONS,
  TAG_OPTIONS,
} from '@/constants/spotFormOptions';
import type { Spot } from '@/types/spot';

type SpotFormValues = {
  name: string;
  district: string;
  addressHint: string;
  description: string;
  petFriendlyLevel: Spot['petFriendlyLevel'] | '';
  businessHours: string;
  contact: string;
  tags: string[];
  spotType: Spot['spotType'];
};

type SpotFormModalProps = {
  visible: boolean;
  modalMode: 'create' | 'edit';
  isAdminMode?: boolean;
  showSpotTypeField?: boolean;
  formValues: SpotFormValues;
  pendingFormattedAddress: string;
  isResolvingPendingAddress: boolean;
  shouldUseReadonlyDistrict: boolean;
  formError: string;
  pendingCoords: { lat: number; lng: number } | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  onUpdateField: (field: Exclude<keyof SpotFormValues, 'tags'>, value: string) => void;
  onToggleTag: (tag: string) => void;
  createCoverPhotoUri?: string | null;
  onPickCreateCoverPhoto?: () => void | Promise<void>;
  onRemoveCreateCoverPhoto?: () => void;
};

export function SpotFormModal({
  visible,
  modalMode,
  isAdminMode = false,
  showSpotTypeField = false,
  formValues,
  pendingFormattedAddress,
  isResolvingPendingAddress,
  shouldUseReadonlyDistrict,
  formError,
  pendingCoords,
  isSubmitting = false,
  onClose,
  onSubmit,
  onUpdateField,
  onToggleTag,
  createCoverPhotoUri = null,
  onPickCreateCoverPhoto,
  onRemoveCreateCoverPhoto,
}: SpotFormModalProps) {
  const isAdminCreate = isAdminMode && modalMode === 'create';
  const isCreateMode = modalMode === 'create';

  const titleText = modalMode === 'edit'
    ? '编辑地点'
    : isAdminMode ? '发布系统地点' : '新增地点';

  const titleSub = modalMode === 'edit'
    ? '修改地点信息，坐标保持不变'
    : isAdminMode
      ? '填写信息后直接发布到地图，立即可见'
      : '补充基础信息后即可保存到地图';

  const ctaPrimaryText = modalMode === 'edit'
    ? '保存修改'
    : isAdminMode ? '发布地点' : '保存地点';

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>

          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Title area */}
          <View style={styles.titleArea}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{titleText}</Text>
              {isAdminCreate ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>管理员</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.titleSub}>{titleSub}</Text>
          </View>

          {/* ── Form ─────────────────────────────────────────────── */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}>

            {/* 基本信息 */}
            <Text style={styles.sectionTitle}>基本信息</Text>
            <View style={styles.sectionGroup}>
              <TextInput
                value={formValues.name}
                onChangeText={(v) => onUpdateField('name', v)}
                placeholder="地点名称"
                placeholderTextColor="#C4B8A8"
                style={styles.fieldInput}
              />
              <View style={styles.divider} />

              {/* 真实地址 */}
              <View style={styles.fieldInfoSection}>
                <Text style={styles.fieldInfoLabel}>真实地址</Text>
                <Text style={styles.fieldInfoValue}>
                  {isResolvingPendingAddress
                    ? '正在获取真实地址…'
                    : pendingFormattedAddress || '暂未获取到'}
                </Text>
              </View>
              {modalMode === 'create' && !isResolvingPendingAddress && !pendingFormattedAddress.trim() ? (
                <Text style={styles.fieldHint}>
                  当前网络下未获取到地址，可手动选择所属区后继续保存
                </Text>
              ) : null}

              <View style={styles.divider} />
              <TextInput
                value={formValues.addressHint}
                onChangeText={(v) => onUpdateField('addressHint', v)}
                placeholder="位置补充说明（选填），如靠近北门"
                placeholderTextColor="#C4B8A8"
                style={styles.fieldInput}
              />
              <View style={styles.divider} />

              {/* 所属区 */}
              {shouldUseReadonlyDistrict ? (
                <View style={styles.fieldInfoSection}>
                  <Text style={styles.fieldInfoLabel}>所属区</Text>
                  <Text style={styles.fieldInfoValue}>{formValues.district}</Text>
                </View>
              ) : (
                <View style={styles.chipsField}>
                  <Text style={styles.fieldLabel}>所属区</Text>
                  <View style={styles.chipsRow}>
                    {DISTRICT_OPTIONS.map((district) => {
                      const isSelected = formValues.district === district;
                      return (
                        <Pressable
                          key={district}
                          onPress={() => onUpdateField('district', district)}
                          style={({ pressed }) => [styles.chip, isSelected ? styles.chipActive : styles.chipInactive, pressed && styles.chipPressed]}>
                          <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextInactive]}>
                            {district}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 地点类型（管理员新增 + 系统地点编辑） */}
              {showSpotTypeField ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.chipsField}>
                    <Text style={styles.fieldLabel}>地点类型</Text>
                    <View style={styles.chipsRow}>
                      {SPOT_TYPE_OPTIONS.map((type) => {
                        const isSelected = formValues.spotType === type;
                        return (
                          <Pressable
                            key={type}
                            onPress={() => onUpdateField('spotType', type)}
                            style={({ pressed }) => [styles.chip, isSelected ? styles.chipActive : styles.chipInactive, pressed && styles.chipPressed]}>
                            <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextInactive]}>
                              {SPOT_TYPE_LABELS[type]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            {/* 更多信息（选填） */}
            <Text style={styles.sectionTitle}>更多信息（选填）</Text>
            <View style={styles.sectionGroup}>
              <TextInput
                value={formValues.description}
                onChangeText={(v) => onUpdateField('description', v)}
                placeholder="地点描述（选填）"
                placeholderTextColor="#C4B8A8"
                style={[styles.fieldInput, styles.fieldTextarea]}
                multiline
              />
              <View style={styles.divider} />

              <View style={styles.chipsField}>
                <Text style={styles.fieldLabel}>宠物友好度</Text>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => onUpdateField('petFriendlyLevel', '')}
                    style={({ pressed }) => [styles.chip, formValues.petFriendlyLevel === '' ? styles.chipActive : styles.chipInactive, pressed && styles.chipPressed]}>
                    <Text style={[styles.chipText, formValues.petFriendlyLevel === '' ? styles.chipTextActive : styles.chipTextInactive]}>
                      未设置
                    </Text>
                  </Pressable>
                  {PET_FRIENDLY_LEVEL_OPTIONS.map((level) => {
                    const isSelected = formValues.petFriendlyLevel === level;
                    return (
                      <Pressable
                        key={level}
                        onPress={() => onUpdateField('petFriendlyLevel', level)}
                        style={({ pressed }) => [styles.chip, isSelected ? styles.chipActive : styles.chipInactive, pressed && styles.chipPressed]}>
                        <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextInactive]}>
                          {PET_FRIENDLY_LEVEL_LABELS[level]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.divider} />

              <TextInput
                value={formValues.businessHours}
                onChangeText={(v) => onUpdateField('businessHours', v)}
                placeholder="营业时间（选填），如 10:00–20:00"
                placeholderTextColor="#C4B8A8"
                style={styles.fieldInput}
              />
              <View style={styles.divider} />
              <TextInput
                value={formValues.contact}
                onChangeText={(v) => onUpdateField('contact', v)}
                placeholder="联系方式（选填），如电话 / 微信"
                placeholderTextColor="#C4B8A8"
                style={styles.fieldInput}
              />
            </View>

            {isCreateMode ? (
              <>
                <Text style={styles.sectionTitle}>首图（选填）</Text>
                <View style={styles.sectionGroup}>
                  <View style={styles.coverField}>
                    {createCoverPhotoUri ? (
                      <View style={styles.coverPreviewWrap}>
                        <Image source={{ uri: createCoverPhotoUri }} style={styles.coverPreviewImage} />
                        <View style={styles.coverActionsRow}>
                          <Pressable
                            onPress={onPickCreateCoverPhoto}
                            style={({ pressed }) => [styles.coverActionButton, pressed && styles.chipPressed]}>
                            <Text style={styles.coverActionButtonText}>更换图片</Text>
                          </Pressable>
                          <Pressable
                            onPress={onRemoveCreateCoverPhoto}
                            style={({ pressed }) => [styles.coverActionButtonGhost, pressed && styles.chipPressed]}>
                            <Text style={styles.coverActionButtonGhostText}>移除</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={onPickCreateCoverPhoto}
                        style={({ pressed }) => [styles.coverEmptyButton, pressed && styles.chipPressed]}>
                        <Text style={styles.coverEmptyButtonTitle}>上传首图</Text>
                        <Text style={styles.coverEmptyButtonHint}>可选，创建后可在卡片和详情中立即看到</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </>
            ) : null}

            {/* 标签 */}
            <Text style={styles.sectionTitle}>标签</Text>
            <View style={styles.sectionGroup}>
              <View style={styles.chipsField}>
                <Text style={styles.fieldHintSmall}>点击下方选择，可多选</Text>
                <View style={styles.chipsRow}>
                  {TAG_OPTIONS.map((tag) => {
                    const isSelected = formValues.tags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => onToggleTag(tag)}
                        style={({ pressed }) => [styles.chip, isSelected ? styles.chipActive : styles.chipInactive, pressed && styles.chipPressed]}>
                        <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextInactive]}>
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            {pendingCoords ? (
              <Text style={styles.coordsText}>
                {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
              </Text>
            ) : null}

          </ScrollView>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.ctaCancel, pressed && styles.ctaPressed]}>
              <Text style={styles.ctaCancelText}>取消</Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.ctaPrimary,
                isAdminCreate && styles.ctaPrimaryAdmin,
                pressed && styles.ctaPressed,
                isSubmitting && styles.ctaSubmitting,
              ]}>
              <Text style={styles.ctaPrimaryText}>{isSubmitting ? '提交中…' : ctaPrimaryText}</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 19, 36, 0.35)',
  },
  sheet: {
    height: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFEFF',
  },

  // ── Handle ────────────────────────────────────────────────────────
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E0D8D0',
  },

  // ── Title area ────────────────────────────────────────────────────
  titleArea: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEE9',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 28,
  },
  titleSub: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B0ABA4',
  },
  adminBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(237,132,34,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ED8422',
  },

  // ── Form scroll ───────────────────────────────────────────────────
  formScroll: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  formContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // ── Section ───────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ED8422',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionGroup: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EEE9',
  },

  // ── Field inputs (inside sectionGroup) ────────────────────────────
  fieldInput: {
    minHeight: 52,
    fontSize: 15,
    color: '#303030',
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  fieldTextarea: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // ── Field info rows (read-only) ───────────────────────────────────
  fieldInfoSection: {
    paddingVertical: 12,
    gap: 3,
  },
  fieldInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0ABA4',
    letterSpacing: 0.2,
  },
  fieldInfoValue: {
    fontSize: 15,
    color: '#303030',
    lineHeight: 22,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#B0ABA4',
    paddingBottom: 12,
  },

  // ── Chips field (label + chip grid) ──────────────────────────────
  chipsField: {
    paddingVertical: 14,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303030',
  },
  fieldHintSmall: {
    fontSize: 12,
    color: '#B0ABA4',
  },
  coverField: {
    paddingVertical: 14,
  },
  coverPreviewWrap: {
    gap: 10,
  },
  coverPreviewImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#EFE9E1',
  },
  coverActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coverActionButton: {
    borderRadius: 999,
    backgroundColor: '#ED8422',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  coverActionButtonGhost: {
    borderRadius: 999,
    backgroundColor: '#F0EEE9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverActionButtonGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6258',
  },
  coverEmptyButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9E2D8',
    backgroundColor: '#FFFCF8',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  coverEmptyButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303030',
  },
  coverEmptyButtonHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9D9488',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // ── Chips ─────────────────────────────────────────────────────────
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#ED8422',
  },
  chipInactive: {
    backgroundColor: '#F0EEE9',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: '#6B6258',
  },
  chipPressed: {
    opacity: 0.72,
  },

  // ── Error / Coords ────────────────────────────────────────────────
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#DC2626',
    paddingHorizontal: 4,
  },
  coordsText: {
    marginTop: 4,
    fontSize: 11,
    color: '#B0ABA4',
    opacity: 0.25,
    paddingHorizontal: 4,
  },

  // ── CTA ───────────────────────────────────────────────────────────
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EEE9',
    backgroundColor: '#FFFEFF',
  },
  ctaCancel: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F0EEE9',
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#ED8422',
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaPrimaryAdmin: {
    backgroundColor: '#2EA65A',
  },
  ctaPressed: {
    opacity: 0.82,
  },
  ctaSubmitting: {
    opacity: 0.62,
  },
  ctaCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B6258',
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

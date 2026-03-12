import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DISTRICT_OPTIONS,
  PET_FRIENDLY_LEVEL_LABELS,
  PET_FRIENDLY_LEVEL_OPTIONS,
  TAG_OPTIONS,
} from '@/constants/spotFormOptions';
import { theme } from '@/constants/theme';
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
};

type SpotFormModalProps = {
  visible: boolean;
  modalMode: 'create' | 'edit';
  formValues: SpotFormValues;
  pendingFormattedAddress: string;
  isResolvingPendingAddress: boolean;
  shouldUseReadonlyDistrict: boolean;
  formError: string;
  pendingCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onSubmit: () => void;
  onUpdateField: (field: Exclude<keyof SpotFormValues, 'tags'>, value: string) => void;
  onToggleTag: (tag: string) => void;
};

export function SpotFormModal({
  visible,
  modalMode,
  formValues,
  pendingFormattedAddress,
  isResolvingPendingAddress,
  shouldUseReadonlyDistrict,
  formError,
  pendingCoords,
  onClose,
  onSubmit,
  onUpdateField,
  onToggleTag,
}: SpotFormModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{modalMode === 'edit' ? '编辑地点' : '新增地点'}</Text>
          <Text style={styles.modalSubtitle}>
            {modalMode === 'edit'
              ? '修改当前地点信息，坐标将保持不变。'
              : '长按位置已记录，补充基础信息后即可保存。'}
          </Text>
          <Text style={styles.modalHelperText}>标签支持使用逗号分隔，当前仅保存在本机。</Text>

          <ScrollView
            style={styles.modalForm}
            contentContainerStyle={styles.modalFormContent}
            showsVerticalScrollIndicator={false}>
            <TextInput
              value={formValues.name}
              onChangeText={(value) => onUpdateField('name', value)}
              placeholder="地点名称"
              style={styles.input}
            />
            <View style={styles.formattedAddressSection}>
              <Text style={styles.formattedAddressLabel}>真实地址</Text>
              <View style={styles.formattedAddressBox}>
                <Text style={styles.formattedAddressText}>
                  {isResolvingPendingAddress
                    ? '正在获取真实地址...'
                    : pendingFormattedAddress || '暂未获取到真实地址'}
                </Text>
              </View>
              {modalMode === 'create' && !isResolvingPendingAddress && !pendingFormattedAddress.trim() ? (
                <Text style={styles.formattedAddressHintText}>
                  当前网络环境下暂未获取到真实地址，可手动选择所属区后继续保存
                </Text>
              ) : null}
            </View>
            <TextInput
              value={formValues.addressHint}
              onChangeText={(value) => onUpdateField('addressHint', value)}
              placeholder="位置补充说明（选填），例如靠近北门 / 入口在侧边"
              style={styles.input}
            />
            {shouldUseReadonlyDistrict ? (
              <View style={styles.formattedAddressSection}>
                <Text style={styles.formattedAddressLabel}>所属区</Text>
                <View style={styles.formattedAddressBox}>
                  <Text style={styles.formattedAddressText}>{formValues.district}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>所属区</Text>
                <View style={styles.chipGroup}>
                  {DISTRICT_OPTIONS.map((district) => {
                    const isSelected = formValues.district === district;

                    return (
                      <Pressable
                        key={district}
                        onPress={() => onUpdateField('district', district)}
                        style={[
                          styles.optionChip,
                          isSelected ? styles.optionChipActive : styles.optionChipInactive,
                        ]}>
                        <Text
                          style={[
                            styles.optionChipText,
                            isSelected ? styles.optionChipTextActive : styles.optionChipTextInactive,
                          ]}>
                          {district}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <TextInput
              value={formValues.description}
              onChangeText={(value) => onUpdateField('description', value)}
              placeholder="地点描述（选填）"
              style={[styles.input, styles.textarea]}
              multiline
            />
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>宠物友好度</Text>
              <View style={styles.chipGroup}>
                <Pressable
                  onPress={() => onUpdateField('petFriendlyLevel', '')}
                  style={[
                    styles.optionChip,
                    formValues.petFriendlyLevel === ''
                      ? styles.optionChipActive
                      : styles.optionChipInactive,
                  ]}>
                  <Text
                    style={[
                      styles.optionChipText,
                      formValues.petFriendlyLevel === ''
                        ? styles.optionChipTextActive
                        : styles.optionChipTextInactive,
                    ]}>
                    未设置
                  </Text>
                </Pressable>
                {PET_FRIENDLY_LEVEL_OPTIONS.map((level) => {
                  const isSelected = formValues.petFriendlyLevel === level;

                  return (
                    <Pressable
                      key={level}
                      onPress={() => onUpdateField('petFriendlyLevel', level)}
                      style={[
                        styles.optionChip,
                        isSelected ? styles.optionChipActive : styles.optionChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.optionChipText,
                          isSelected ? styles.optionChipTextActive : styles.optionChipTextInactive,
                        ]}>
                        {PET_FRIENDLY_LEVEL_LABELS[level]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <TextInput
              value={formValues.businessHours}
              onChangeText={(value) => onUpdateField('businessHours', value)}
              placeholder="营业时间（选填），例如 10:00 - 20:00"
              style={styles.input}
            />
            <TextInput
              value={formValues.contact}
              onChangeText={(value) => onUpdateField('contact', value)}
              placeholder="联系方式（选填），例如 电话 / 微信"
              style={styles.input}
            />
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>标签</Text>
              <View style={styles.chipGroup}>
                {TAG_OPTIONS.map((tag) => {
                  const isSelected = formValues.tags.includes(tag);

                  return (
                    <Pressable
                      key={tag}
                      onPress={() => onToggleTag(tag)}
                      style={[
                        styles.optionChip,
                        isSelected ? styles.optionChipActive : styles.optionChipInactive,
                      ]}>
                      <Text
                        style={[
                          styles.optionChipText,
                          isSelected ? styles.optionChipTextActive : styles.optionChipTextInactive,
                        ]}>
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

            {pendingCoords ? (
              <Text style={styles.coordsText}>
                坐标：{pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalSecondaryButton}>
              <Text style={styles.modalSecondaryButtonText}>取消</Text>
            </Pressable>
            <Pressable onPress={onSubmit} style={styles.modalPrimaryButton}>
              <Text style={styles.modalPrimaryButtonText}>
                {modalMode === 'edit' ? '保存修改' : '保存地点'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 19, 36, 0.35)',
  },
  modalCard: {
    maxHeight: '78%',
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + theme.spacing.xs,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  modalHelperText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textTertiary,
  },
  modalForm: {
    marginTop: theme.spacing.md,
  },
  modalFormContent: {
    gap: theme.spacing.sm,
    paddingBottom: 8,
  },
  formattedAddressSection: {
    gap: 8,
  },
  formattedAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  formattedAddressBox: {
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.pageBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formattedAddressText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  formattedAddressHintText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textTertiary,
  },
  optionSection: {
    gap: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm - 2,
  },
  optionChip: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary,
  },
  optionChipInactive: {
    backgroundColor: theme.colors.chipBackground,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  optionChipTextInactive: {
    color: theme.colors.textPrimary,
  },
  input: {
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.pageBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  coordsText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  formErrorText: {
    fontSize: 13,
    color: theme.colors.danger,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.chipBackground,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

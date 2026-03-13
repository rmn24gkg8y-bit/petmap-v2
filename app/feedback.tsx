import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, SectionHeader, TagChip } from '@/components/ui';
import { theme } from '@/constants/theme';

type FeedbackTypeKey = 'spot' | 'activity' | 'product' | 'bug';

const FEEDBACK_TYPES: Array<{
  key: FeedbackTypeKey;
  label: string;
  description: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
}> = [
  {
    key: 'spot',
    label: '地点信息反馈',
    description: '适合补充地点营业状态、地址、宠物友好信息等内容。',
    titlePlaceholder: '例如：XX 地点的营业信息需要更新',
    contentPlaceholder: '请尽量写清地点名称、哪里不准确，以及建议如何更新。',
  },
  {
    key: 'activity',
    label: '活动内容反馈',
    description: '适合反馈活动信息、专题内容、入口文案或展示问题。',
    titlePlaceholder: '例如：活动专题信息建议补充',
    contentPlaceholder: '请描述是哪一条活动或专题、你发现了什么问题，或希望补充什么信息。',
  },
  {
    key: 'product',
    label: '产品建议',
    description: '适合提出新的功能想法、体验建议或内容方向建议。',
    titlePlaceholder: '例如：希望 Explore 支持更多筛选',
    contentPlaceholder: '可以写下你希望优化的使用场景、问题感受，或理想中的改进方式。',
  },
  {
    key: 'bug',
    label: 'Bug 反馈',
    description: '适合反馈页面异常、交互问题、显示错误或流程中断。',
    titlePlaceholder: '例如：收藏列表进入后偶现空白',
    contentPlaceholder: '请尽量描述发生页面、操作步骤、出现结果，以及你原本期待的结果。',
  },
];

function getFeedbackTypeConfig(type: FeedbackTypeKey) {
  return FEEDBACK_TYPES.find((item) => item.key === type) ?? FEEDBACK_TYPES[0];
}

export default function FeedbackScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    contextType?: string;
    spotId?: string;
    spotName?: string;
    spotAddress?: string;
    spotIdentityLabel?: string;
  }>();
  const contextType = Array.isArray(params.contextType) ? params.contextType[0] : params.contextType;
  const spotName = Array.isArray(params.spotName) ? params.spotName[0] : params.spotName;
  const spotAddress = Array.isArray(params.spotAddress) ? params.spotAddress[0] : params.spotAddress;
  const spotIdentityLabel = Array.isArray(params.spotIdentityLabel)
    ? params.spotIdentityLabel[0]
    : params.spotIdentityLabel;
  const hasSpotContext = contextType === 'spot' && Boolean(spotName);
  const defaultType: FeedbackTypeKey = 'spot';
  const [selectedType, setSelectedType] = useState<FeedbackTypeKey>(defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const activeType = getFeedbackTypeConfig(selectedType);
  const titlePlaceholder =
    hasSpotContext && selectedType === 'spot'
      ? `例如：${spotName}的信息需要更新`
      : activeType.titlePlaceholder;
  const contentPlaceholder =
    hasSpotContext && selectedType === 'spot'
      ? '请说明这个地点的哪部分信息不准确，例如地址、营业状态、宠物友好信息、图片或标签等。'
      : activeType.contentPlaceholder;
  const helperText = hasSpotContext
    ? '当前反馈会保留地点上下文，方便你连续补充同一地点的问题。'
    : '当前会先完成前台反馈闭环，后续也会逐步支持从地点页或活动页带入上下文信息。';

  function handleSubmitFeedback() {
    if (!content.trim()) {
      Alert.alert('请补充反馈内容', '至少写下你遇到的问题、建议，或需要我们核对的信息。');
      return;
    }

    Alert.alert('反馈已收到', '感谢你的反馈，我们会结合内容持续整理和优化。');
    setSelectedType(defaultType);
    setTitle('');
    setContent('');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '意见反馈' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="产品共建"
          title="意见反馈"
          subtitle="你可以在这里反馈地点信息、活动内容、产品建议或使用问题。"
          style={styles.header}
        />

        <View style={styles.card}>
          {hasSpotContext ? (
            <View style={styles.contextCard}>
              <Text style={styles.contextEyebrow}>当前反馈对象</Text>
              <Text style={styles.contextTitle}>{spotName}</Text>
              <Text style={styles.contextAddress}>{spotAddress?.trim() || '地址待补充'}</Text>
              {spotIdentityLabel ? (
                <View style={styles.contextBadgeRow}>
                  <TagChip label={spotIdentityLabel} compact />
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>反馈类型</Text>
            <Text style={styles.sectionDescription}>先选择这条反馈更接近哪一类，方便我们后续整理。</Text>
            <View style={styles.typeList}>
              {FEEDBACK_TYPES.map((item) => (
                <TagChip
                  key={item.key}
                  label={item.label}
                  active={selectedType === item.key}
                  onPress={() => setSelectedType(item.key)}
                />
              ))}
            </View>
            <View style={styles.typeHintCard}>
              <Text style={styles.typeHintTitle}>{activeType.label}</Text>
              <Text style={styles.typeHintDescription}>{activeType.description}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>反馈标题</Text>
            <Text style={styles.fieldHint}>可选，适合先概括这条反馈的重点。</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={titlePlaceholder}
              placeholderTextColor={theme.colors.textTertiary}
              style={styles.titleInput}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>反馈内容</Text>
            <Text style={styles.fieldHint}>必填，建议尽量写清对象、问题现象、你期待的结果或建议方向。</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder={contentPlaceholder}
              placeholderTextColor={theme.colors.textTertiary}
              style={styles.contentInput}
              multiline
            />
          </View>

          <View style={styles.helperCard}>
            <Text style={styles.helperTitle}>补充说明</Text>
            <Text style={styles.helperText}>{helperText}</Text>
          </View>

          <PrimaryButton
            label="提交反馈"
            onPress={handleSubmitFeedback}
            style={styles.submitButton}
          />
        </View>
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
  card: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  contextCard: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
    gap: 4,
  },
  contextEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contextTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  contextAddress: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  contextBadgeRow: {
    marginTop: 4,
    flexDirection: 'row',
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  typeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  typeHintCard: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.sm,
    gap: 4,
  },
  typeHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  typeHintDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  titleInput: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  contentInput: {
    minHeight: 180,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  helperCard: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
    gap: 4,
  },
  helperTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  submitButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});

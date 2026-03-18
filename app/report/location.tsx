import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePetMapStore } from '@/store/petmap-store';
import type { FeedbackType as StoreFeedbackType, InboxContextType } from '@/types/inbox';

// ── Types ──────────────────────────────────────────────────────────────────

type LocalFeedbackType = 'location' | 'activity' | 'product';

const FEEDBACK_TYPES: Array<{
  key: LocalFeedbackType;
  label: string;
  helper: string;
  storeType: StoreFeedbackType;
}> = [
  {
    key: 'location',
    label: '地点信息反馈',
    helper: '适合补充地点营业状态、地址、宠物友好信息等内容。',
    storeType: 'spot',
  },
  {
    key: 'activity',
    label: '活动内容反馈',
    helper: '适合补充活动时间、地点、报名方式或现场体验等内容。',
    storeType: 'activity',
  },
  {
    key: 'product',
    label: '产品建议',
    helper: '适合提交功能建议、体验问题或你希望新增的产品能力。',
    storeType: 'product',
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────

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

// ── Screen ─────────────────────────────────────────────────────────────────

export default function ReportLocationScreen() {
  const insets = useSafeAreaInsets();
  const { addFeedbackRecord } = usePetMapStore();

  // Route params — all optional; empty string when not provided
  const params = useLocalSearchParams<{
    spotId?: string;
    spotName?: string;
    spotAddress?: string;
  }>();
  const spotId = params.spotId?.trim() || '';
  const spotName = params.spotName?.trim() || '';
  const spotAddress = params.spotAddress?.trim() || '';
  const hasSpotContext = spotId.length > 0 && spotName.length > 0;

  const [selectedType, setSelectedType] = useState<LocalFeedbackType>('location');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const currentType = FEEDBACK_TYPES.find((t) => t.key === selectedType)!;

  function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('提示', '反馈标题和内容不能为空，请补充后再提交。');
      return;
    }

    const contextType: InboxContextType = hasSpotContext ? 'spot' : 'none';

    addFeedbackRecord({
      feedbackType: currentType.storeType,
      title: title.trim(),
      content: content.trim(),
      contextType,
      spotId: hasSpotContext ? spotId : undefined,
      spotName: hasSpotContext ? spotName : undefined,
    });

    Alert.alert('提交成功', '反馈已提交，感谢你的建议！', [
      {
        text: '好的',
        onPress: () => {
          setTitle('');
          setContent('');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Orange Header ───────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}>
            <BackArrowIcon />
          </Pressable>
          <Text style={styles.headerTitle}>意见反馈</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
      </SafeAreaView>

      {/* ── Form Body ───────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical>

          {/* Intro */}
          <View style={styles.introSection}>
            <Text style={styles.introText}>
              你可以在这里反馈地点信息、活动内容、产品建议或者使用问题。巡逻狗狗会给你回信哦！
            </Text>
          </View>

          {/* Spot Context Block — only shown when entering from Map */}
          {hasSpotContext ? (
            <View style={styles.spotContextBlock}>
              <Text style={styles.spotContextLabel}>当前反馈地点</Text>
              <Text style={styles.spotContextName}>{spotName}</Text>
              {spotAddress.length > 0 ? (
                <Text style={styles.spotContextAddress}>{spotAddress}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formSection}>

            {/* Feedback Type */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>反馈类型</Text>
              <View style={styles.chipRow}>
                {FEEDBACK_TYPES.map((type) => {
                  const isSelected = selectedType === type.key;
                  return (
                    <Pressable
                      key={type.key}
                      onPress={() => setSelectedType(type.key)}
                      style={({ pressed }) => [
                        styles.chip,
                        isSelected ? styles.chipSelected : styles.chipUnselected,
                        pressed && styles.chipPressed,
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          isSelected
                            ? styles.chipTextSelected
                            : styles.chipTextUnselected,
                        ]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.helperBox}>
                <Text style={styles.helperText}>{currentType.helper}</Text>
              </View>
            </View>

            {/* Feedback Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>反馈标题</Text>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="请输入反馈标题"
                placeholderTextColor="#B0B0B0"
                returnKeyType="next"
                maxLength={60}
              />
            </View>

            {/* Feedback Content */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>反馈内容</Text>
              <TextInput
                style={styles.contentInput}
                value={content}
                onChangeText={setContent}
                placeholder="请描述你的反馈内容..."
                placeholderTextColor="#B0B0B0"
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
            ]}>
            <Text style={styles.submitButtonText}>提交反馈</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFF',
  },
  flex: {
    flex: 1,
  },

  // Header
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

  // Scroll
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFEFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
    flexGrow: 1,
  },

  // Intro
  introSection: {},
  introText: {
    color: '#606060',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
  },

  // Spot Context Block
  spotContextBlock: {
    borderWidth: 1.5,
    borderColor: '#ED8422',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  spotContextLabel: {
    color: '#ED8422',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  spotContextName: {
    color: '#303030',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  spotContextAddress: {
    color: '#808080',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },

  // Form
  formSection: {
    gap: 24,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    color: '#404040',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: '#ED8422',
  },
  chipUnselected: {
    backgroundColor: '#F2F2F2',
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: '#404040',
  },

  // Helper box
  helperBox: {
    borderWidth: 1.5,
    borderColor: '#ED8422',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  helperText: {
    color: '#606060',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Inputs
  titleInput: {
    borderWidth: 1.5,
    borderColor: '#ED8422',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#303030',
    backgroundColor: '#FFFFFF',
    lineHeight: 22,
  },
  contentInput: {
    borderWidth: 1.5,
    borderColor: '#ED8422',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#303030',
    backgroundColor: '#FFFFFF',
    minHeight: 140,
    lineHeight: 22,
  },

  // Submit button
  submitButton: {
    backgroundColor: '#ED8422',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    color: '#FFFEFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
});

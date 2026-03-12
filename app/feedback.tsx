import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton, SectionHeader } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function FeedbackScreen() {
  const [feedback, setFeedback] = useState('');

  function handleSubmitFeedback() {
    Alert.alert('感谢反馈', '感谢反馈，功能后续会接入');
    setFeedback('');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '意见反馈' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="产品共建"
          title="意见反馈"
          subtitle="欢迎告诉我们你希望 PetMap 变得更好的地方。"
          style={styles.header}
        />

        <View style={styles.card}>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="写下你的建议、遇到的问题，或期待新增的功能..."
            placeholderTextColor={theme.colors.textTertiary}
            style={styles.input}
            multiline
          />
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
    ...theme.shadows.card,
  },
  input: {
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
  submitButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});

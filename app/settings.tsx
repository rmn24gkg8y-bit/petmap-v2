import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui';
import { theme } from '@/constants/theme';

const SETTING_ITEMS = [
  { key: 'location', label: '定位权限', status: '已开启 / 待接入' },
  { key: 'notifications', label: '通知提醒', status: '即将上线' },
  { key: 'map-preference', label: '地图偏好', status: '即将上线' },
  { key: 'cache', label: '缓存与数据', status: '即将上线' },
] as const;

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '设置' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="偏好设置"
          title="设置"
          subtitle="你可以在这里管理 PetMap 的基础偏好与体验选项。"
          style={styles.header}
        />

        <View style={styles.groupCard}>
          {SETTING_ITEMS.map((item, index) => (
            <View
              key={item.key}
              style={[styles.itemRow, index < SETTING_ITEMS.length - 1 ? styles.itemDivider : null]}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemStatus}>{item.status}</Text>
            </View>
          ))}
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
  groupCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  itemRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemStatus: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});

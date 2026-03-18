import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

// ── Section & Item components ────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

type SettingItemProps = {
  label: string;
  rightLabel?: string;
  showChevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
};

function SettingItem({ label, rightLabel, showChevron = true, onPress, destructive = false }: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && onPress ? styles.itemPressed : null]}>
      <Text style={[styles.itemLabel, destructive && styles.itemLabelDestructive]}>{label}</Text>
      <View style={styles.itemRight}>
        {rightLabel ? <Text style={styles.itemRightLabel}>{rightLabel}</Text> : null}
        {showChevron ? <Ionicons name="chevron-forward" size={13} color="#B0ABA4" /> : null}
      </View>
    </Pressable>
  );
}

function SectionGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionGroup}>{children}</View>;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  function handleNotification() {
    Alert.alert('通知设置', '通知权限管理即将上线，敬请期待。');
  }

  function handleLocationInfo() {
    Alert.alert(
      '定位与地图说明',
      'PetMap 会在你使用地图功能时请求位置权限，用于帮助你发现附近的宠物友好地点。\n\n你可以随时在系统设置中调整 PetMap 的定位权限。定位数据不会上传或用于其他用途。',
    );
  }

  function handleClearData() {
    Alert.alert(
      '清理本地数据',
      '该功能正在开发中，即将上线。\n\n届时将支持清理本地缓存数据，核心收藏和地点记录不会受影响。',
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Orange Header ────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
            <BackArrowIcon />
          </Pressable>
          <Text style={styles.headerTitle}>设置</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
      </SafeAreaView>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Section: 通用 */}
        <SectionTitle label="通用" />
        <SectionGroup>
          <SettingItem
            label="通知设置"
            rightLabel="即将上线"
            showChevron={false}
            onPress={handleNotification}
          />
          <View style={styles.divider} />
          <SettingItem
            label="定位与地图说明"
            onPress={handleLocationInfo}
          />
          <View style={styles.divider} />
          <SettingItem
            label="清理本地数据"
            onPress={handleClearData}
          />
          <View style={styles.divider} />
          <SettingItem
            label="版本信息"
            rightLabel="PetMap v1.0 Beta"
            showChevron={false}
          />
        </SectionGroup>

        {/* Section: 支持 */}
        <SectionTitle label="支持" />
        <SectionGroup>
          <SettingItem
            label="意见反馈"
            onPress={() => router.push('/report/location')}
          />
          <View style={styles.divider} />
          <SettingItem
            label="关于 PetMap"
            onPress={() => router.push('/about')}
          />
        </SectionGroup>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFF',
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
    backgroundColor: '#F5F3EF',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 0,
  },

  // ── Section ───────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ED8422',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  sectionGroup: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    overflow: 'hidden',
    paddingHorizontal: 16,
  },

  // ── Item ──────────────────────────────────────────────────────────
  item: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#303030',
    lineHeight: 22,
  },
  itemLabelDestructive: {
    color: '#C0392B',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemRightLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#B0ABA4',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EEE9',
    marginLeft: 0,
  },
});

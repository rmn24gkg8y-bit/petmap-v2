import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import ExploreDefaultIcon from '@/assets/icons/tab/Explore-Default.svg';
import ExploreSelectedIcon from '@/assets/icons/tab/Explore-Selected.svg';
import MapDefaultIcon from '@/assets/icons/tab/Map-Default.svg';
import MapSelectedIcon from '@/assets/icons/tab/Map-Selected.svg';
import MeDefaultIcon from '@/assets/icons/tab/Me-Default.svg';
import MeSelectedIcon from '@/assets/icons/tab/Me-Selected.svg';
import ServiceDefaultIcon from '@/assets/icons/tab/Service-Default.svg';
import ServiceSelectedIcon from '@/assets/icons/tab/Service-Selected.svg';

// ── Tab config ────────────────────────────────────────────────────────────────

type TabConfig = {
  name: string;
  label: string;
  DefaultIcon: React.ComponentType<SvgProps>;
  SelectedIcon: React.ComponentType<SvgProps>;
  iconW: number;
  iconH: number;
};

const TAB_CONFIG: TabConfig[] = [
  {
    name: 'index',
    label: '地图',
    DefaultIcon: MapDefaultIcon,
    SelectedIcon: MapSelectedIcon,
    iconW: 18,
    iconH: 20,
  },
  {
    name: 'explore',
    label: '探索',
    DefaultIcon: ExploreDefaultIcon,
    SelectedIcon: ExploreSelectedIcon,
    iconW: 19,
    iconH: 19,
  },
  {
    name: 'services',
    label: '服务',
    DefaultIcon: ServiceDefaultIcon,
    SelectedIcon: ServiceSelectedIcon,
    iconW: 22,
    iconH: 21,
  },
  {
    name: 'me',
    label: '狗窝',
    DefaultIcon: MeDefaultIcon,
    SelectedIcon: MeSelectedIcon,
    iconW: 21,
    iconH: 21,
  },
];

// ── Custom tab bar ────────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const safeBottom = useSafeAreaInsets().bottom;
  // Use the larger of React Navigation's insets or the hook — both should agree.
  const bottomInset = Math.max(insets.bottom, safeBottom);

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset + 10 }]}>
      {state.routes.map((route, index) => {
        const config = TAB_CONFIG.find((c) => c.name === route.name);
        if (!config) return null;

        const isFocused = state.index === index;

        function handlePress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigation.navigate(route.name as any, route.params);
          }
        }

        function handleLongPress() {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        }

        return (
          <Pressable
            key={route.key}
            onPress={handlePress}
            onLongPress={handleLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            style={[styles.tabItem, isFocused && styles.tabItemFocused]}>
            <View style={styles.iconBlock}>
              {isFocused ? (
                <config.SelectedIcon width={config.iconW} height={config.iconH} />
              ) : (
                <config.DefaultIcon width={config.iconW} height={config.iconH} />
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ headerShown: false }} />
      <Tabs.Screen name="explore" options={{ headerShown: false }} />
      <Tabs.Screen name="services" options={{ headerShown: false }} />
      <Tabs.Screen name="me" options={{ headerShown: false }} />
    </Tabs>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Bar container: paddingTop(8) + tabItem content + paddingBottom(10 + safeArea)
  // paddingHorizontal(16) makes 4 tabs fit in (screenWidth - 32) / 4 each.
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 16,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },

  // Individual tab item — flex:1 ensures equal width across 4 tabs
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    borderRadius: 10,
  },
  tabItemFocused: {
    backgroundColor: 'rgba(237, 132, 34, 0.10)',
  },

  // Icon container — 32px tall, fills tab item width, icon centered
  iconBlock: {
    height: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Label — lineHeight 16 (> fontSize 12) prevents React Native from clipping
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
    color: '#1C1C1C',
    includeFontPadding: false,
  },
  tabLabelFocused: {
    color: '#ED8422',
  },
});

import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { theme } from '@/constants/theme';

type MapQuickActionsProps = {
  bottom: number;
  isFilterActive: boolean;
  favoriteCount: number;
  userSpotCount: number;
  onPressFilter: () => void;
  onPressFavorites: () => void;
  onPressMySpots: () => void;
};

function getQuickActionBadgeCount(count: number) {
  return count > 99 ? '99+' : String(count);
}

type QuickActionButtonProps = {
  activeBackgroundColor: string;
  activeIconColor: string;
  defaultIconColor: string;
  icon: (color: string) => ReactNode;
  isActive?: boolean;
  onPress: () => void;
  badgeCount?: number;
};

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.7l2.79 5.66 6.25.91-4.52 4.4 1.06 6.22L12 16.95l-5.58 2.94 1.06-6.22-4.52-4.4 6.25-.91L12 2.7z"
        fill={color}
      />
    </Svg>
  );
}

function MySpotIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-6.06 7-11a7 7 0 1 0-14 0c0 4.94 7 11 7 11z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.6} stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

function FilterIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6h16l-6.2 7.25v4.68l-3.6 1.92v-6.6L4 6z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QuickActionButton({
  activeBackgroundColor,
  activeIconColor,
  defaultIconColor,
  icon,
  isActive = false,
  onPress,
  badgeCount,
}: QuickActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number, duration: number) => {
    Animated.timing(scale, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.quickActionScaleWrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateScale(0.96, 90)}
        onPressOut={() => animateScale(1, 120)}
        style={({ pressed }) => [
          styles.quickActionButton,
          {
            backgroundColor: isActive || pressed ? activeBackgroundColor : DEFAULT_BACKGROUND_COLOR,
          },
        ]}>
        {({ pressed }) => {
          const isPressedOrActive = isActive || pressed;

          return (
            <>
              {icon(isPressedOrActive ? activeIconColor : defaultIconColor)}
              {typeof badgeCount === 'number' && badgeCount > 0 ? (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{getQuickActionBadgeCount(badgeCount)}</Text>
                </View>
              ) : null}
            </>
          );
        }}
      </Pressable>
    </Animated.View>
  );
}

export function MapQuickActions({
  bottom,
  isFilterActive,
  favoriteCount,
  userSpotCount,
  onPressFilter,
  onPressFavorites,
  onPressMySpots,
}: MapQuickActionsProps) {
  return (
    <View pointerEvents="box-none" style={[styles.quickActions, { bottom }]}>
      <QuickActionButton
        activeBackgroundColor="#404040"
        activeIconColor="#FFFEFF"
        defaultIconColor="#404040"
        icon={(color) => <FilterIcon color={color} />}
        isActive={isFilterActive}
        onPress={onPressFilter}
      />

      <QuickActionButton
        activeBackgroundColor="#67A735"
        activeIconColor="#F4F4F4"
        defaultIconColor="#67A735"
        icon={(color) => <MySpotIcon color={color} />}
        onPress={onPressMySpots}
        badgeCount={userSpotCount}
      />

      <QuickActionButton
        activeBackgroundColor="#ED8422"
        activeIconColor="#FFFFFF"
        defaultIconColor="#EEB311"
        icon={(color) => <StarIcon color={color} />}
        onPress={onPressFavorites}
        badgeCount={favoriteCount}
      />
    </View>
  );
}

const DEFAULT_BACKGROUND_COLOR = 'rgba(255, 254, 255, 0.70)';

const styles = StyleSheet.create({
  quickActions: {
    position: 'absolute',
    right: 10,
    gap: 20,
  },
  quickActionScaleWrap: {
    width: 44,
    height: 44,
  },
  quickActionButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.floating,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  quickActionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

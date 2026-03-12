import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type MapQuickActionsProps = {
  bottom: number;
  favoriteCount: number;
  userSpotCount: number;
  onPressFavorites: () => void;
  onPressMySpots: () => void;
};

function getQuickActionBadgeCount(count: number) {
  return count > 99 ? '99+' : String(count);
}

export function MapQuickActions({
  bottom,
  favoriteCount,
  userSpotCount,
  onPressFavorites,
  onPressMySpots,
}: MapQuickActionsProps) {
  return (
    <View pointerEvents="box-none" style={[styles.quickActions, { bottom }]}>
      <Pressable onPress={onPressFavorites} style={styles.quickActionButton}>
        <Ionicons name="star" size={19} color="#0F172A" />
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>{getQuickActionBadgeCount(favoriteCount)}</Text>
        </View>
      </Pressable>

      <Pressable onPress={onPressMySpots} style={styles.quickActionButton}>
        <Ionicons name="location" size={19} color="#0F172A" />
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>{getQuickActionBadgeCount(userSpotCount)}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    position: 'absolute',
    right: 16,
    gap: 10,
  },
  quickActionButton: {
    width: 46,
    height: 46,
    borderRadius: theme.radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: theme.colors.border,
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

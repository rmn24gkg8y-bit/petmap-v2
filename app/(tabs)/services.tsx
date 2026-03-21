import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MessageSquareIcon from '@/assets/icons/message-square.svg';
import DogHero from '@/assets/illustrations/dog-hero.svg';
import { ACTIVITY_COLLECTIONS, type ActivityCollection } from '@/constants/activityCollections';
import { usePetMapStore } from '@/store/petmap-store';
import type { Spot } from '@/types/spot';

function getFeaturedActivities(activities: ActivityCollection[]) {
  if (activities.length >= 2) {
    return activities;
  }
  return [...activities, ...activities].slice(0, 2);
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { spots, setSelectedSpot, hasUnreadInboxItems } = usePetMapStore();

  const featuredActivities = useMemo(() => getFeaturedActivities(ACTIVITY_COLLECTIONS), []);
  const todayPicks = useMemo(
    () => [...spots].sort((a, b) => b.votes - a.votes).slice(0, Math.max(1, Math.min(spots.length, 4))),
    [spots],
  );

  const messageButtonTop = insets.top + 10;
  const heroHeight = insets.top + 223;

  function handleOpenInbox() {
    router.push('/inbox');
  }

  function handleOpenSpotOnMap(spotId: string) {
    setSelectedSpot(spotId);
    router.navigate('/(tabs)');
  }

  function handleOpenActivity(activity: ActivityCollection) {
    if (activity.interactionMode === 'upcoming') {
      router.push('/activity/store-info');
    } else {
      router.push(`/activity/${activity.key}`);
    }
  }

  function renderFeaturedCard(activity: ActivityCollection) {
    return (
      <Pressable
        key={activity.key}
        onPress={() => handleOpenActivity(activity)}
        style={({ pressed }) => [styles.featuredCard, pressed && styles.cardPressed]}>
        {activity.imageUri ? (
          <Image source={{ uri: activity.imageUri }} style={styles.featuredCardImage} />
        ) : (
          <View style={styles.featuredCardPlaceholder}>
            <View style={styles.featuredCardGlowLarge} />
            <View style={styles.featuredCardGlowSmall} />
            <View style={styles.featuredCardIconWrap}>
              <Ionicons name="calendar-outline" size={22} color="#B07840" />
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  function renderTodayCard(spot: Spot) {
    return (
      <Pressable
        key={spot.id}
        onPress={() => handleOpenSpotOnMap(spot.id)}
        style={({ pressed }) => [styles.todayCard, pressed && styles.cardPressed]}>
        {spot.photoUris?.[0] ? (
          <Image source={{ uri: spot.photoUris[0] }} style={styles.todayCardImage} />
        ) : (
          <View style={styles.todayCardPlaceholder}>
            <View style={styles.todayCardGlowLarge} />
            <View style={styles.todayCardGlowSmall} />
            <View style={styles.todayCardIconWrap}>
              <Ionicons name="paw-outline" size={26} color="#B07840" />
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/*
        底部暖白层：从 heroHeight 到屏幕底部，底部 overscroll 时露出暖白色。
        顶部 overscroll 穿透到 container 橙色。
      */}
      <View style={[styles.bottomWarmBg, { top: heroHeight }]} />

      <ScrollView
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 108 }]}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={[styles.hero, { height: heroHeight }]}>
          <LinearGradient
            colors={['#F59528', '#E07215', '#D46C10']}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <Pressable onPress={handleOpenInbox} style={[styles.messageButton, { top: messageButtonTop }]}>
            <MessageSquareIcon width={18} height={18} />
            {hasUnreadInboxItems ? <View style={styles.messageBadge} /> : null}
          </Pressable>

          <View style={styles.heroTitleGroup}>
            <Text style={styles.heroTitle}>活动精选</Text>
          </View>

          <DogHero width={131} height={172} style={styles.heroDog} />
        </View>

        {/* ── Content Sheet ─────────────────────────────────────── */}
        <View style={styles.contentSheet}>

          {/* 活动精选横滑卡片 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="normal"
            scrollEventThrottle={16}
            contentContainerStyle={styles.featuredRow}>
            {featuredActivities.map((activity) => renderFeaturedCard(activity))}
          </ScrollView>

          {/* 今日推荐模块标题 */}
          <View style={styles.todayTitleGroup}>
            <Text style={styles.todayModuleTitle}>今日推荐</Text>
          </View>

          {/* 今日推荐横滑卡片 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="normal"
            scrollEventThrottle={16}
            contentContainerStyle={styles.todayRow}>
            {todayPicks.map((spot) => renderTodayCard(spot))}
          </ScrollView>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ED8422',
  },
  bottomWarmBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF8F2',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Hero ──────────────────────────────────────────────────────────
  hero: {
    position: 'relative',
    backgroundColor: '#ED8422',
    overflow: 'visible',
  },
  messageButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  messageBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFEFF',
  },
  heroTitleGroup: {
    position: 'absolute',
    left: 16,
    right: 134,
    bottom: 14,
    zIndex: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  heroDog: {
    position: 'absolute',
    right: 21,
    bottom: -42,
    zIndex: 0,
  },

  // ── Content Sheet ─────────────────────────────────────────────────
  contentSheet: {
    flex: 1,
    minHeight: 620,
    backgroundColor: '#FFF8F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 26,
    zIndex: 2,
  },

  // ── Featured cards ────────────────────────────────────────────────
  featuredRow: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 10,
  },
  featuredCard: {
    width: 166,
    height: 224,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EAD5BC',
    shadowColor: '#C97010',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
  },
  featuredCardPlaceholder: {
    flex: 1,
    backgroundColor: '#EAD5BC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  featuredCardGlowLarge: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  featuredCardGlowSmall: {
    position: 'absolute',
    bottom: -24,
    left: -14,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  featuredCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Today module title ────────────────────────────────────────────
  todayTitleGroup: {
    marginTop: 28,
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  todayModuleTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 40,
  },

  // ── Today cards ───────────────────────────────────────────────────
  todayRow: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 10,
  },
  todayCard: {
    width: 260,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EAD5BC',
    shadowColor: '#C97010',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  todayCardImage: {
    width: '100%',
    height: '100%',
  },
  todayCardPlaceholder: {
    flex: 1,
    backgroundColor: '#EAD5BC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  todayCardGlowLarge: {
    position: 'absolute',
    right: -28,
    top: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  todayCardGlowSmall: {
    position: 'absolute',
    left: -22,
    bottom: -28,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  todayCardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Shared ────────────────────────────────────────────────────────
  cardPressed: {
    opacity: 0.88,
  },
});

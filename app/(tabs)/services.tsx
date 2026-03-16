import { Ionicons } from '@expo/vector-icons';
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
    [spots]
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
    router.push(`/activity/${activity.key}`);
  }

  function renderFeaturedCard(activity: ActivityCollection) {
    return (
      <Pressable
        key={activity.key}
        onPress={() => handleOpenActivity(activity)}
        style={({ pressed }) => [
          styles.featuredCard,
          pressed ? styles.cardPressed : null,
        ]}>
        {activity.imageUri ? (
          <Image source={{ uri: activity.imageUri }} style={styles.featuredCardImage} />
        ) : (
          <View style={styles.featuredCardPlaceholder}>
            <View style={styles.featuredCardGlowLarge} />
            <View style={styles.featuredCardGlowSmall} />
            <View style={styles.featuredCardIconWrap}>
              <Ionicons name="calendar-outline" size={22} color="#5B5B5B" />
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
        style={({ pressed }) => [styles.todayCard, pressed ? styles.cardPressed : null]}>
        {spot.photoUris?.[0] ? (
          <Image source={{ uri: spot.photoUris[0] }} style={styles.todayCardImage} />
        ) : (
          <View style={styles.todayCardPlaceholder}>
            <View style={styles.todayCardGlowLarge} />
            <View style={styles.todayCardGlowSmall} />
            <View style={styles.todayCardIconWrap}>
              <Ionicons name="paw-outline" size={28} color="#6A6A6A" />
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 108 }]}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <Pressable onPress={handleOpenInbox} style={[styles.messageButton, { top: messageButtonTop }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
            {hasUnreadInboxItems ? <View style={styles.messageBadge} /> : null}
          </Pressable>

          <View style={styles.heroTitleGroup}>
            <Text style={styles.heroTitle}>活动精选</Text>
            <Text style={styles.heroSubtitle}>实时更新近期精选活动</Text>
          </View>

          <DogHero width={131} height={172} style={styles.heroDog} />
        </View>

        <View style={styles.contentSheet}>
          <View style={styles.featuredSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuredScroll}
              contentContainerStyle={styles.featuredRow}>
              {featuredActivities.map((activity) => renderFeaturedCard(activity))}
            </ScrollView>
          </View>

          <View style={styles.todaySection}>
            <View style={styles.todayTitleGroup}>
              <Text style={styles.todaySectionTitle}>今日推荐</Text>
              <Text style={styles.todaySectionSubtitle}>今日携宠出行诚意推荐</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.todayRow}>
              {todayPicks.map((spot) => renderTodayCard(spot))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFEFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    position: 'relative',
    backgroundColor: '#ED8422',
    overflow: 'visible',
  },
  messageButton: {
    position: 'absolute',
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  messageBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
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
    color: '#FFFEFF',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 2,
    color: '#FFFEFF',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  heroDog: {
    position: 'absolute',
    right: 21,
    bottom: -42,
    zIndex: 0,
  },
  contentSheet: {
    flex: 1,
    minHeight: 620,
    backgroundColor: '#FFFEFF',
    paddingTop: 8,
    zIndex: 2,
  },
  featuredRow: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 10,
  },
  featuredSection: {
    height: 232,
  },
  featuredScroll: {
    flexGrow: 0,
  },
  featuredCard: {
    width: 166,
    height: 232,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#D9D9D9',
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D9D9D9',
  },
  featuredCardPlaceholder: {
    flex: 1,
    backgroundColor: '#D9D9D9',
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
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  featuredCardGlowSmall: {
    position: 'absolute',
    bottom: -24,
    left: -14,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  featuredCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.64)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todaySection: {
    marginTop: 17,
    paddingBottom: 6,
  },
  todayTitleGroup: {
    paddingHorizontal: 16,
  },
  todaySectionTitle: {
    color: '#404040',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  todaySectionSubtitle: {
    marginTop: 2,
    width: 331,
    maxWidth: '100%',
    color: '#404040',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  todayRow: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    gap: 10,
  },
  todayCard: {
    width: 343,
    height: 187,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#D9D9D9',
  },
  todayCardImage: {
    width: '100%',
    height: '100%',
  },
  todayCardPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9D9D9',
    overflow: 'hidden',
  },
  todayCardGlowLarge: {
    position: 'absolute',
    right: -28,
    top: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  todayCardGlowSmall: {
    position: 'absolute',
    left: -22,
    bottom: -28,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  todayCardIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPressed: {
    opacity: 0.92,
  },
});

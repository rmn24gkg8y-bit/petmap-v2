import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MessageSquareIcon from '@/assets/icons/message-square.svg';
import DogHero from '@/assets/illustrations/dog-hero.svg';
import { usePetMapStore } from '@/store/petmap-store';

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { userSpots, favoriteSpots } = usePetMapStore();

  const heroHeight = insets.top + 180;
  const messageButtonTop = insets.top + 10;

  // Press animations for the two stat cards
  const spotsAnim = useRef(new Animated.Value(0)).current;
  const favAnim   = useRef(new Animated.Value(0)).current;

  function pressIn(anim: Animated.Value) {
    Animated.timing(anim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }

  function pressOut(anim: Animated.Value) {
    Animated.spring(anim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
  }

  function getStatCardStyle(anim: Animated.Value) {
    return {
      transform: [
        {
          scale: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.965],
            extrapolate: 'clamp',
          }),
        },
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1.5],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  }

  return (
    <View style={styles.container}>
      {/*
        白色背景层：从 hero 底部延伸到屏幕底部。
        ScrollView 透明，底部 overscroll 看到这层白色；
        顶部 overscroll 穿透到 container 的橙色。
      */}
      <View style={[styles.bottomWhiteBg, { top: heroHeight }]} />

      <ScrollView
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 108 }]}>

        {/* Hero */}
        <View style={[styles.hero, { height: heroHeight }]}>
          <Pressable
            onPress={() => router.push('/inbox')}
            style={[styles.messageButton, { top: messageButtonTop }]}>
            <MessageSquareIcon width={18} height={18} />
          </Pressable>

          <View style={styles.heroTitleGroup}>
            <Text style={styles.heroEyebrow}>本周巡逻</Text>
            <Text style={styles.heroTitle}>Weiless</Text>
          </View>

          <DogHero width={130} height={170} style={styles.heroDog} />
        </View>

        {/* White Content Sheet */}
        <View style={styles.contentSheet}>
          <View style={styles.sheetContent}>

            {/* User Profile Block */}
            <View style={styles.profileBlock}>
              <View style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.userId}>Tino</Text>
                <Text style={styles.userSubtitle}>属于你和爱宠的专属地图</Text>
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsSection}>
              <Pressable
                onPressIn={() => pressIn(spotsAnim)}
                onPressOut={() => pressOut(spotsAnim)}
                onPress={() => router.push('/my-spots')}>
                <Animated.View style={[styles.statBlock, getStatCardStyle(spotsAnim)]}>
                  <Text style={styles.statNumber}>{userSpots.length}</Text>
                  <Text style={styles.statLabel}>我的地点</Text>
                </Animated.View>
              </Pressable>
              <Pressable
                onPressIn={() => pressIn(favAnim)}
                onPressOut={() => pressOut(favAnim)}
                onPress={() => router.push('/my-favorites')}>
                <Animated.View style={[styles.statBlock, getStatCardStyle(favAnim)]}>
                  <Text style={styles.statNumber}>{favoriteSpots.length}</Text>
                  <Text style={styles.statLabel}>我的收藏</Text>
                </Animated.View>
              </Pressable>
            </View>

            {/* Achievement Section */}
            <View style={styles.achievementSection}>
              <View style={styles.achievementHeader}>
                <Text style={styles.achievementTitle}>勋章</Text>
                <Ionicons name="chevron-forward" size={13} color="#404040" />
              </View>
              <View style={styles.badgeRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.badgePlaceholder} />
                ))}
              </View>
            </View>

            {/* Function Section */}
            <View style={styles.functionSection}>
              <Text style={styles.functionTitle}>快捷入口</Text>
              {[
                { key: 'settings', label: '设置', onPress: () => router.push('/settings') },
                { key: 'feedback', label: '意见反馈', onPress: () => router.push('/report/location') },
                { key: 'about', label: '关于 PetMap', onPress: () => router.push('/about') },
              ].map((item) => (
                <Pressable key={item.key} style={styles.functionItem} onPress={item.onPress}>
                  <Text style={styles.functionItemLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={13} color="#404040" />
                </Pressable>
              ))}
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 橙色底层：顶部 overscroll 时透过透明 scrollView 露出此颜色
  container: {
    flex: 1,
    backgroundColor: '#ED8422',
  },
  // 白色层：从 heroHeight 到底部，底部 overscroll 时露出此颜色
  bottomWhiteBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFEFF',
  },
  // 透明，让两端 overscroll 分别看到对应底层颜色
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Hero ──────────────────────────────────────────────────
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
  heroTitleGroup: {
    position: 'absolute',
    left: 27,
    bottom: 12,
    zIndex: 2,
  },
  heroEyebrow: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  heroDog: {
    position: 'absolute',
    right: 58,
    bottom: -30,
    zIndex: 0,
  },

  // ── White Sheet ───────────────────────────────────────────
  contentSheet: {
    flex: 1,
    minHeight: 560,
    backgroundColor: '#FFFEFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 2,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 89,
  },
  sheetContent: {
    gap: 17,
  },

  // ── User Profile Block ────────────────────────────────────
  profileBlock: {
    height: 91,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#ED8422',
    backgroundColor: '#FFFEFF',
    paddingTop: 10,
    paddingBottom: 9,
    paddingLeft: 12,
    paddingRight: 77,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D9D9D9',
    flexShrink: 0,
  },
  userInfo: {
    gap: 5,
  },
  userId: {
    color: '#404040',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  userSubtitle: {
    color: '#404040',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // ── Stats Section ─────────────────────────────────────────
  statsSection: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
  },
  statBlock: {
    width: 150,
    height: 75,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#ED8422',
    backgroundColor: '#FFFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Subtle shadow — complements the press-down animation
    shadowColor: '#ED8422',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  statNumber: {
    color: '#404040',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  statLabel: {
    color: '#404040',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // ── Achievement Section ───────────────────────────────────
  achievementSection: {
    gap: 8,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievementTitle: {
    color: '#404040',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  badgePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D9D9D9',
  },

  // ── Function Section ──────────────────────────────────────
  functionSection: {
    gap: 14,
  },
  functionTitle: {
    color: '#404040',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  functionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  functionItemLabel: {
    color: '#404040',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
});

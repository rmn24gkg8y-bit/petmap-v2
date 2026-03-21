import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
        底部白色层：从 heroHeight 到屏幕底部，底部 overscroll 时露出暖白色。
        顶部 overscroll 穿透到 container 橙色。
      */}
      <View style={[styles.bottomWarmBg, { top: heroHeight }]} />

      <ScrollView
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 108 }]}>

        {/* Hero — soft gradient overlay gives warmth & depth */}
        <View style={[styles.hero, { height: heroHeight }]}>
          <LinearGradient
            colors={['#F59528', '#E07215', '#D46C10']}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

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

        {/* Warm white content sheet */}
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
                onPress={() => router.push('/my-spots')}
                style={styles.statPressable}>
                <Animated.View style={[styles.statBlock, getStatCardStyle(spotsAnim)]}>
                  <Text style={styles.statNumber}>{userSpots.length}</Text>
                  <Text style={styles.statLabel}>我的地点</Text>
                </Animated.View>
              </Pressable>
              <Pressable
                onPressIn={() => pressIn(favAnim)}
                onPressOut={() => pressOut(favAnim)}
                onPress={() => router.push('/my-favorites')}
                style={styles.statPressable}>
                <Animated.View style={[styles.statBlock, getStatCardStyle(favAnim)]}>
                  <Text style={styles.statNumber}>{favoriteSpots.length}</Text>
                  <Text style={styles.statLabel}>我的收藏</Text>
                </Animated.View>
              </Pressable>
            </View>

            {/* Achievement Section */}
            <View style={styles.achievementCard}>
              <View style={styles.achievementHeader}>
                <Text style={styles.achievementTitle}>勋章</Text>
                <Ionicons name="chevron-forward" size={13} color="#A89070" />
              </View>
              <View style={styles.badgeRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.badgePlaceholder} />
                ))}
              </View>
            </View>

            {/* Function Section */}
            <View style={styles.functionCard}>
              <Text style={styles.functionTitle}>快捷入口</Text>
              {[
                { key: 'settings', label: '设置', onPress: () => router.push('/settings') },
                { key: 'feedback', label: '意见反馈', onPress: () => router.push('/report/location') },
                { key: 'about', label: '关于 PetMap', onPress: () => router.push('/about') },
              ].map((item, index, arr) => (
                <View key={item.key}>
                  <Pressable
                    style={({ pressed }) => [styles.functionItem, pressed && styles.functionItemPressed]}
                    onPress={item.onPress}>
                    <Text style={styles.functionItemLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#C4A882" />
                  </Pressable>
                  {index < arr.length - 1 ? <View style={styles.functionDivider} /> : null}
                </View>
              ))}
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 顶部 overscroll 露出橙色底层
  container: {
    flex: 1,
    backgroundColor: '#ED8422',
  },
  // 底部 overscroll 露出暖白
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

  // ── Hero ──────────────────────────────────────────────────
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
  heroTitleGroup: {
    position: 'absolute',
    left: 27,
    bottom: 12,
    zIndex: 2,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.3,
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

  // ── Warm White Sheet ──────────────────────────────────────
  contentSheet: {
    flex: 1,
    minHeight: 560,
    backgroundColor: '#FFF8F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 2,
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 89,
  },
  sheetContent: {
    gap: 16,
  },

  // ── User Profile Block ────────────────────────────────────
  profileBlock: {
    height: 91,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(237,132,34,0.2)',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: 9,
    paddingLeft: 12,
    paddingRight: 77,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#C97010',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAD9C4',
    flexShrink: 0,
  },
  userInfo: {
    gap: 5,
  },
  userId: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  userSubtitle: {
    color: '#8A7060',
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
  statPressable: {
    flex: 1,
  },
  statBlock: {
    height: 80,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(237,132,34,0.18)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#C97010',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 3,
  },
  statNumber: {
    color: '#1A1A1A',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  statLabel: {
    color: '#8A7060',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  // ── Achievement Card ──────────────────────────────────────
  achievementCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#C97010',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievementTitle: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 14,
  },
  badgePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F0E6D8',
  },

  // ── Function Card ─────────────────────────────────────────
  functionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#FFFFFF',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 0,
    shadowColor: '#C97010',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  functionTitle: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  functionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  functionItemPressed: {
    opacity: 0.6,
  },
  functionItemLabel: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  functionDivider: {
    height: 1,
    backgroundColor: 'rgba(237,132,34,0.1)',
  },
});

import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import DogHero from '@/assets/illustrations/dog-hero.svg';

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

// ── Screen ───────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.headerTitle}>关于 PetMap</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
      </SafeAreaView>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero Section ─────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <DogHero width={120} height={156} />
          <Text style={styles.heroAppName}>PetMap</Text>
          <Text style={styles.heroTagline}>属于你和爱宠的专属地图</Text>
        </View>

        {/* ── Intro Card ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PetMap 是什么</Text>
          <Text style={styles.cardText}>
            PetMap 希望帮助宠物主人更轻松地发现适合携宠出行、散步、休息和探索的地点。
          </Text>
          <Text style={[styles.cardText, styles.cardTextSpaced]}>
            你可以在这里收藏地点、提交地点、分享发现，也可以帮助我们一起完善地图信息。
          </Text>
        </View>

        {/* ── Version Card ─────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>当前版本</Text>
            <Text style={styles.infoValue}>PetMap v1.0 Beta</Text>
          </View>
        </View>

        {/* ── Contact Card ─────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>官方联系方式</Text>
            <Text style={styles.infoValueMuted}>即将上线</Text>
          </View>
        </View>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>和巡逻狗狗一起，把爱宠地图一点点补完整。</Text>
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
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 12,
  },

  // ── Hero Section ──────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    backgroundColor: '#ED8422',
    paddingTop: 28,
    paddingBottom: 36,
    marginHorizontal: -16,
    marginBottom: 4,
    gap: 6,
  },
  heroAppName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  heroTagline: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },

  // ── Card ──────────────────────────────────────────────────────────
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 0,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ED8422',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#404040',
  },
  cardTextSpaced: {
    marginTop: 8,
  },

  // ── Info Card ─────────────────────────────────────────────────────
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#FFFEFF',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  infoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#303030',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#303030',
  },
  infoValueMuted: {
    fontSize: 13,
    fontWeight: '400',
    color: '#B0ABA4',
  },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#B0ABA4',
    textAlign: 'center',
  },
});

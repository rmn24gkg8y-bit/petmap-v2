import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DogHero from '@/assets/illustrations/dog-hero.svg';

// ── Sub-components ───────────────────────────────────────────────────────────

function BulletRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={20} color="#ED8422" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.illustrationArea}>
        <DogHero width={160} height={210} />
      </View>

      <View style={styles.textArea}>
        <Text style={styles.eyebrow}>属于你和爱宠的专属地图</Text>
        <Text style={styles.headline}>欢迎来到{'\n'}PetMap</Text>
        <View style={styles.bullets}>
          <BulletRow icon="map-outline" text="发现宠物友好地点" />
          <BulletRow icon="heart-outline" text="收藏和分享好去处" />
          <BulletRow icon="add-circle-outline" text="提交地点，一起完善地图" />
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}>
          <Text style={styles.primaryBtnText}>开始使用</Text>
        </Pressable>
      </View>
    </View>
  );
}

function LocationStep({ onEnable, onSkip }: { onEnable: () => void; onSkip: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.locationIconArea}>
        <View style={styles.locationIconCircle}>
          <Ionicons name="location" size={52} color="#ED8422" />
        </View>
      </View>

      <View style={styles.textArea}>
        <Text style={styles.headline}>开启定位{'\n'}发现附近地点</Text>
        <Text style={styles.desc}>
          开启定位后，PetMap 可以帮你发现附近的宠物友好地点，并显示与你的距离。
        </Text>
        <Text style={styles.descMuted}>
          如果暂不开启，也可以继续浏览地图。随时可以在系统设置中调整权限。
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onEnable}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}>
          <Text style={styles.primaryBtnText}>开启定位</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>稍后再说</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }: { onDone: () => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'welcome' | 'location'>('welcome');

  async function handleEnableLocation() {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Ignore — Map page will re-request if needed.
    }
    await onDone();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {step === 'welcome' ? (
        <WelcomeStep onNext={() => setStep('location')} />
      ) : (
        <LocationStep onEnable={handleEnableLocation} onSkip={onDone} />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFF',
  },
  step: {
    flex: 1,
    paddingHorizontal: 28,
  },

  // Illustration
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  locationIconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(237,132,34,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text
  textArea: {
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ED8422',
    marginBottom: 6,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 36,
    marginBottom: 22,
  },
  desc: {
    fontSize: 15,
    lineHeight: 23,
    color: '#404040',
    marginBottom: 10,
  },
  descMuted: {
    fontSize: 13,
    lineHeight: 20,
    color: '#888888',
  },

  // Bullets
  bullets: {
    gap: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#404040',
  },

  // Buttons
  actions: {
    paddingBottom: 12,
    gap: 10,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ED8422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    color: '#999999',
  },
});

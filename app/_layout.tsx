import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import OnboardingScreen from '@/components/OnboardingScreen';
import { PetMapProvider } from '@/store/petmap-store';
import { loadHasSeenOnboarding, saveHasSeenOnboarding } from '@/repo/storageRepo';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Check onboarding status from AsyncStorage
  useEffect(() => {
    loadHasSeenOnboarding().then((seen) => {
      setShowOnboarding(!seen);
      setOnboardingChecked(true);
    });
  }, []);

  // Hide splash only when both fonts AND onboarding check are ready
  useEffect(() => {
    if (loaded && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [loaded, onboardingChecked]);

  if (!loaded || !onboardingChecked) {
    return null;
  }

  // First-time user: show onboarding before mounting the main app
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onDone={async () => {
          await saveHasSeenOnboarding();
          setShowOnboarding(false);
        }}
      />
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <PetMapProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="my-spots" options={{ headerShown: false, animation: 'slide_from_bottom', animationDuration: 260 }} />
          <Stack.Screen name="my-favorites" options={{ headerShown: false, animation: 'slide_from_bottom', animationDuration: 260 }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="about" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </PetMapProvider>
  );
}

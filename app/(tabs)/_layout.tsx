import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '地图',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'map',
                android: 'map',
                web: 'map',
              }}
              tintColor={color}
              size={28}
            />
          ),
          headerTitle: 'PetMap',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'safari',
                android: 'travel_explore',
                web: 'globe',
              }}
              tintColor={color}
              size={28}
            />
          ),
          headerTitle: 'Explore',
        }}
      />
    </Tabs>
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Spot } from '@/types/spot';

const FAVORITE_IDS_KEY = 'petmap.favoriteIds';
const RECENT_VIEWED_IDS_KEY = 'petmap.recentViewedIds';
const USER_CREATED_SPOTS_KEY = 'petmap.userCreatedSpots';

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

async function loadStringArray(key: string): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(key);

    return parseStringArray(value);
  } catch {
    return [];
  }
}

async function saveStringArray(key: string, value: string[]) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore persistence errors for now and keep the in-memory state usable.
  }
}

function isSpot(value: unknown): value is Spot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const spot = value as Record<string, unknown>;

  return (
    typeof spot.id === 'string' &&
    typeof spot.name === 'string' &&
    (spot.source === 'system' || spot.source === 'user') &&
    typeof spot.district === 'string' &&
    typeof spot.addressHint === 'string' &&
    typeof spot.lat === 'number' &&
    typeof spot.lng === 'number' &&
    Array.isArray(spot.tags) &&
    spot.tags.every((item) => typeof item === 'string') &&
    typeof spot.description === 'string' &&
    typeof spot.votes === 'number'
  );
}

async function loadSpots(key: string): Promise<Spot[]> {
  try {
    const value = await AsyncStorage.getItem(key);

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.filter(isSpot) : [];
  } catch {
    return [];
  }
}

async function saveSpots(key: string, value: Spot[]) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore persistence errors for now and keep the in-memory state usable.
  }
}

export function loadFavoriteIds() {
  return loadStringArray(FAVORITE_IDS_KEY);
}

export function saveFavoriteIds(value: string[]) {
  return saveStringArray(FAVORITE_IDS_KEY, value);
}

export function loadRecentViewedIds() {
  return loadStringArray(RECENT_VIEWED_IDS_KEY);
}

export function saveRecentViewedIds(value: string[]) {
  return saveStringArray(RECENT_VIEWED_IDS_KEY, value);
}

export function loadUserCreatedSpots() {
  return loadSpots(USER_CREATED_SPOTS_KEY);
}

export function saveUserCreatedSpots(value: Spot[]) {
  return saveSpots(USER_CREATED_SPOTS_KEY, value);
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FeedbackRecord } from '@/types/inbox';
import type { Spot } from '@/types/spot';

const FAVORITE_IDS_KEY = 'petmap.favoriteIds';
const RECENT_VIEWED_IDS_KEY = 'petmap.recentViewedIds';
const USER_CREATED_SPOTS_KEY = 'petmap.userCreatedSpots';
const FORMATTED_ADDRESS_MAP_KEY = 'petmap.formattedAddressBySpotId';
const FEEDBACK_RECORDS_KEY = 'petmap.feedbackRecords';

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

function parseStringRecord(value: string | null): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [recordKey, recordValue]) => {
      if (typeof recordKey === 'string' && typeof recordValue === 'string') {
        acc[recordKey] = recordValue;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

function isBaseSpot(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const spot = value as Record<string, unknown>;

  return (
    typeof spot.id === 'string' &&
    typeof spot.name === 'string' &&
    (spot.source === 'system' || spot.source === 'user') &&
    (spot.submissionStatus === undefined ||
      spot.submissionStatus === 'local' ||
      spot.submissionStatus === 'pending_review') &&
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

function parseSpot(value: unknown): Spot | null {
  if (!isBaseSpot(value)) {
    return null;
  }

  const spot = value as Record<string, unknown>;
  const spotType =
    spot.spotType === 'park' ||
    spot.spotType === 'cafe' ||
    spot.spotType === 'hospital' ||
    spot.spotType === 'store' ||
    spot.spotType === 'indoor' ||
    spot.spotType === 'other'
      ? spot.spotType
      : 'other';

  return {
    id: spot.id as string,
    name: spot.name as string,
    source: spot.source as Spot['source'],
    submissionStatus:
      spot.submissionStatus === 'local' || spot.submissionStatus === 'pending_review'
        ? spot.submissionStatus
        : undefined,
    spotType,
    district: spot.district as string,
    addressHint: spot.addressHint as string,
    lat: spot.lat as number,
    lng: spot.lng as number,
    tags: spot.tags as string[],
    description: spot.description as string,
    votes: spot.votes as number,
    petFriendlyLevel:
      spot.petFriendlyLevel === 'high' ||
      spot.petFriendlyLevel === 'medium' ||
      spot.petFriendlyLevel === 'low'
        ? spot.petFriendlyLevel
        : undefined,
    priceLevel:
      spot.priceLevel === '$' || spot.priceLevel === '$$' || spot.priceLevel === '$$$'
        ? spot.priceLevel
        : undefined,
    businessHours: typeof spot.businessHours === 'string' ? spot.businessHours : undefined,
    contact: typeof spot.contact === 'string' ? spot.contact : undefined,
    verified: typeof spot.verified === 'boolean' ? spot.verified : undefined,
    merchantStatus:
      spot.merchantStatus === 'none' || spot.merchantStatus === 'claimed'
        ? spot.merchantStatus
        : undefined,
    photoUris:
      Array.isArray(spot.photoUris) && spot.photoUris.every((item) => typeof item === 'string')
        ? (spot.photoUris as string[])
        : undefined,
    formattedAddress: typeof spot.formattedAddress === 'string' ? spot.formattedAddress : undefined,
  };
}

async function loadSpots(key: string): Promise<Spot[]> {
  try {
    const value = await AsyncStorage.getItem(key);

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
          .map((item) => parseSpot(item))
          .filter((item): item is Spot => item !== null)
      : [];
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

function parseFeedbackRecord(value: unknown): FeedbackRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const status =
    record.status === 'received' || record.status === 'in_progress' || record.status === 'replied'
      ? record.status
      : 'received';
  const replyValue = record.reply;
  const reply =
    replyValue &&
    typeof replyValue === 'object' &&
    typeof (replyValue as Record<string, unknown>).content === 'string' &&
    typeof (replyValue as Record<string, unknown>).repliedAt === 'string'
      ? {
          content: (replyValue as Record<string, unknown>).content as string,
          repliedAt: (replyValue as Record<string, unknown>).repliedAt as string,
        }
      : undefined;

  if (
    record.sourceType !== 'feedback' ||
    typeof record.id !== 'string' ||
    (record.feedbackType !== 'spot' &&
      record.feedbackType !== 'activity' &&
      record.feedbackType !== 'product' &&
      record.feedbackType !== 'bug') ||
    typeof record.title !== 'string' ||
    typeof record.content !== 'string' ||
    typeof record.createdAt !== 'string' ||
    (record.contextType !== 'spot' &&
      record.contextType !== 'activity' &&
      record.contextType !== 'none')
  ) {
    return null;
  }

  return {
    id: record.id,
    sourceType: 'feedback',
    feedbackType: record.feedbackType,
    title: record.title,
    content: record.content,
    createdAt: record.createdAt,
    status,
    reply,
    contextType: record.contextType,
    spotId: typeof record.spotId === 'string' ? record.spotId : undefined,
    spotName: typeof record.spotName === 'string' ? record.spotName : undefined,
    activityKey: typeof record.activityKey === 'string' ? record.activityKey : undefined,
    activityTitle: typeof record.activityTitle === 'string' ? record.activityTitle : undefined,
  };
}

export async function loadFeedbackRecords(): Promise<FeedbackRecord[]> {
  try {
    const value = await AsyncStorage.getItem(FEEDBACK_RECORDS_KEY);

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
          .map((item) => parseFeedbackRecord(item))
          .filter((item): item is FeedbackRecord => item !== null)
      : [];
  } catch {
    return [];
  }
}

export async function saveFeedbackRecords(value: FeedbackRecord[]) {
  try {
    await AsyncStorage.setItem(FEEDBACK_RECORDS_KEY, JSON.stringify(value));
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

export async function loadFormattedAddressBySpotId() {
  try {
    const value = await AsyncStorage.getItem(FORMATTED_ADDRESS_MAP_KEY);

    return parseStringRecord(value);
  } catch {
    return {};
  }
}

export async function saveFormattedAddressBySpotId(value: Record<string, string>) {
  try {
    await AsyncStorage.setItem(FORMATTED_ADDRESS_MAP_KEY, JSON.stringify(value));
  } catch {
    // Ignore persistence errors for now and keep the in-memory state usable.
  }
}

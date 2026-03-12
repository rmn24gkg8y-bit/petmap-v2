import { mockSpots } from '@/repo/spotsRepo';
import type {
  MerchantStatus,
  PetFriendlyLevel,
  PriceLevel,
  Spot,
  SpotType,
} from '@/types/spot';

const CLOUD_SPOTS_ENDPOINT = process.env.EXPO_PUBLIC_SYSTEM_SPOTS_ENDPOINT?.trim() ?? '';

const SPOT_TYPES: SpotType[] = ['park', 'cafe', 'hospital', 'store', 'indoor', 'other'];
const PET_FRIENDLY_LEVELS: PetFriendlyLevel[] = ['high', 'medium', 'low'];
const PRICE_LEVELS: PriceLevel[] = ['$', '$$', '$$$'];
const MERCHANT_STATUS: MerchantStatus[] = ['none', 'claimed'];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asOptionalString(value: unknown) {
  const text = asString(value);

  return text ? text : undefined;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter(Boolean);
}

function asBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function asEnumValue<T extends string>(value: unknown, validValues: T[], fallback: T) {
  if (typeof value === 'string' && validValues.includes(value as T)) {
    return value as T;
  }

  return fallback;
}

function asOptionalEnumValue<T extends string>(value: unknown, validValues: T[]) {
  if (typeof value === 'string' && validValues.includes(value as T)) {
    return value as T;
  }

  return undefined;
}

function normalizeCloudSpot(input: unknown): Spot | null {
  const item = asRecord(input);

  if (!item) {
    return null;
  }

  const id = asString(item.id);
  const name = asString(item.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    source: 'system',
    spotType: asEnumValue(item.spotType, SPOT_TYPES, 'other'),
    district: asString(item.district),
    addressHint: asString(item.addressHint),
    lat: asNumber(item.lat),
    lng: asNumber(item.lng),
    tags: asStringArray(item.tags),
    description: asString(item.description),
    votes: asNumber(item.votes),
    petFriendlyLevel: asOptionalEnumValue(item.petFriendlyLevel, PET_FRIENDLY_LEVELS),
    priceLevel: asOptionalEnumValue(item.priceLevel, PRICE_LEVELS),
    businessHours: asOptionalString(item.businessHours),
    contact: asOptionalString(item.contact),
    verified: asBoolean(item.verified),
    merchantStatus: asOptionalEnumValue(item.merchantStatus, MERCHANT_STATUS),
    photoUris: asStringArray(item.photoUris),
    formattedAddress: asOptionalString(item.formattedAddress),
  };
}

function extractSpotListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const objectPayload = asRecord(payload);

  if (!objectPayload) {
    return [];
  }

  if (Array.isArray(objectPayload.spots)) {
    return objectPayload.spots;
  }

  if (Array.isArray(objectPayload.data)) {
    return objectPayload.data;
  }

  return [];
}

export async function fetchSystemSpotsFromCloud(): Promise<Spot[]> {
  if (!CLOUD_SPOTS_ENDPOINT) {
    throw new Error('EXPO_PUBLIC_SYSTEM_SPOTS_ENDPOINT is not configured');
  }

  const response = await fetch(CLOUD_SPOTS_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Cloud spots request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const cloudSpots = extractSpotListPayload(payload)
    .map(normalizeCloudSpot)
    .filter((spot): spot is Spot => spot !== null);

  if (cloudSpots.length === 0) {
    throw new Error('Cloud spots payload is empty or invalid');
  }

  return cloudSpots;
}

export function getFallbackSystemSpots(): Spot[] {
  return mockSpots;
}

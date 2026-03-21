import { mockSpots } from '@/repo/spotsRepo';
import type {
  MerchantStatus,
  PetFriendlyLevel,
  PriceLevel,
  Spot,
  SpotType,
} from '@/types/spot';
import {
  ADMIN_DELETE_ENDPOINT,
  ADMIN_PUBLISH_ENDPOINT,
  ADMIN_PUBLISH_SECRET,
  ADMIN_UPLOAD_COVER_ENDPOINT,
  ADMIN_UPDATE_PHOTOS_ENDPOINT,
  ADMIN_UPDATE_ENDPOINT,
} from '@/constants/adminConfig';

const CLOUD_SPOTS_ENDPOINT = process.env.EXPO_PUBLIC_SYSTEM_SPOTS_ENDPOINT?.trim() ?? '';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '').trim();

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

// ── Normalizer for custom cloud endpoint (camelCase fields) ─────────────────

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

// ── Normalizer for Supabase spots table (snake_case fields) ─────────────────

function normalizeSupabaseSpot(input: unknown): Spot | null {
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
    spotType: asEnumValue(item.spot_type, SPOT_TYPES, 'other'),
    district: asString(item.district),
    addressHint: asString(item.address_hint),
    lat: asNumber(item.lat),
    lng: asNumber(item.lng),
    tags: asStringArray(item.tags),
    description: asString(item.description),
    votes: asNumber(item.votes),
    petFriendlyLevel: asOptionalEnumValue(item.pet_friendly_level, PET_FRIENDLY_LEVELS),
    priceLevel: asOptionalEnumValue(item.price_level, PRICE_LEVELS),
    businessHours: asOptionalString(item.business_hours),
    contact: asOptionalString(item.contact),
    verified: asBoolean(item.verified),
    merchantStatus: asOptionalEnumValue(item.merchant_status, MERCHANT_STATUS),
    photoUris: asStringArray(item.photo_uris),
    formattedAddress: asOptionalString(item.formatted_address),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Custom cloud endpoint (legacy, kept for future use) ──────────────────────

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

// ── Supabase spots table ─────────────────────────────────────────────────────

export async function fetchSpotsFromSupabase(): Promise<Spot[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase is not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/spots?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase spots fetch failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const spots = (Array.isArray(payload) ? payload : [])
    .map(normalizeSupabaseSpot)
    .filter((spot): spot is Spot => spot !== null);

  if (spots.length === 0) {
    throw new Error('Supabase spots response is empty or invalid');
  }

  return spots;
}

export async function updateSystemSpotViaAdminEndpoint(spot: Spot): Promise<Spot> {
  if (!ADMIN_UPDATE_ENDPOINT) {
    throw new Error(
      '管理员更新接口未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_UPDATE_ENDPOINT'
    );
  }

  if (!ADMIN_PUBLISH_SECRET) {
    throw new Error(
      '管理员发布密钥未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_PUBLISH_SECRET'
    );
  }

  const response = await fetch(ADMIN_UPDATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_PUBLISH_SECRET,
    },
    body: JSON.stringify({ spot }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`更新失败 (${response.status}): ${text}`);
  }

  const data: unknown = await response.json();
  const returnedRow = asRecord(data);
  const spotRow = returnedRow ? asRecord(returnedRow.spot) : null;
  const updatedSpot = normalizeSupabaseSpot(spotRow);

  if (!updatedSpot) {
    throw new Error('更新成功但返回数据无效，请刷新后重试');
  }

  return updatedSpot;
}

export async function updateSystemSpotInSupabase(spot: Spot): Promise<Spot> {
  return updateSystemSpotViaAdminEndpoint(spot);
}

export async function deleteSystemSpotViaAdminEndpoint(spotId: string): Promise<void> {
  const id = spotId.trim();

  if (!id) {
    throw new Error('缺少地点 ID，无法删除');
  }

  if (!ADMIN_DELETE_ENDPOINT) {
    throw new Error(
      '管理员删除接口未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_DELETE_ENDPOINT'
    );
  }

  if (!ADMIN_PUBLISH_SECRET) {
    throw new Error(
      '管理员发布密钥未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_PUBLISH_SECRET'
    );
  }

  const response = await fetch(ADMIN_DELETE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_PUBLISH_SECRET,
    },
    body: JSON.stringify({ spotId: id }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`删除失败 (${response.status}): ${text}`);
  }
}

type UploadSystemSpotCoverInput = {
  spotId: string;
  base64Data: string;
  mimeType: string;
};

export async function uploadSystemSpotCoverViaAdminEndpoint(
  input: UploadSystemSpotCoverInput
): Promise<Spot> {
  const spotId = input.spotId.trim();
  const base64Data = input.base64Data.trim();
  const mimeType = input.mimeType.trim();

  if (!spotId) {
    throw new Error('缺少地点 ID，无法上传图片');
  }

  if (!base64Data) {
    throw new Error('图片数据为空，请重新选择');
  }

  if (!mimeType) {
    throw new Error('图片类型无效，请重新选择');
  }

  if (!ADMIN_UPLOAD_COVER_ENDPOINT) {
    throw new Error(
      '管理员上传封面接口未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_UPLOAD_COVER_ENDPOINT'
    );
  }

  if (!ADMIN_PUBLISH_SECRET) {
    throw new Error(
      '管理员发布密钥未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_PUBLISH_SECRET'
    );
  }

  const response = await fetch(ADMIN_UPLOAD_COVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_PUBLISH_SECRET,
    },
    body: JSON.stringify({
      spotId,
      base64Data,
      mimeType,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`上传失败 (${response.status}): ${text}`);
  }

  const data: unknown = await response.json();
  const returnedRow = asRecord(data);
  const spotRow = returnedRow ? asRecord(returnedRow.spot) : null;
  const updatedSpot = normalizeSupabaseSpot(spotRow);

  if (!updatedSpot) {
    throw new Error('上传成功但返回数据无效，请刷新后重试');
  }

  return updatedSpot;
}

type UpdateSystemSpotPhotosAction = 'add' | 'replace' | 'delete' | 'set_cover';

type UpdateSystemSpotPhotosInput = {
  spotId: string;
  action: UpdateSystemSpotPhotosAction;
  index?: number;
  base64Data?: string;
  mimeType?: string;
};

export async function updateSystemSpotPhotosViaAdminEndpoint(
  input: UpdateSystemSpotPhotosInput
): Promise<Spot> {
  const spotId = input.spotId.trim();

  if (!spotId) {
    throw new Error('缺少地点 ID，无法管理图片');
  }

  if (!ADMIN_UPDATE_PHOTOS_ENDPOINT) {
    throw new Error(
      '管理员图片管理接口未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_UPDATE_PHOTOS_ENDPOINT'
    );
  }

  if (!ADMIN_PUBLISH_SECRET) {
    throw new Error(
      '管理员发布密钥未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_PUBLISH_SECRET'
    );
  }

  const response = await fetch(ADMIN_UPDATE_PHOTOS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_PUBLISH_SECRET,
    },
    body: JSON.stringify({
      spotId,
      action: input.action,
      index: input.index,
      base64Data: input.base64Data,
      mimeType: input.mimeType,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`图片管理失败 (${response.status}): ${text}`);
  }

  const data: unknown = await response.json();
  const returnedRow = asRecord(data);
  const spotRow = returnedRow ? asRecord(returnedRow.spot) : null;
  const updatedSpot = normalizeSupabaseSpot(spotRow);

  if (!updatedSpot) {
    throw new Error('图片管理成功但返回数据无效，请刷新后重试');
  }

  return updatedSpot;
}

// ── Admin: publish spot via server-side Edge Function ────────────────────────
// The client sends spot data + a shared secret to the Edge Function.
// The Edge Function uses the service role key (server-side only) to write
// to the `spots` table — the service role key never touches the client.
//
// Setup:
//   1. Deploy supabase/functions/admin-publish-spot
//   2. supabase secrets set ADMIN_PUBLISH_SECRET=<your_secret>
//   3. Set in .env:
//        EXPO_PUBLIC_ADMIN_PUBLISH_ENDPOINT=https://xxx.supabase.co/functions/v1/admin-publish-spot
//        EXPO_PUBLIC_ADMIN_PUBLISH_SECRET=<your_secret>
//
// Returns the Supabase-generated UUID of the new spot.

type CreateCoverImagePayload = {
  base64Data: string;
  mimeType: string;
};

export async function publishSpotViaAdminEndpoint(
  spot: Spot,
  coverImage?: CreateCoverImagePayload
): Promise<Spot> {
  if (!ADMIN_PUBLISH_ENDPOINT) {
    throw new Error(
      '管理员发布接口未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_PUBLISH_ENDPOINT'
    );
  }

  if (!ADMIN_PUBLISH_SECRET) {
    throw new Error(
      '管理员发布密钥未配置，请在 .env 中设置 EXPO_PUBLIC_ADMIN_PUBLISH_SECRET'
    );
  }

  const response = await fetch(ADMIN_PUBLISH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_PUBLISH_SECRET,
    },
    body: JSON.stringify({ spot, coverImage }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`发布失败 (${response.status}): ${text}`);
  }

  const data: unknown = await response.json();
  const returnedRow = asRecord(data);
  const spotRow = returnedRow ? asRecord(returnedRow.spot) : null;
  const savedSpot = normalizeSupabaseSpot(spotRow);

  if (!savedSpot) {
    throw new Error('发布成功但返回数据无效，请刷新地图查看');
  }

  return savedSpot;
}

// ── Fallback ─────────────────────────────────────────────────────────────────

export function getFallbackSystemSpots(): Spot[] {
  return mockSpots;
}

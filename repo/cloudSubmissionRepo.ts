import type { Spot } from '@/types/spot';

const SPOT_SUBMISSION_ENDPOINT = process.env.EXPO_PUBLIC_SPOT_SUBMISSION_ENDPOINT?.trim() ?? '';

export function hasSpotSubmissionEndpointConfigured() {
  return SPOT_SUBMISSION_ENDPOINT.length > 0;
}

type SpotSubmissionPayload = {
  id: string;
  name: string;
  spotType: Spot['spotType'];
  district: string;
  addressHint: string;
  lat: number;
  lng: number;
  tags: string[];
  description: string;
  source: Spot['source'];
  submissionStatus: 'pending_review';
  petFriendlyLevel?: Spot['petFriendlyLevel'];
  priceLevel?: Spot['priceLevel'];
  businessHours?: string;
  contact?: string;
  verified?: boolean;
  merchantStatus?: Spot['merchantStatus'];
  photoUris?: string[];
  formattedAddress?: string;
  submittedAt: string;
  submissionSource: 'petmap-app';
};

export function mapSpotToSubmissionPayload(spot: Spot): SpotSubmissionPayload {
  return {
    id: spot.id,
    name: spot.name,
    spotType: spot.spotType,
    district: spot.district,
    addressHint: spot.addressHint,
    lat: spot.lat,
    lng: spot.lng,
    tags: spot.tags,
    description: spot.description,
    source: spot.source,
    submissionStatus: 'pending_review',
    petFriendlyLevel: spot.petFriendlyLevel,
    priceLevel: spot.priceLevel,
    businessHours: spot.businessHours,
    contact: spot.contact,
    verified: spot.verified,
    merchantStatus: spot.merchantStatus,
    photoUris: spot.photoUris,
    formattedAddress: spot.formattedAddress,
    submittedAt: new Date().toISOString(),
    submissionSource: 'petmap-app',
  };
}

export async function submitSpotForReviewToCloud(spot: Spot): Promise<void> {
  if (!SPOT_SUBMISSION_ENDPOINT) {
    throw new Error('EXPO_PUBLIC_SPOT_SUBMISSION_ENDPOINT is not configured');
  }

  const payload = mapSpotToSubmissionPayload(spot);
  const response = await fetch(SPOT_SUBMISSION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Cloud submission failed with status ${response.status}`);
  }
}

// ── Supabase submission ──────────────────────────────────────────────────────

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '').trim();

type SpotSupabasePayload = {
  spot_id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
  formatted_address: string | null;
  address_hint: string;
  spot_type: string;
  tags: string[];
  description: string;
  photo_uris: string[];
  source: string;
  submission_status: string;
  verified: boolean;
};

export async function submitSpotToSupabase(spot: Spot): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase is not configured');
  }

  const payload: SpotSupabasePayload = {
    spot_id: spot.id,
    name: spot.name,
    lat: spot.lat,
    lng: spot.lng,
    district: spot.district,
    formatted_address: spot.formattedAddress ?? null,
    address_hint: spot.addressHint,
    spot_type: spot.spotType,
    tags: spot.tags,
    description: spot.description,
    photo_uris: spot.photoUris ?? [],
    source: 'user',
    submission_status: 'pending_review',
    verified: false,
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/spot_submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase spot_submissions insert failed: ${response.status} ${text}`);
  }
}

// ── Review status query ──────────────────────────────────────────────────────

export type SubmissionReviewStatus = {
  spot_id: string;
  review_status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
};

/**
 * Query the latest review_status for each of the given spot IDs.
 * All errors are re-thrown so callers can handle them explicitly.
 */
export async function fetchSubmissionReviewStatusesBySpotIds(
  spotIds: string[],
): Promise<SubmissionReviewStatus[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[reviewSync] aborted: SUPABASE_URL or SUPABASE_KEY is not set');
    return [];
  }

  if (spotIds.length === 0) {
    return [];
  }

  const idsParam = spotIds.join(',');
  const url =
    `${SUPABASE_URL}/rest/v1/spot_submissions` +
    `?select=spot_id,review_status,review_note` +
    `&spot_id=in.(${idsParam})` +
    `&order=created_at.desc`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  const rawText = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(
      `[reviewSync] query failed: HTTP ${response.status} — ${rawText}`,
    );
  }

  let data: unknown;

  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('[reviewSync] failed to parse response JSON');
    return [];
  }

  if (!Array.isArray(data)) {
    console.error('[reviewSync] response is not an array:', typeof data);
    return [];
  }

  // Deduplicate: ordered desc by created_at, first occurrence = latest per spot_id
  const seen = new Set<string>();
  const results: SubmissionReviewStatus[] = [];

  for (const row of data) {
    if (!row || typeof row !== 'object') continue;

    const r = row as Record<string, unknown>;
    const spotId = typeof r.spot_id === 'string' ? r.spot_id.trim() : '';

    if (!spotId || seen.has(spotId)) {
      continue;
    }

    seen.add(spotId);

    const rawStatus = r.review_status;
    const reviewStatus: SubmissionReviewStatus['review_status'] =
      rawStatus === 'approved' || rawStatus === 'rejected' ? rawStatus : 'pending';

    results.push({
      spot_id: spotId,
      review_status: reviewStatus,
      review_note: typeof r.review_note === 'string' ? r.review_note : null,
    });
  }

  return results;
}

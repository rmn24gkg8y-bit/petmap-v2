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

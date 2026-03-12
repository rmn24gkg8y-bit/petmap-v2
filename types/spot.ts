export type SpotType = 'park' | 'cafe' | 'hospital' | 'store' | 'indoor' | 'other';
export type PetFriendlyLevel = 'high' | 'medium' | 'low';
export type PriceLevel = '$' | '$$' | '$$$';
export type MerchantStatus = 'none' | 'claimed';

export type Spot = {
  id: string;
  name: string;
  source: 'system' | 'user';
  submissionStatus?: 'local' | 'pending_review';
  spotType: SpotType;
  district: string;
  addressHint: string;
  lat: number;
  lng: number;
  tags: string[];
  description: string;
  votes: number;
  petFriendlyLevel?: PetFriendlyLevel;
  priceLevel?: PriceLevel;
  businessHours?: string;
  contact?: string;
  verified?: boolean;
  merchantStatus?: MerchantStatus;
  photoUris?: string[];
  formattedAddress?: string;
};

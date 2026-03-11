export type Spot = {
  id: string;
  name: string;
  source: 'system' | 'user';
  district: string;
  addressHint: string;
  lat: number;
  lng: number;
  tags: string[];
  description: string;
  votes: number;
};

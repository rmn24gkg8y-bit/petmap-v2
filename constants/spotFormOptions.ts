import type { PetFriendlyLevel, PriceLevel, SpotType } from '@/types/spot';

export const DISTRICT_OPTIONS = [
  '黄浦区',
  '徐汇区',
  '长宁区',
  '静安区',
  '普陀区',
  '虹口区',
  '杨浦区',
  '浦东新区',
  '闵行区',
];

export const SPOT_TYPE_OPTIONS: SpotType[] = [
  'park',
  'cafe',
  'hospital',
  'store',
  'indoor',
  'other',
];

export const SPOT_TYPE_LABELS: Record<SpotType, string> = {
  park: '公园',
  cafe: '咖啡 / 餐饮',
  hospital: '宠物医院',
  store: '宠物店',
  indoor: '室内友好',
  other: '其他',
};

export const PET_FRIENDLY_LEVEL_LABELS: Record<PetFriendlyLevel, string> = {
  high: '非常友好',
  medium: '一般友好',
  low: '需确认',
};

export const PET_FRIENDLY_LEVEL_OPTIONS: PetFriendlyLevel[] = ['high', 'medium', 'low'];

export const PRICE_LEVEL_OPTIONS: PriceLevel[] = ['$', '$$', '$$$'];

export const TAG_OPTIONS = [
  '咖啡',
  '宠物友好',
  '室外座位',
  '散步',
  '江边',
  '开阔空间',
  '公园',
  '休息',
  '绿地',
  '面包',
  '街区',
  '草坪',
  '奔跑',
  '户外',
  '书店',
  '安静',
  '社区',
];

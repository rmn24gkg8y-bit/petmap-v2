export type ActivityCollection = {
  key: string;
  title: string;
  summary: string;
  statusLabel: string;
  ctaLabel: string;
  imageUri?: string;
  spotIds: string[];
  interactionMode: 'collection' | 'upcoming';
};

export const ACTIVITY_COLLECTIONS: ActivityCollection[] = [
  {
    key: 'weekend-walk',
    title: '周末宠物散步集合',
    summary: '适合带宠物轻松出门的线下小活动，先从热门地点开始。',
    statusLabel: '本周活动',
    ctaLabel: '查看专题',
    imageUri: undefined,
    spotIds: ['spot-2', 'spot-3', 'spot-5'],
    interactionMode: 'collection',
  },
  {
    key: 'pet-friendly-pick',
    title: '本周宠物友好精选',
    summary: '平台正在整理适合带宠物停留和打卡的地点内容。',
    statusLabel: '平台活动',
    ctaLabel: '查看专题',
    imageUri: undefined,
    spotIds: ['spot-1', 'spot-4', 'spot-6'],
    interactionMode: 'collection',
  },
  {
    key: 'merchant-event',
    title: '商家活动报名',
    summary: '后续会支持品牌和商家发布活动内容，当前先开放前台预览。',
    statusLabel: '即将支持',
    ctaLabel: '即将支持报名',
    imageUri: undefined,
    spotIds: [],
    interactionMode: 'upcoming',
  },
];

export function getActivityCollectionByKey(key: string) {
  return ACTIVITY_COLLECTIONS.find((activity) => activity.key === key) ?? null;
}

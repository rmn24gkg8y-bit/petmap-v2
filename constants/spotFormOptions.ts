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

// ── Tag whitelist ─────────────────────────────────────────────────────────────
// 前台唯一允许展示的 tag 集合。新建点位只能从这里选。

export const TAG_WHITELIST = [
  '草坪',
  '散步',
  '安静',
  '室外座位',
  '宠物友好',
  '分区活动',
  '需预约',
  '屋顶',
  '江边',
  '开阔空间',
] as const;

// Form 选项直接用白名单
export const TAG_OPTIONS: string[] = [...TAG_WHITELIST];

// ── Front-end tag normalization ───────────────────────────────────────────────

// 已知真实点位的前台 tag 覆盖（Supabase 数据暂未更新前的兜底）
const SPOT_TAG_OVERRIDES: Record<string, string[]> = {
  '和平公园':             ['宠物友好', '分区活动', '散步', '开阔空间'],
  '世纪公园宠物乐园':     ['宠物友好', '分区活动', '需预约', '草坪'],
  '北外滩来福士·来福公园':['屋顶', '宠物友好', '散步', '开阔空间'],
  '狗莉莉咖啡':          ['宠物友好', '安静', '室外座位', '散步'],
  'AI PLAZA 西岸凤巢':   ['宠物友好', '开阔空间', '散步', '室外座位'],
};

// 旧 tag → 白名单 tag 的一一映射（不在此表且不在白名单里的直接丢弃）
const TAG_LEGACY_REMAP: Record<string, string> = {
  '绿地':       '草坪',
  '奔跑':       '草坪',
  '开放草坪':   '草坪',
  '河边':       '江边',
  '户外':       '散步',
  '街区':       '散步',
  '休息':       '安静',
  '书店':       '安静',
  '社区':       '安静',
  '开阔':       '开阔空间',
  '室外空间':   '开阔空间',
  '开放空间':   '开阔空间',
  '宠物乐园':   '分区活动',
  '专属宠物乐园': '分区活动',
  '可带入':     '宠物友好',
  '人宠同桌':   '宠物友好',
  '人宠共食':   '宠物友好',
};

const TAG_WHITELIST_SET = new Set<string>(TAG_WHITELIST);
const TYPE_ONLY_TAGS_SET = new Set<string>(['公园', '咖啡', '商场']);

/**
 * 把任意 tags 数组归一化到白名单。
 * 优先级：点位名字 override > 白名单直通 > legacy 映射 > 丢弃
 */
export function normalizeSpotTags(tags: string[], spotName?: string): string[] {
  if (spotName) {
    const override = SPOT_TAG_OVERRIDES[spotName];
    if (override) {
      return override.filter((tag) => TAG_WHITELIST_SET.has(tag));
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    const normalized = TAG_WHITELIST_SET.has(tag) ? tag : TAG_LEGACY_REMAP[tag];
    if (normalized && !TYPE_ONLY_TAGS_SET.has(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

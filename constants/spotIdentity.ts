import type { Spot } from '@/types/spot';

type SpotIdentityBadge = {
  label: string;
  variant: 'pending' | 'user' | 'system';
};

export function getSpotIdentityBadge(
  spot: Pick<Spot, 'source' | 'submissionStatus'>
): SpotIdentityBadge {
  if (spot.submissionStatus === 'pending_review') {
    return { label: '审核中', variant: 'pending' };
  }

  if (spot.source === 'user') {
    return { label: '用户添加', variant: 'user' };
  }

  return { label: '平台整理', variant: 'system' };
}

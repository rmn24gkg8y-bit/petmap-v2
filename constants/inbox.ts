import type { PlatformInboxMessage } from '@/types/inbox';

export const PLATFORM_INBOX_MESSAGES: PlatformInboxMessage[] = [
  {
    id: 'platform-release-2026-03',
    sourceType: 'platform',
    messageType: 'release',
    title: 'Feedback 页已支持上下文反馈',
    content: '现在可以从地点详情和活动专题直接带着对象信息进入反馈页，方便平台持续整理内容。',
    createdAt: '2026-03-10T09:30:00.000Z',
  },
  {
    id: 'platform-activity-2026-03',
    sourceType: 'platform',
    messageType: 'activity',
    title: '本周活动内容正在持续补充',
    content: 'Services 和活动专题页会继续补充更多宠物活动与精选内容，欢迎随时反馈修正建议。',
    createdAt: '2026-03-08T08:00:00.000Z',
  },
  {
    id: 'platform-reminder-2026-03',
    sourceType: 'platform',
    messageType: 'reminder',
    title: '你添加的地点也可以继续完善',
    content: '如果你已经添加过地点，可以继续补充图片、说明和标签，再提交审核。',
    createdAt: '2026-03-05T10:15:00.000Z',
  },
];

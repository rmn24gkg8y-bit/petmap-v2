export type FeedbackType = 'spot' | 'activity' | 'product' | 'bug';
export type InboxSourceType = 'feedback' | 'platform';
export type InboxContextType = 'spot' | 'activity' | 'none';
export type FeedbackStatus = 'received';
export type PlatformMessageType = 'activity' | 'release' | 'reminder';

export type FeedbackRecord = {
  id: string;
  sourceType: 'feedback';
  feedbackType: FeedbackType;
  title: string;
  content: string;
  createdAt: string;
  status: FeedbackStatus;
  contextType: InboxContextType;
  spotId?: string;
  spotName?: string;
  activityKey?: string;
  activityTitle?: string;
};

export type PlatformInboxMessage = {
  id: string;
  sourceType: 'platform';
  messageType: PlatformMessageType;
  title: string;
  content: string;
  createdAt: string;
};

export type InboxItem = FeedbackRecord | PlatformInboxMessage;

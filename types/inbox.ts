export type FeedbackType = 'spot' | 'activity' | 'product' | 'bug';
export type InboxSourceType = 'feedback' | 'platform';
export type InboxContextType = 'spot' | 'activity' | 'none';
export type FeedbackStatus = 'received' | 'in_progress' | 'replied';
export type PlatformMessageType = 'activity' | 'release' | 'reminder';
export type PlatformMessageTarget = {
  pathname:
    | '/about'
    | '/services'
    | '/settings'
    | '/my-spots'
    | '/activity/[activityKey]';
  params?: {
    activityKey?: string;
  };
  ctaLabel: string;
};
export type FeedbackReply = {
  content: string;
  repliedAt: string;
};

export type FeedbackRecord = {
  id: string;
  sourceType: 'feedback';
  feedbackType: FeedbackType;
  title: string;
  content: string;
  createdAt: string;
  status: FeedbackStatus;
  reply?: FeedbackReply;
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
  target?: PlatformMessageTarget;
};

export type InboxItem = FeedbackRecord | PlatformInboxMessage;

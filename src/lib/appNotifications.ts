import type { AiChatRecord } from '@/lib/aiChats';
import type { LibraryRecord } from '@/lib/libraries';
import type { MaterialPreview } from '@/lib/learningMaterials';
import type { ReviewerRecord } from '@/lib/reviewers';
import type { CalculatedStudyContext } from '@/lib/studyAnalytics';

export type AppNotificationRoute = 'home' | 'reviewers' | 'progress' | 'ai-chat' | 'settings';

export type AppNotificationKind = 'insight' | 'library' | 'material' | 'reviewer' | 'chat';

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  title: string;
  subtitle: string;
  timeLabel: string;
  tone: string;
  actionLabel: string;
  targetRoute: AppNotificationRoute;
  createdAt?: string;
  unread: boolean;
};

export type BuildAppNotificationsInput = {
  chats: AiChatRecord[];
  libraries: LibraryRecord[];
  materials: MaterialPreview[];
  reviewers: ReviewerRecord[];
  studyContext: CalculatedStudyContext;
};

const MAX_NOTIFICATIONS = 8;
const RECENT_UNREAD_WINDOW_MS = 1000 * 60 * 60 * 24;

export function buildAppNotifications({
  chats,
  libraries,
  materials,
  reviewers,
  studyContext,
}: BuildAppNotificationsInput) {
  const notifications: AppNotification[] = [
    ...buildInsightNotifications(studyContext),
    ...libraries.map(buildLibraryNotification),
    ...materials.map(buildMaterialNotification),
    ...reviewers.map(buildReviewerNotification),
    ...chats.map(buildChatNotification),
  ]
    .filter(Boolean)
    .sort((left, right) => getTimeValue(right.createdAt) - getTimeValue(left.createdAt))
    .slice(0, MAX_NOTIFICATIONS);

  const unreadCount = notifications.filter((item) => item.unread).length;

  return {
    notifications,
    unreadCount,
    summaryTitle:
      unreadCount > 0 ? `${unreadCount} new study updates` : 'Your study updates are current',
    summarySubtitle:
      notifications.length > 0
        ? 'Reviewers, materials, chats, and insights are synced from your real workspace data.'
        : 'Create a reviewer or add a material to start seeing live updates here.',
  };
}

function buildInsightNotifications(studyContext: CalculatedStudyContext): AppNotification[] {
  const weakSubjects = studyContext.analytics.weakSubjects.slice(0, 2);

  if (weakSubjects.length === 0) {
    return [];
  }

  return [
    {
      id: `insight-${studyContext.calculatedAt}`,
      kind: 'insight',
      title: 'Weak topic detected',
      subtitle: `${weakSubjects.map((subject) => subject.name).join(', ')} still needs another pass.`,
      timeLabel: 'Now',
      tone: '#ee845e',
      actionLabel: 'Review',
      targetRoute: 'progress',
      createdAt: studyContext.calculatedAt,
      unread: true,
    },
  ];
}

function buildLibraryNotification(library: LibraryRecord): AppNotification {
  const createdAt = library.updatedAt ?? library.createdAt;
  const unread = isRecent(createdAt);

  return {
    id: `library-${library.id}`,
    kind: 'library',
    title: library.name,
    subtitle: `${library.reviewerCount} reviewer${library.reviewerCount === 1 ? '' : 's'} · ${library.materialCount} material${library.materialCount === 1 ? '' : 's'}`,
    timeLabel: formatRelativeTime(createdAt),
    tone: library.color,
    actionLabel: 'Open',
    targetRoute: 'reviewers',
    createdAt,
    unread,
  };
}

function buildMaterialNotification(material: MaterialPreview): AppNotification {
  const createdAt = material.updatedAt ?? material.createdAt;
  const titlePrefix =
    material.status === 'Uploading'
      ? 'Material uploading'
      : material.status === 'Processing'
        ? 'Material processing'
        : material.status === 'Failed'
          ? 'Material failed'
          : material.status === 'Ready'
            ? 'Material ready'
            : 'Material saved';

  return {
    id: `material-${material.id}`,
    kind: 'material',
    title: `${titlePrefix}: ${material.title}`,
    subtitle: material.libraryName
      ? `Saved to ${material.libraryName}`
      : 'Not yet assigned to a subject',
    timeLabel: formatRelativeTime(material.remoteUrl ? undefined : material.previewUri),
    tone:
      material.status === 'Failed'
        ? '#b42318'
        : material.status === 'Ready'
          ? '#14b8a6'
          : '#006f6a',
    actionLabel: material.status === 'Failed' ? 'Retry' : 'Review',
    targetRoute: 'reviewers',
    createdAt,
    unread: material.status !== 'Saved' || isRecent(createdAt),
  };
}

function buildReviewerNotification(reviewer: ReviewerRecord): AppNotification {
  const createdAt = reviewer.updatedAt ?? reviewer.createdAt;
  const ready = reviewer.status === 'Ready';

  return {
    id: `reviewer-${reviewer.id}`,
    kind: 'reviewer',
    title: ready ? 'Reviewer ready' : 'Reviewer exported',
    subtitle: `${reviewer.title} · ${reviewer.subject} · ${reviewer.estimatedItems} item${reviewer.estimatedItems === 1 ? '' : 's'}`,
    timeLabel: formatRelativeTime(createdAt),
    tone: ready ? '#14b8a6' : '#006f6a',
    actionLabel: ready ? 'Study' : 'Open',
    targetRoute: 'reviewers',
    createdAt,
    unread: isRecent(createdAt),
  };
}

function buildChatNotification(chat: AiChatRecord): AppNotification {
  const createdAt = chat.updatedAt ?? chat.createdAt;

  return {
    id: `chat-${chat.id}`,
    kind: 'chat',
    title: chat.title,
    subtitle: chat.latestMessage || 'No messages yet',
    timeLabel: formatRelativeTime(createdAt),
    tone: '#42d8e7',
    actionLabel: 'Reply',
    targetRoute: 'ai-chat',
    createdAt,
    unread: isRecent(createdAt),
  };
}

function isRecent(value?: string) {
  const timeValue = getTimeValue(value);
  if (!timeValue) {
    return false;
  }

  return Date.now() - timeValue <= RECENT_UNREAD_WINDOW_MS;
}

function getTimeValue(value?: string) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatRelativeTime(value?: string) {
  const timeValue = getTimeValue(value);

  if (!timeValue) {
    return 'Recently';
  }

  const diffMs = Date.now() - timeValue;
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(timeValue).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

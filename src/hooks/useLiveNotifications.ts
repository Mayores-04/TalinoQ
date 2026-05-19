import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { subscribeToAiChats, type AiChatRecord } from '@/lib/aiChats';
import { subscribeToLibraries, type LibraryRecord } from '@/lib/libraries';
import { subscribeToAllLearningMaterials, type MaterialPreview } from '@/lib/learningMaterials';
import { subscribeToReviewers, type ReviewerRecord } from '@/lib/reviewers';
import { buildCalculatedStudyContext } from '@/lib/studyAnalytics';
import {
  buildAppNotifications,
  type AppNotification,
  type AppNotificationRoute,
} from '@/lib/appNotifications';

// External listeners to notify the hook when a notification ID is marked read
const externalReadListeners = new Set<(id: string) => void>();

export function subscribeToExternalNotificationReads(listener: (id: string) => void) {
  externalReadListeners.add(listener);
  return () => {
    externalReadListeners.delete(listener);
  };
}

export async function notifyNotificationRead(id: string) {
  if (!id) return;

  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_READ_IDS_KEY);
    let parsed: string[] = [];
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) parsed = p.map(String);
        else if (p && typeof p === 'object') parsed = Object.keys(p);
      } catch {
        // ignore
      }
    }

    if (!parsed.includes(id)) {
      parsed.push(id);
      await AsyncStorage.setItem(NOTIFICATION_READ_IDS_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore storage errors
  }

  // notify listeners synchronously
  for (const l of Array.from(externalReadListeners)) {
    try {
      l(id);
    } catch {
      // ignore listener errors
    }
  }
}

type LiveNotificationsState = {
  chats: AiChatRecord[];
  libraries: LibraryRecord[];
  materials: MaterialPreview[];
  reviewers: ReviewerRecord[];
  notifications: AppNotification[];
  unreadCount: number;
  summaryTitle: string;
  summarySubtitle: string;
  hasLoadedAll: boolean;
  markAllAsRead: () => void;
  markNotificationAsRead: (id: string) => void;
};

const initialLoadedFlags = {
  chats: false,
  libraries: false,
  materials: false,
  reviewers: false,
};

const NOTIFICATION_READ_CUTOFF_KEY = 'talinoq:notifications-read-cutoff:v1';
const NOTIFICATION_READ_IDS_KEY = 'talinoq:notifications-read-ids:v1';

function getTimeValue(value?: string) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function useLiveNotifications(refreshToken = 0): LiveNotificationsState {
  const [chats, setChats] = useState<AiChatRecord[]>([]);
  const [libraries, setLibraries] = useState<LibraryRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialPreview[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerRecord[]>([]);
  const [loadedFlags, setLoadedFlags] = useState(initialLoadedFlags);
  const [readCutoff, setReadCutoff] = useState<number>(0);
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(NOTIFICATION_READ_CUTOFF_KEY)
      .then((value) => {
        if (!isMounted) {
          return;
        }

        const parsed = Number(value);
        setReadCutoff(Number.isFinite(parsed) ? parsed : 0);
      })
      .catch(() => {
        if (isMounted) {
          setReadCutoff(0);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // listen for external reads (e.g., other pages marking notifications as read)
  useEffect(() => {
    const unsub = subscribeToExternalNotificationReads((id) => {
      if (!id) return;
      setReadIds((current) => {
        if (current[id]) return current;
        return { ...current, [id]: true };
      });
    });

    return unsub;
  }, []);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(NOTIFICATION_READ_IDS_KEY)
      .then((value) => {
        if (!isMounted) return;

        if (!value) {
          setReadIds({});
          return;
        }

        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const map: Record<string, boolean> = {};
            for (const id of parsed) {
              map[String(id)] = true;
            }
            setReadIds(map);
          } else if (parsed && typeof parsed === 'object') {
            const map: Record<string, boolean> = {};
            for (const k of Object.keys(parsed)) {
              map[k] = true;
            }
            setReadIds(map);
          } else {
            setReadIds({});
          }
        } catch (err) {
          setReadIds({});
        }
      })
      .catch(() => {
        if (isMounted) setReadIds({});
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setLoadedFlags(initialLoadedFlags);

    const unsubscribeChats = subscribeToAiChats((nextChats) => {
      setChats(nextChats);
      setLoadedFlags((current) => ({ ...current, chats: true }));
    });
    const unsubscribeLibraries = subscribeToLibraries((nextLibraries) => {
      setLibraries(nextLibraries);
      setLoadedFlags((current) => ({ ...current, libraries: true }));
    });
    const unsubscribeMaterials = subscribeToAllLearningMaterials((nextMaterials) => {
      setMaterials(nextMaterials);
      setLoadedFlags((current) => ({ ...current, materials: true }));
    });
    const unsubscribeReviewers = subscribeToReviewers((nextReviewers) => {
      setReviewers(nextReviewers);
      setLoadedFlags((current) => ({ ...current, reviewers: true }));
    });

    return () => {
      unsubscribeChats?.();
      unsubscribeLibraries?.();
      unsubscribeMaterials?.();
      unsubscribeReviewers?.();
    };
  }, [refreshToken]);

  const studyContext = useMemo(() => buildCalculatedStudyContext(reviewers), [reviewers]);
  const notificationState = useMemo(
    () =>
      buildAppNotifications({
        chats,
        libraries,
        materials,
        reviewers,
        studyContext,
      }),
    [chats, libraries, materials, reviewers, studyContext]
  );

  const notifications = useMemo(
    () =>
      notificationState.notifications.map((notification) => ({
        ...notification,
        unread:
          notification.unread &&
          getTimeValue(notification.createdAt) > readCutoff &&
          !Boolean(readIds[notification.id]),
      })),
    [notificationState.notifications, readCutoff, readIds]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications]
  );

  const markAllAsRead = () => {
    const nextCutoff = Date.now();
    setReadCutoff(nextCutoff);

    void AsyncStorage.setItem(NOTIFICATION_READ_CUTOFF_KEY, String(nextCutoff));
  };

  const markNotificationAsRead = (id: string) => {
    if (!id) return;

    // persist + notify via shared helper so other listeners sync
    void notifyNotificationRead(id);
    setReadIds((current) => (current[id] ? current : { ...current, [id]: true }));
  };

  return {
    chats,
    libraries,
    materials,
    reviewers,
    notifications,
    unreadCount,
    summaryTitle:
      unreadCount > 0 ? `${unreadCount} new study updates` : notificationState.summaryTitle,
    summarySubtitle: notificationState.summarySubtitle,
    hasLoadedAll: Object.values(loadedFlags).every(Boolean),
    markAllAsRead,
    markNotificationAsRead,
  };
}

export type { AppNotificationRoute } from '@/lib/appNotifications';

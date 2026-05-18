import {
  enqueueSync,
  listPendingSync,
  markSyncComplete,
  type LocalSyncQueueItem,
} from './localStorageService';
import { isOnline, subscribeToNetworkStatus } from './networkService';

export type SyncEntityType = 'material' | 'reviewer' | 'exam_result';
export type SyncAction = 'create' | 'update' | 'delete';

export async function queueSync(payload: {
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  data: Record<string, unknown>;
}) {
  const item: LocalSyncQueueItem = {
    id: `sync-${payload.entityType}-${payload.entityId}-${Date.now()}`,
    entityType: payload.entityType,
    entityId: payload.entityId,
    action: payload.action,
    payload: JSON.stringify(payload.data),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await enqueueSync(item);

  return item.id;
}

export async function processSyncQueue(handler: (item: LocalSyncQueueItem) => Promise<void>) {
  const online = await isOnline();
  if (!online) {
    return;
  }

  const pending = await listPendingSync();

  for (const item of pending) {
    await handler(item);
    await markSyncComplete(item.id);
  }
}

export function watchSyncQueue(handler: (item: LocalSyncQueueItem) => Promise<void>) {
  return subscribeToNetworkStatus((online) => {
    if (!online) {
      return;
    }

    processSyncQueue(handler).catch(() => undefined);
  });
}

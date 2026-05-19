import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { firebaseAuth, firebaseDb } from '@/lib/firebase';
import type { MaterialPreview } from '@/lib/learningMaterials';

export type AiChatMode = 'normal_chat' | 'creating_reviewer' | 'saving_material';
export type AiChatMessageRole = 'user' | 'assistant' | 'system';
export type AiChatMessageType = 'text' | 'file' | 'suggestion' | 'reviewer_flow' | 'error';

export type AiChatAttachment = {
  extractedText?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileUrl?: string;
  materialId?: string;
  mimeType?: string;
  status?: string;
};

export type AiChatRecord = {
  id: string;
  userId: string;
  title: string;
  latestMessage: string;
  messageCount: number;
  mode?: AiChatMode;
  linkedSubjectId?: string | null;
  linkedMaterialId?: string | null;
  linkedReviewerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AiChatMessageRecord = {
  id: string;
  chatId: string;
  userId: string;
  role: AiChatMessageRole;
  content: string;
  type: AiChatMessageType;
  attachments?: AiChatAttachment[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type SaveAiChatMessageInput = {
  chatId?: string | null;
  role: AiChatMessageRole;
  content: string;
  type?: AiChatMessageType;
  attachment?: MaterialPreview | null;
  mode?: AiChatMode;
  metadata?: Record<string, unknown>;
};

function getAiChatUserId() {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  if (!userId) {
    throw new Error('Sign in again before using AI chat history.');
  }

  return userId;
}

function aiChatsCollection(userId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return collection(firebaseDb, 'users', userId, 'aiChats');
}

function aiMessagesCollection(userId: string, chatId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return collection(firebaseDb, 'users', userId, 'aiChats', chatId, 'messages');
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readTimestamp(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return undefined;
}

function mapChat(snapshot: QueryDocumentSnapshot<DocumentData>): AiChatRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: readString(data.userId),
    title: readString(data.title, 'Untitled Chat'),
    latestMessage: readString(data.latestMessage),
    messageCount: readNumber(data.messageCount),
    mode:
      data.mode === 'creating_reviewer' || data.mode === 'saving_material'
        ? data.mode
        : 'normal_chat',
    linkedSubjectId: readNullableString(data.linkedSubjectId),
    linkedMaterialId: readNullableString(data.linkedMaterialId),
    linkedReviewerId: readNullableString(data.linkedReviewerId),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
  };
}

function mapMessage(snapshot: QueryDocumentSnapshot<DocumentData>): AiChatMessageRecord {
  const data = snapshot.data();
  const role =
    data.role === 'assistant' || data.role === 'system' || data.role === 'user'
      ? data.role
      : 'assistant';

  return {
    id: snapshot.id,
    chatId: readString(data.chatId),
    userId: readString(data.userId),
    role,
    content: readString(data.content),
    type: readMessageType(data.type),
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as AiChatAttachment[])
      : undefined,
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : undefined,
    createdAt: readTimestamp(data.createdAt),
  };
}

function readMessageType(value: unknown): AiChatMessageType {
  if (
    value === 'file' ||
    value === 'suggestion' ||
    value === 'reviewer_flow' ||
    value === 'error'
  ) {
    return value;
  }

  return 'text';
}

function sanitizeForFirestore(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForFirestore(v)).filter((v) => v !== undefined);
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, rawValue]) => {
      const v = sanitizeForFirestore(rawValue);
      if (v !== undefined) {
        out[key] = v;
      }
    });
    return out;
  }

  return value;
}

function titleFromMessage(message: string) {
  const cleaned = message
    .replace(/^create\s+(a\s+)?reviewer\s+(about|on|for)?\s*/i, '')
    .replace(/^make\s+(flashcards|a reviewer)\s+(about|on|for)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = cleaned || message.replace(/\s+/g, ' ').trim();
  const title = base.length > 42 ? `${base.slice(0, 39).trim()}...` : base;

  if (!title) {
    return 'New Chat';
  }

  if (/reviewer/i.test(message) && !/reviewer/i.test(title)) {
    return `${title} Reviewer`;
  }

  return title;
}

function attachmentFromMaterial(material?: MaterialPreview | null): AiChatAttachment[] | undefined {
  if (!material) {
    return undefined;
  }

  return [
    {
      extractedText: material.extractedText,
      fileName: material.fileName ?? material.title,
      fileSize: material.fileSize,
      fileType: material.sourceType ?? material.fileType,
      fileUrl: material.fileUrl ?? material.remoteUrl ?? material.url,
      materialId: material.id,
      mimeType: material.mimeType,
      status: material.status,
    },
  ];
}

export function subscribeToAiChats(
  onChats: (chats: AiChatRecord[]) => void,
  onError?: (message: string) => void
) {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!firebaseDb || !userId) {
    onChats([]);
    return () => {};
  }

  return onSnapshot(
    query(aiChatsCollection(userId), orderBy('updatedAt', 'desc'), limit(30)),
    (snapshot) => onChats(snapshot.docs.map(mapChat)),
    (error) => onError?.(error.message || 'Unable to load AI chat history.')
  );
}

export async function fetchAiChatMessages(chatId: string) {
  const userId = getAiChatUserId();
  const snapshot = await getDocs(
    query(aiMessagesCollection(userId, chatId), orderBy('createdAt', 'asc'), limit(120))
  );

  return snapshot.docs.map(mapMessage);
}

export async function saveAiChatMessage(input: SaveAiChatMessageInput) {
  const userId = getAiChatUserId();
  const chatRef = input.chatId
    ? doc(aiChatsCollection(userId), input.chatId)
    : doc(aiChatsCollection(userId));
  const chatId = chatRef.id;
  const messageRef = doc(aiMessagesCollection(userId, chatId));
  const content = input.content.trim();
  const batch = writeBatch(firebaseDb!);
  const isFirstMessage = !input.chatId;

  if (!content) {
    throw new Error('Chat messages cannot be empty.');
  }

  const rawAttachments = attachmentFromMaterial(input.attachment) ?? [];
  const attachments = (sanitizeForFirestore(rawAttachments) as AiChatAttachment[]) ?? [];
  const metadata = (sanitizeForFirestore(input.metadata ?? {}) as Record<string, unknown>) ?? {};

  const messagePayload = sanitizeForFirestore({
    chatId,
    userId,
    role: input.role,
    content,
    type: input.type ?? (input.attachment ? 'file' : 'text'),
    attachments,
    metadata,
    createdAt: serverTimestamp(),
  }) as Record<string, unknown>;

  batch.set(messageRef, messagePayload);

  const chatPayload = sanitizeForFirestore({
    ...(isFirstMessage
      ? {
          userId,
          title: input.role === 'user' ? titleFromMessage(content) : 'New Chat',
          linkedReviewerId: null,
          createdAt: serverTimestamp(),
        }
      : {}),
    latestMessage: content.slice(0, 180),
    messageCount: increment(1),
    mode: input.mode ?? 'normal_chat',
    updatedAt: serverTimestamp(),
    ...(input.attachment?.id ? { linkedMaterialId: input.attachment.id } : {}),
    ...(input.attachment?.libraryId ? { linkedSubjectId: input.attachment.libraryId } : {}),
  }) as Record<string, unknown>;

  batch.set(chatRef, chatPayload, { merge: true });

  await batch.commit();

  return {
    chatId,
    messageId: messageRef.id,
  };
}

export async function updateAiChatLinks(
  chatId: string,
  links: {
    linkedMaterialId?: string | null;
    linkedReviewerId?: string | null;
    linkedSubjectId?: string | null;
    mode?: AiChatMode;
  }
) {
  const userId = getAiChatUserId();
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if ('linkedMaterialId' in links) payload.linkedMaterialId = links.linkedMaterialId ?? null;
  if ('linkedReviewerId' in links) payload.linkedReviewerId = links.linkedReviewerId ?? null;
  if ('linkedSubjectId' in links) payload.linkedSubjectId = links.linkedSubjectId ?? null;
  if ('mode' in links) payload.mode = links.mode ?? 'normal_chat';

  await updateDoc(doc(aiChatsCollection(userId), chatId), payload);
}

export async function deleteAiChat(chatId: string) {
  const userId = getAiChatUserId();
  const messages = await getDocs(aiMessagesCollection(userId, chatId));
  const batch = writeBatch(firebaseDb!);

  messages.docs.forEach((message) => batch.delete(message.ref));
  batch.delete(doc(aiChatsCollection(userId), chatId));

  await batch.commit();
}

export async function createEmptyAiChat() {
  const userId = getAiChatUserId();
  const chatRef = await addDoc(aiChatsCollection(userId), {
    userId,
    title: 'New Chat',
    latestMessage: '',
    messageCount: 0,
    mode: 'normal_chat',
    linkedMaterialId: null,
    linkedReviewerId: null,
    linkedSubjectId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chatRef.id;
}

export async function renameAiChat(chatId: string, title: string) {
  const userId = getAiChatUserId();
  await setDoc(
    doc(aiChatsCollection(userId), chatId),
    {
      title: title.trim() || 'Untitled Chat',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

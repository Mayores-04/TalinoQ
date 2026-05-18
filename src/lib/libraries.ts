import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { firebaseAuth, firebaseDb } from '@/lib/firebase';

export type LibraryColor = '#004f4c' | '#007a80' | '#020a68' | '#7c3aed' | '#ee845e';

export type LibraryRecord = {
  id: string;
  userId: string;
  name: string;
  normalizedName: string;
  description: string;
  color: LibraryColor;
  icon: string;
  reviewerCount: number;
  materialCount: number;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateLibraryInput = {
  name: string;
  description?: string;
  color?: LibraryColor;
  icon?: string;
};

const libraryColors: LibraryColor[] = ['#004f4c', '#007a80', '#020a68', '#7c3aed', '#ee845e'];

function librariesCollection(userId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return collection(firebaseDb, 'users', userId, 'libraries');
}

function reviewersCollection(userId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return collection(firebaseDb, 'users', userId, 'reviewers');
}

function getLibraryUserId() {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  if (!userId) {
    throw new Error('Sign in again before managing libraries.');
  }

  return userId;
}

function sanitizeText(value: string | undefined, fallback: string, maxLength = 120) {
  const cleaned = value?.replace(/\s+/g, ' ').trim() ?? '';
  return (cleaned || fallback).slice(0, maxLength);
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number) {
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

function normalizeColor(value: unknown, fallback: LibraryColor = '#004f4c'): LibraryColor {
  return libraryColors.includes(value as LibraryColor) ? (value as LibraryColor) : fallback;
}

function validateLibraryInput(input: CreateLibraryInput) {
  const name = sanitizeText(input.name, '', 100);

  if (!name) {
    throw new Error('Library name is required.');
  }

  return {
    name,
    normalizedName: normalizeName(name),
    description: sanitizeText(input.description, '', 180),
    color: normalizeColor(input.color),
    icon: sanitizeText(input.icon, 'folder', 40),
  };
}

function mapLibraryDocument(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): LibraryRecord {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    userId: readString(data.userId, ''),
    name: readString(data.name, 'Untitled Library'),
    normalizedName: readString(data.normalizedName, normalizeName(readString(data.name, ''))),
    description: readString(data.description, ''),
    color: normalizeColor(data.color),
    icon: readString(data.icon, 'folder'),
    reviewerCount: readNumber(data.reviewerCount, 0),
    materialCount: readNumber(data.materialCount, 0),
    sortOrder: readNumber(data.sortOrder, 0),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
  };
}

function sortLibraries(libraries: LibraryRecord[]) {
  return [...libraries].sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    return first.name.localeCompare(second.name);
  });
}

export function subscribeToLibraries(
  onLibraries: (libraries: LibraryRecord[]) => void,
  onError?: (message: string) => void
) {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!firebaseDb || !userId) {
    onLibraries([]);
    return () => {};
  }

  return onSnapshot(
    librariesCollection(userId),
    (snapshot) => {
      onLibraries(sortLibraries(snapshot.docs.map(mapLibraryDocument)));
    },
    (error) => onError?.(error.message || 'Unable to load libraries.')
  );
}

export async function fetchLibraries() {
  const userId = getLibraryUserId();
  const snapshot = await getDocs(librariesCollection(userId));

  return sortLibraries(snapshot.docs.map(mapLibraryDocument));
}

export async function createLibrary(input: CreateLibraryInput) {
  const userId = getLibraryUserId();
  const draft = validateLibraryInput(input);
  const duplicateQuery = query(
    librariesCollection(userId),
    where('normalizedName', '==', draft.normalizedName),
    limit(1)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    throw new Error('A library with this name already exists.');
  }

  const docRef = await addDoc(librariesCollection(userId), {
    userId,
    ...draft,
    reviewerCount: 0,
    materialCount: 0,
    sortOrder: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const created = await getDoc(docRef);

  if (!created.exists()) {
    throw new Error('Library was saved, but could not be loaded.');
  }

  return mapLibraryDocument(created);
}

export async function updateLibrary(libraryId: string, input: CreateLibraryInput) {
  const userId = getLibraryUserId();
  const draft = validateLibraryInput(input);
  const duplicateQuery = query(
    librariesCollection(userId),
    where('normalizedName', '==', draft.normalizedName),
    limit(2)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);
  const hasDuplicate = duplicateSnapshot.docs.some((snapshot) => snapshot.id !== libraryId);

  if (hasDuplicate) {
    throw new Error('A library with this name already exists.');
  }

  await updateDoc(doc(librariesCollection(userId), libraryId), {
    ...draft,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLibrary(libraryId: string) {
  const userId = getLibraryUserId();
  const reviewersSnapshot = await getDocs(
    query(reviewersCollection(userId), where('libraryId', '==', libraryId), limit(1))
  );

  if (!reviewersSnapshot.empty) {
    throw new Error('Move or delete reviewers in this library before deleting it.');
  }

  await deleteDoc(doc(librariesCollection(userId), libraryId));
}

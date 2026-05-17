import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { firebaseAuth, firebaseDb } from '@/lib/firebase';

export type ReviewerDifficulty = 'Easy' | 'Medium' | 'Hard';
export type ReviewerStatus = 'Ready' | 'Exported';
export type ReviewerExportFormat = 'PDF' | 'DOCX';

export type ReviewerQuestionConfig = {
  id: string;
  title: string;
  subtitle: string;
  count: number;
};

export type ReviewerQuestionOption = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type ReviewerQuestion = {
  id: string;
  type: string;
  concept: string;
  prompt: string;
  options: ReviewerQuestionOption[];
  explanation: string;
};

export type ReviewerExportSettings = {
  format: ReviewerExportFormat;
  includeAnswers: boolean;
  includeExplanations: boolean;
  includeHeader: boolean;
  theme: string;
};

export type CreateReviewerInput = {
  title: string;
  subject: string;
  category: string;
  difficulty: ReviewerDifficulty;
  questionCounts: ReviewerQuestionConfig[];
  sourceMaterialIds?: string[];
  exportSettings: ReviewerExportSettings;
  status?: ReviewerStatus;
};

export type ReviewerRecord = {
  id: string;
  ownerId: string;
  title: string;
  normalizedTitle: string;
  subject: string;
  category: string;
  difficulty: ReviewerDifficulty;
  status: ReviewerStatus;
  estimatedItems: number;
  masteryScore: number;
  questionCounts: ReviewerQuestionConfig[];
  sourceMaterialIds: string[];
  tags: string[];
  generatedQuestions: ReviewerQuestion[];
  exportSettings: ReviewerExportSettings;
  createdAt?: string;
  updatedAt?: string;
};

const difficultyScores: Record<ReviewerDifficulty, number> = {
  Easy: 88,
  Medium: 82,
  Hard: 76,
};

const validDifficulties: ReviewerDifficulty[] = ['Easy', 'Medium', 'Hard'];
const validFormats: ReviewerExportFormat[] = ['PDF', 'DOCX'];

function reviewersCollection(userId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return collection(firebaseDb, 'users', userId, 'reviewers');
}

function getReviewerUserId() {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  if (!userId) {
    throw new Error('Sign in again before creating a reviewer.');
  }

  return userId;
}

function sanitizeText(value: string, fallback: string, maxLength = 120) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, maxLength);
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function readTimestamp(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'toDate' in value) {
    const timestamp = value as { toDate: () => Date };
    return timestamp.toDate().toISOString();
  }

  return undefined;
}

function normalizeQuestionCounts(value: ReviewerQuestionConfig[]) {
  return value
    .map((item) => ({
      id: sanitizeText(item.id, 'custom', 48),
      title: sanitizeText(item.title, 'Question Type', 80),
      subtitle: sanitizeText(item.subtitle, 'Generated item', 120),
      count: Math.max(0, Math.floor(Number(item.count) || 0)),
    }))
    .filter((item) => item.count > 0);
}

function buildTags(subject: string, category: string) {
  return [subject, category]
    .flatMap((value) => value.split(/[\s/-]+/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}

function buildGeneratedQuestions(input: {
  subject: string;
  difficulty: ReviewerDifficulty;
}): ReviewerQuestion[] {
  const subject = input.subject || 'your subject';
  const concept = input.difficulty === 'Hard' ? 'Applied mastery' : 'Core concept';

  return [
    {
      id: 'question-1',
      type: 'multiple-choice',
      concept,
      prompt: `Which statement best describes a key concept in ${subject}?`,
      options: [
        { id: 'a', label: 'A loosely related idea', isCorrect: false },
        { id: 'b', label: `A central principle of ${subject}`, isCorrect: true },
        { id: 'c', label: 'An unrelated exception', isCorrect: false },
      ],
      explanation: `Review the foundational definitions and examples in ${subject}, then connect them to practice questions.`,
    },
  ];
}

function normalizeExportSettings(settings: ReviewerExportSettings): ReviewerExportSettings {
  return {
    format: validFormats.includes(settings.format) ? settings.format : 'PDF',
    includeAnswers: Boolean(settings.includeAnswers),
    includeExplanations: Boolean(settings.includeExplanations),
    includeHeader: Boolean(settings.includeHeader),
    theme: sanitizeText(settings.theme, 'Modern Academic', 80),
  };
}

export function validateReviewerDraft(input: CreateReviewerInput) {
  const title = sanitizeText(input.title, '', 140);
  const subject = sanitizeText(input.subject, '', 100);
  const category = sanitizeText(input.category, '', 80);
  const questionCounts = normalizeQuestionCounts(input.questionCounts);
  const estimatedItems = questionCounts.reduce((total, item) => total + item.count, 0);

  if (title.length < 3) {
    throw new Error('Reviewer title must be at least 3 characters.');
  }

  if (subject.length < 2) {
    throw new Error('Subject is required.');
  }

  if (!category) {
    throw new Error('Choose a folder or category.');
  }

  if (!validDifficulties.includes(input.difficulty)) {
    throw new Error('Choose a valid difficulty level.');
  }

  if (estimatedItems < 1) {
    throw new Error('Add at least one question, flashcard, or identification item.');
  }

  return {
    title,
    normalizedTitle: normalizeTitle(title),
    subject,
    category,
    difficulty: input.difficulty,
    questionCounts,
    estimatedItems,
    sourceMaterialIds: Array.from(new Set(input.sourceMaterialIds ?? [])),
    exportSettings: normalizeExportSettings(input.exportSettings),
    status: input.status ?? 'Ready',
  };
}

function mapReviewerDocument(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): ReviewerRecord {
  const data = snapshot.data() ?? {};
  const rawDifficulty = data.difficulty as ReviewerDifficulty;
  const difficulty: ReviewerDifficulty = validDifficulties.includes(rawDifficulty)
    ? rawDifficulty
    : 'Medium';
  const status: ReviewerStatus = data.status === 'Exported' ? 'Exported' : 'Ready';
  const exportSettings = normalizeExportSettings({
    format: validFormats.includes(data.exportSettings?.format) ? data.exportSettings.format : 'PDF',
    includeAnswers: readBoolean(data.exportSettings?.includeAnswers, true),
    includeExplanations: readBoolean(data.exportSettings?.includeExplanations, true),
    includeHeader: readBoolean(data.exportSettings?.includeHeader, true),
    theme: readString(data.exportSettings?.theme, 'Modern Academic'),
  });

  return {
    id: snapshot.id,
    ownerId: readString(data.ownerId, ''),
    title: readString(data.title, 'Untitled Reviewer'),
    normalizedTitle: readString(data.normalizedTitle, normalizeTitle(readString(data.title, ''))),
    subject: readString(data.subject, 'General Study'),
    category: readString(data.category, 'Lecture Review'),
    difficulty,
    status,
    estimatedItems: readNumber(data.estimatedItems, 0),
    masteryScore: readNumber(data.masteryScore, difficultyScores[difficulty]),
    questionCounts: Array.isArray(data.questionCounts)
      ? normalizeQuestionCounts(data.questionCounts as ReviewerQuestionConfig[])
      : [],
    sourceMaterialIds: readStringArray(data.sourceMaterialIds),
    tags: readStringArray(data.tags),
    generatedQuestions: Array.isArray(data.generatedQuestions)
      ? (data.generatedQuestions as ReviewerQuestion[])
      : [],
    exportSettings,
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
  };
}

export function subscribeToReviewers(
  onReviewers: (reviewers: ReviewerRecord[]) => void,
  onError?: (message: string) => void
) {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!firebaseDb || !userId) {
    onReviewers([]);
    return () => {};
  }

  const reviewersQuery = query(reviewersCollection(userId), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    reviewersQuery,
    (snapshot) => {
      onReviewers(snapshot.docs.map(mapReviewerDocument));
    },
    (error) => {
      onError?.(error.message || 'Unable to load reviewers.');
    }
  );
}

export async function fetchReviewers() {
  const userId = getReviewerUserId();
  const reviewersQuery = query(reviewersCollection(userId), orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(reviewersQuery);
  return snapshot.docs.map(mapReviewerDocument);
}

export async function createReviewer(input: CreateReviewerInput) {
  const userId = getReviewerUserId();
  const draft = validateReviewerDraft(input);
  const duplicateQuery = query(
    reviewersCollection(userId),
    where('normalizedTitle', '==', draft.normalizedTitle),
    limit(1)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    throw new Error('A reviewer with this title already exists.');
  }

  const docRef = await addDoc(reviewersCollection(userId), {
    ownerId: userId,
    title: draft.title,
    normalizedTitle: draft.normalizedTitle,
    subject: draft.subject,
    category: draft.category,
    difficulty: draft.difficulty,
    status: draft.status,
    estimatedItems: draft.estimatedItems,
    masteryScore: difficultyScores[draft.difficulty],
    questionCounts: draft.questionCounts,
    sourceMaterialIds: draft.sourceMaterialIds,
    tags: buildTags(draft.subject, draft.category),
    generatedQuestions: buildGeneratedQuestions(draft),
    exportSettings: draft.exportSettings,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const created = await getDoc(docRef);
  if (!created.exists()) {
    throw new Error('Reviewer was saved, but could not be loaded.');
  }

  return mapReviewerDocument(created);
}

export async function updateReviewerStatus(reviewerId: string, status: ReviewerStatus) {
  const userId = getReviewerUserId();

  await updateDoc(doc(reviewersCollection(userId), reviewerId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

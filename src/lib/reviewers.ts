import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
  type WriteBatch,
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
  libraryId?: string | null;
  libraryName?: string | null;
  sourceMaterialIds?: string[];
  generatedQuestions?: ReviewerQuestion[];
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
  libraryId?: string | null;
  libraryName?: string | null;
  difficulty: ReviewerDifficulty;
  status: ReviewerStatus;
  estimatedItems: number;
  masteryScore: number;
  questionCounts: ReviewerQuestionConfig[];
  sourceMaterialIds: string[];
  tags: string[];
  generatedQuestions: ReviewerQuestion[];
  exportSettings: ReviewerExportSettings;
  lastQuizScore?: number;
  lastQuizCorrect?: number;
  lastQuizTotal?: number;
  lastStudiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

const difficultyScores: Record<ReviewerDifficulty, number> = {
  Easy: 88,
  Medium: 82,
  Hard: 76,
};

let cachedReviewersUserId: string | null = null;
let cachedReviewers: ReviewerRecord[] | null = null;

const validDifficulties: ReviewerDifficulty[] = ['Easy', 'Medium', 'Hard'];
const validFormats: ReviewerExportFormat[] = ['PDF', 'DOCX'];

function reviewersCollection(userId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return collection(firebaseDb, 'users', userId, 'reviewers');
}

function libraryDocument(userId: string, libraryId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return doc(firebaseDb, 'users', userId, 'libraries', libraryId);
}

function getReviewerDb() {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  return firebaseDb;
}

function getReviewerUserId() {
  const userId = firebaseAuth?.currentUser?.uid;

  getReviewerDb();

  if (!userId) {
    throw new Error('Sign in again before creating a reviewer.');
  }

  return userId;
}

function sanitizeText(value: string, fallback: string, maxLength = 120) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, maxLength);
}

function sanitizeOptionalText(value: string | null | undefined, maxLength = 120) {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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

export function buildFallbackReviewerQuestions(input: {
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

function normalizeGeneratedQuestions(value: unknown, fallback: ReviewerQuestion[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const questions = value
    .map((item, index): ReviewerQuestion | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const rawQuestion = item as Partial<ReviewerQuestion>;
      const options = Array.isArray(rawQuestion.options)
        ? rawQuestion.options
            .map((option, optionIndex): ReviewerQuestionOption | null => {
              if (!option || typeof option !== 'object') {
                return null;
              }

              const rawOption = option as Partial<ReviewerQuestionOption>;

              return {
                id: sanitizeText(rawOption.id ?? String.fromCharCode(97 + optionIndex), 'a', 12),
                label: sanitizeText(rawOption.label ?? '', `Option ${optionIndex + 1}`, 220),
                isCorrect: Boolean(rawOption.isCorrect),
              };
            })
            .filter((option): option is ReviewerQuestionOption => Boolean(option))
        : [];

      return {
        id: sanitizeText(rawQuestion.id ?? `question-${index + 1}`, `question-${index + 1}`, 48),
        type: sanitizeText(rawQuestion.type ?? 'multiple-choice', 'multiple-choice', 48),
        concept: sanitizeText(rawQuestion.concept ?? 'Core concept', 'Core concept', 120),
        prompt: sanitizeText(rawQuestion.prompt ?? '', 'Review this topic carefully.', 500),
        options,
        explanation: sanitizeText(
          rawQuestion.explanation ?? '',
          'Review the source material and connect the concept to examples.',
          600
        ),
      };
    })
    .filter((question): question is ReviewerQuestion => Boolean(question))
    .slice(0, 20);

  return questions.length > 0 ? questions : fallback;
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

function updateLibraryCountsForReviewerMove({
  batch,
  newLibraryId,
  newMaterialCount,
  oldLibraryId,
  oldMaterialCount,
  userId,
}: {
  batch: WriteBatch;
  newLibraryId: string | null;
  newMaterialCount: number;
  oldLibraryId: string | null;
  oldMaterialCount: number;
  userId: string;
}) {
  if (oldLibraryId === newLibraryId) {
    if (newLibraryId && newMaterialCount !== oldMaterialCount) {
      batch.update(libraryDocument(userId, newLibraryId), {
        materialCount: increment(newMaterialCount - oldMaterialCount),
        updatedAt: serverTimestamp(),
      });
    }

    return;
  }

  if (oldLibraryId) {
    batch.update(libraryDocument(userId, oldLibraryId), {
      reviewerCount: increment(-1),
      materialCount: increment(-oldMaterialCount),
      updatedAt: serverTimestamp(),
    });
  }

  if (newLibraryId) {
    batch.update(libraryDocument(userId, newLibraryId), {
      reviewerCount: increment(1),
      materialCount: increment(newMaterialCount),
      updatedAt: serverTimestamp(),
    });
  }
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
    libraryId: sanitizeOptionalText(input.libraryId, 120),
    libraryName: sanitizeOptionalText(input.libraryName, 120),
    difficulty: input.difficulty,
    questionCounts,
    estimatedItems,
    sourceMaterialIds: Array.from(new Set(input.sourceMaterialIds ?? [])),
    generatedQuestions: input.generatedQuestions,
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
    libraryId: readOptionalString(data.libraryId),
    libraryName: readOptionalString(data.libraryName),
    difficulty,
    status,
    estimatedItems: readNumber(data.estimatedItems, 0),
    masteryScore: readNumber(data.masteryScore, difficultyScores[difficulty]),
    questionCounts: Array.isArray(data.questionCounts)
      ? normalizeQuestionCounts(data.questionCounts as ReviewerQuestionConfig[])
      : [],
    sourceMaterialIds: readStringArray(data.sourceMaterialIds),
    tags: readStringArray(data.tags),
    generatedQuestions: normalizeGeneratedQuestions(
      data.generatedQuestions,
      buildFallbackReviewerQuestions({
        subject: readString(data.subject, 'General Study'),
        difficulty,
      })
    ),
    exportSettings,
    lastQuizScore: readOptionalNumber(data.lastQuizScore),
    lastQuizCorrect: readOptionalNumber(data.lastQuizCorrect),
    lastQuizTotal: readOptionalNumber(data.lastQuizTotal),
    lastStudiedAt: readTimestamp(data.lastStudiedAt),
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

  if (cachedReviewersUserId === userId && cachedReviewers) {
    onReviewers(cachedReviewers);
  }

  const reviewersQuery = query(reviewersCollection(userId), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    reviewersQuery,
    (snapshot) => {
      const nextReviewers = snapshot.docs.map(mapReviewerDocument);
      cachedReviewersUserId = userId;
      cachedReviewers = nextReviewers;
      onReviewers(nextReviewers);
    },
    (error) => {
      onError?.(error.message || 'Unable to load reviewers.');
    }
  );
}

export function getCachedReviewers() {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!userId || cachedReviewersUserId !== userId) {
    return null;
  }

  return cachedReviewers;
}

export async function fetchReviewers() {
  const userId = getReviewerUserId();
  const reviewersQuery = query(reviewersCollection(userId), orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(reviewersQuery);
  const reviewers = snapshot.docs.map(mapReviewerDocument);
  cachedReviewersUserId = userId;
  cachedReviewers = reviewers;
  return reviewers;
}

export async function createReviewer(input: CreateReviewerInput) {
  const userId = getReviewerUserId();
  const db = getReviewerDb();
  const draft = validateReviewerDraft(input);
  const generatedQuestions = normalizeGeneratedQuestions(
    draft.generatedQuestions,
    buildFallbackReviewerQuestions(draft)
  );
  const duplicateQuery = query(
    reviewersCollection(userId),
    where('normalizedTitle', '==', draft.normalizedTitle),
    limit(1)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    throw new Error('A reviewer with this title already exists.');
  }

  const reviewerRef = doc(reviewersCollection(userId));
  const batch = writeBatch(db);

  batch.set(reviewerRef, {
    ownerId: userId,
    title: draft.title,
    normalizedTitle: draft.normalizedTitle,
    subject: draft.subject,
    category: draft.category,
    libraryId: draft.libraryId ?? null,
    libraryName: draft.libraryName ?? null,
    difficulty: draft.difficulty,
    status: draft.status,
    estimatedItems: draft.estimatedItems,
    masteryScore: difficultyScores[draft.difficulty],
    questionCounts: draft.questionCounts,
    sourceMaterialIds: draft.sourceMaterialIds,
    tags: buildTags(draft.subject, draft.category),
    generatedQuestions,
    exportSettings: draft.exportSettings,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (draft.libraryId) {
    batch.update(libraryDocument(userId, draft.libraryId), {
      reviewerCount: increment(1),
      materialCount: increment(draft.sourceMaterialIds.length),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  const created = await getDoc(reviewerRef);
  if (!created.exists()) {
    throw new Error('Reviewer was saved, but could not be loaded.');
  }

  return mapReviewerDocument(created);
}

export async function fetchReviewer(reviewerId: string) {
  const userId = getReviewerUserId();
  const snapshot = await getDoc(doc(reviewersCollection(userId), reviewerId));

  if (!snapshot.exists()) {
    throw new Error('Reviewer was not found.');
  }

  return mapReviewerDocument(snapshot);
}

export async function updateReviewer(reviewerId: string, input: CreateReviewerInput) {
  const userId = getReviewerUserId();
  const db = getReviewerDb();
  const draft = validateReviewerDraft(input);
  const generatedQuestions = normalizeGeneratedQuestions(
    draft.generatedQuestions,
    buildFallbackReviewerQuestions(draft)
  );
  const duplicateQuery = query(
    reviewersCollection(userId),
    where('normalizedTitle', '==', draft.normalizedTitle),
    limit(2)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);
  const hasDuplicate = duplicateSnapshot.docs.some((snapshot) => snapshot.id !== reviewerId);

  if (hasDuplicate) {
    throw new Error('A reviewer with this title already exists.');
  }

  const reviewerRef = doc(reviewersCollection(userId), reviewerId);
  const currentSnapshot = await getDoc(reviewerRef);

  if (!currentSnapshot.exists()) {
    throw new Error('Reviewer was not found.');
  }

  const current = mapReviewerDocument(currentSnapshot);
  const batch = writeBatch(db);

  batch.update(reviewerRef, {
    title: draft.title,
    normalizedTitle: draft.normalizedTitle,
    subject: draft.subject,
    category: draft.category,
    libraryId: draft.libraryId ?? null,
    libraryName: draft.libraryName ?? null,
    difficulty: draft.difficulty,
    status: draft.status,
    estimatedItems: draft.estimatedItems,
    masteryScore: difficultyScores[draft.difficulty],
    questionCounts: draft.questionCounts,
    sourceMaterialIds: draft.sourceMaterialIds,
    tags: buildTags(draft.subject, draft.category),
    generatedQuestions,
    exportSettings: draft.exportSettings,
    updatedAt: serverTimestamp(),
  });

  updateLibraryCountsForReviewerMove({
    batch,
    newLibraryId: draft.libraryId,
    newMaterialCount: draft.sourceMaterialIds.length,
    oldLibraryId: current.libraryId ?? null,
    oldMaterialCount: current.sourceMaterialIds.length,
    userId,
  });

  await batch.commit();

  return fetchReviewer(reviewerId);
}

export async function updateReviewerStatus(reviewerId: string, status: ReviewerStatus) {
  const userId = getReviewerUserId();

  await updateDoc(doc(reviewersCollection(userId), reviewerId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateReviewerStudyProgress(
  reviewerId: string,
  progress: {
    correct: number;
    score: number;
    total: number;
  }
) {
  const userId = getReviewerUserId();
  const total = Math.max(0, Math.floor(progress.total));
  const correct = Math.max(0, Math.min(total, Math.floor(progress.correct)));
  const score = Math.max(0, Math.min(100, Math.round(progress.score)));

  await updateDoc(doc(reviewersCollection(userId), reviewerId), {
    lastQuizCorrect: correct,
    lastQuizScore: score,
    lastQuizTotal: total,
    lastStudiedAt: serverTimestamp(),
    masteryScore: score,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteReviewer(reviewerId: string) {
  const userId = getReviewerUserId();
  const db = getReviewerDb();
  const reviewerRef = doc(reviewersCollection(userId), reviewerId);
  const currentSnapshot = await getDoc(reviewerRef);

  if (!currentSnapshot.exists()) {
    return;
  }

  const current = mapReviewerDocument(currentSnapshot);
  const batch = writeBatch(db);

  batch.delete(reviewerRef);

  if (current.libraryId) {
    batch.update(libraryDocument(userId, current.libraryId), {
      reviewerCount: increment(-1),
      materialCount: increment(-current.sourceMaterialIds.length),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

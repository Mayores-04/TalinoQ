import { type ReviewerRecord } from '@/lib/reviewers';

export type SubjectAnalytics = {
  id: string;
  name: string;
  category: string;
  reviewerCount: number;
  itemCount: number;
  sourceCount: number;
  averageMastery: number;
  exportedCount: number;
  latestUpdatedAt?: string;
};

export type WeeklyActivityDay = {
  label: string;
  value: number;
  reviewerCount: number;
};

export type StudyAnalytics = {
  reviewerCount: number;
  exportedCount: number;
  totalItems: number;
  totalQuestions: number;
  totalSources: number;
  examReadiness: number;
  studyStreak: number;
  hoursLogged: number;
  subjects: SubjectAnalytics[];
  weeklyActivity: WeeklyActivityDay[];
  weakSubjects: SubjectAnalytics[];
  latestReviewer?: ReviewerRecord;
};

export type CalculatedFocusArea = {
  id: string;
  name: string;
  subject: string;
  category: string;
  score: number;
  reviewerCount: number;
  basis: string;
};

export type CalculatedStudyContext = {
  analytics: StudyAnalytics;
  reviewerCompletion: number;
  focusAreas: CalculatedFocusArea[];
  recommendedDifficulty: 'Easy' | 'Medium' | 'Hard';
  calculatedAt: string;
};

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function buildStudyAnalytics(reviewers: ReviewerRecord[]): StudyAnalytics {
  const sortedReviewers = [...reviewers].sort(
    (left, right) =>
      getTime(right.updatedAt ?? right.createdAt) - getTime(left.updatedAt ?? left.createdAt)
  );
  const reviewerCount = sortedReviewers.length;
  const exportedCount = sortedReviewers.filter((reviewer) => reviewer.status === 'Exported').length;
  const totalItems = sortedReviewers.reduce(
    (total, reviewer) => total + reviewer.estimatedItems,
    0
  );
  const totalQuestions = sortedReviewers.reduce(
    (total, reviewer) => total + reviewer.generatedQuestions.length,
    0
  );
  const totalSources = sortedReviewers.reduce(
    (total, reviewer) => total + reviewer.sourceMaterialIds.length,
    0
  );
  const subjects = buildSubjectAnalytics(sortedReviewers);
  const examReadiness =
    subjects.length > 0
      ? Math.round(
          subjects.reduce((total, subject) => total + subject.averageMastery, 0) / subjects.length
        )
      : 0;
  const weeklyActivity = buildWeeklyActivity(sortedReviewers);

  return {
    reviewerCount,
    exportedCount,
    totalItems,
    totalQuestions,
    totalSources,
    examReadiness,
    studyStreak: calculateStudyStreak(sortedReviewers),
    hoursLogged: roundToOneDecimal(totalItems * 0.18 + totalQuestions * 0.08 + totalSources * 0.35),
    subjects,
    weeklyActivity,
    weakSubjects: subjects
      .filter((subject) => subject.averageMastery < 80)
      .sort((left, right) => left.averageMastery - right.averageMastery)
      .slice(0, 3),
    latestReviewer: sortedReviewers[0],
  };
}

export function getSubjectSuggestions(reviewers: ReviewerRecord[]) {
  const subjects = Array.from(
    new Set(reviewers.map((reviewer) => reviewer.subject.trim()).filter(Boolean))
  );

  return subjects.length > 0
    ? subjects.slice(0, 8)
    : ['Quantum Mechanics', 'Cellular Biology', 'Organic Chemistry', 'Civil Law'];
}

export function getCategorySuggestions(reviewers: ReviewerRecord[]) {
  const categories = Array.from(
    new Set(reviewers.map((reviewer) => reviewer.category.trim()).filter(Boolean))
  );

  return categories.length > 0
    ? categories.slice(0, 8)
    : ['Midterm Prep', 'Final Exam Prep', 'Board Exam', 'Lecture Review'];
}

export function buildCalculatedStudyContext(reviewers: ReviewerRecord[]): CalculatedStudyContext {
  const analytics = buildStudyAnalytics(reviewers);
  const reviewerCompletion =
    analytics.reviewerCount > 0
      ? Math.round((analytics.exportedCount / analytics.reviewerCount) * 100)
      : 0;
  const focusAreas = buildFocusAreas(reviewers, analytics);

  return {
    analytics,
    reviewerCompletion,
    focusAreas,
    recommendedDifficulty: getRecommendedDifficulty(analytics, focusAreas),
    calculatedAt: new Date().toISOString(),
  };
}

export function formatCalculatedStudyContextForAi(
  context: CalculatedStudyContext,
  userGoal?: string
) {
  const { analytics, focusAreas, reviewerCompletion, recommendedDifficulty } = context;

  if (analytics.reviewerCount === 0) {
    return [
      'Calculated TalinoQ study signals:',
      '- No saved reviewer performance data yet.',
      '- Treat this as a new-user flow. Ask for uploaded notes or a topic before giving a focused plan.',
      userGoal ? `User goal: ${userGoal}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const weakSubjects =
    analytics.weakSubjects.length > 0
      ? analytics.weakSubjects
          .map((subject) => `${subject.name}: ${subject.averageMastery}%`)
          .join(', ')
      : 'None below 80%';
  const focusSummary =
    focusAreas.length > 0
      ? focusAreas
          .slice(0, 4)
          .map((area) => `${area.name} (${area.score}%, ${area.subject})`)
          .join(', ')
      : 'No weak focus area detected';

  return [
    'Calculated TalinoQ study signals:',
    `- Exam readiness: ${analytics.examReadiness}%`,
    `- Reviewer completion: ${reviewerCompletion}%`,
    `- Study streak: ${analytics.studyStreak} day${analytics.studyStreak === 1 ? '' : 's'}`,
    `- Hours logged estimate: ${analytics.hoursLogged}h`,
    `- Weak subjects: ${weakSubjects}`,
    `- Priority focus areas: ${focusSummary}`,
    `- Recommended AI difficulty: ${recommendedDifficulty}`,
    userGoal ? `User goal: ${userGoal}` : null,
    'Use only these calculated signals for performance targeting. Do not re-analyze the full study history.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function shouldAttachStudyContextToAi(value: string) {
  const normalized = value.toLowerCase();

  return [
    'weak',
    'progress',
    'performance',
    'readiness',
    'study plan',
    'reviewer',
    'quiz',
    'flashcard',
    'improve',
    'focus',
    'practice',
    'mastery',
  ].some((keyword) => normalized.includes(keyword));
}

function buildSubjectAnalytics(reviewers: ReviewerRecord[]) {
  const subjects = new Map<string, SubjectAnalytics & { masteryTotal: number }>();

  reviewers.forEach((reviewer) => {
    const name = reviewer.subject.trim() || 'General Study';
    const id = name.toLowerCase();
    const current =
      subjects.get(id) ??
      ({
        id,
        name,
        category: reviewer.category,
        reviewerCount: 0,
        itemCount: 0,
        sourceCount: 0,
        exportedCount: 0,
        averageMastery: 0,
        masteryTotal: 0,
        latestUpdatedAt: reviewer.updatedAt ?? reviewer.createdAt,
      } satisfies SubjectAnalytics & { masteryTotal: number });

    current.reviewerCount += 1;
    current.itemCount += reviewer.estimatedItems;
    current.sourceCount += reviewer.sourceMaterialIds.length;
    current.exportedCount += reviewer.status === 'Exported' ? 1 : 0;
    current.masteryTotal += reviewer.masteryScore;

    const reviewerUpdatedAt = reviewer.updatedAt ?? reviewer.createdAt;
    if (getTime(reviewerUpdatedAt) > getTime(current.latestUpdatedAt)) {
      current.latestUpdatedAt = reviewerUpdatedAt;
      current.category = reviewer.category;
    }

    subjects.set(id, current);
  });

  return Array.from(subjects.values())
    .map(({ masteryTotal, ...subject }) => ({
      ...subject,
      averageMastery: Math.round(masteryTotal / Math.max(1, subject.reviewerCount)),
    }))
    .sort((left, right) => right.averageMastery - left.averageMastery);
}

function buildFocusAreas(reviewers: ReviewerRecord[], analytics: StudyAnalytics) {
  const weakSubjectIds = new Set(analytics.weakSubjects.map((subject) => subject.id));
  const focusAreas = new Map<
    string,
    CalculatedFocusArea & { scoreTotal: number; basisItems: Set<string> }
  >();

  reviewers.forEach((reviewer) => {
    const subjectId = reviewer.subject.trim().toLowerCase();
    const isWeakReviewer = reviewer.masteryScore < 80 || weakSubjectIds.has(subjectId);

    if (!isWeakReviewer) {
      return;
    }

    const concepts = reviewer.generatedQuestions
      .map((question) => question.concept.trim())
      .filter((concept) => concept && concept.toLowerCase() !== 'core concept')
      .slice(0, 4);
    const names = concepts.length > 0 ? concepts : [reviewer.category || reviewer.subject];

    names.forEach((name) => {
      const cleanedName = name.trim() || reviewer.subject || 'General Study';
      const id = `${reviewer.subject}-${cleanedName}`.toLowerCase();
      const current =
        focusAreas.get(id) ??
        ({
          id,
          name: cleanedName,
          subject: reviewer.subject || 'General Study',
          category: reviewer.category || 'Review',
          score: 0,
          reviewerCount: 0,
          basis: '',
          scoreTotal: 0,
          basisItems: new Set<string>(),
        } satisfies CalculatedFocusArea & { scoreTotal: number; basisItems: Set<string> });

      current.reviewerCount += 1;
      current.scoreTotal += reviewer.masteryScore;
      current.basisItems.add(reviewer.title);
      current.score = Math.round(current.scoreTotal / current.reviewerCount);
      current.basis = Array.from(current.basisItems).slice(0, 2).join(', ');
      focusAreas.set(id, current);
    });
  });

  return Array.from(focusAreas.values())
    .map(({ scoreTotal: _scoreTotal, basisItems: _basisItems, ...area }) => area)
    .sort((left, right) => left.score - right.score)
    .slice(0, 5);
}

function getRecommendedDifficulty(
  analytics: StudyAnalytics,
  focusAreas: CalculatedFocusArea[]
): 'Easy' | 'Medium' | 'Hard' {
  if (analytics.reviewerCount === 0) {
    return 'Medium';
  }

  const targetScore =
    focusAreas.length > 0
      ? Math.round(
          focusAreas.reduce((total, area) => total + area.score, 0) / focusAreas.length
        )
      : analytics.examReadiness;

  if (targetScore < 40) {
    return 'Easy';
  }

  if (targetScore < 85) {
    return 'Medium';
  }

  return 'Hard';
}

function buildWeeklyActivity(reviewers: ReviewerRecord[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() - (6 - index));

    const reviewerCount = reviewers.filter((reviewer) =>
      isSameDay(reviewer.updatedAt ?? reviewer.createdAt, date)
    ).length;
    const value = Math.min(100, reviewerCount * 34);

    return {
      label: dayLabels[date.getDay()],
      value,
      reviewerCount,
    };
  });
}

function calculateStudyStreak(reviewers: ReviewerRecord[]) {
  const activeDays = new Set(
    reviewers
      .map((reviewer) => toDateKey(reviewer.updatedAt ?? reviewer.createdAt))
      .filter((value): value is string => Boolean(value))
  );

  if (activeDays.size === 0) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < 365; index += 1) {
    const key = toDateKey(cursor.toISOString());

    if (!key || !activeDays.has(key)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak || 1;
}

function isSameDay(value: string | undefined, date: Date) {
  const key = toDateKey(value);

  if (!key) {
    return false;
  }

  return key === toDateKey(date.toISOString());
}

function toDateKey(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function getTime(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

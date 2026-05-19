import { askTalinoqMentor } from '@/lib/aiMentor';

export type ReviewerQuestionType =
  | 'multiple_choice'
  | 'identification'
  | 'enumeration'
  | 'essay'
  | 'true_false'
  | 'short_answer'
  | 'flashcards'
  | 'mixed';

export type ReviewerGenerationRequest = {
  title: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  questionTypes: ReviewerQuestionType[];
  itemCounts: Record<string, number>;
  includeAnswers: boolean;
  includeExplanations: boolean;
  avoidDuplicates: boolean;
  focusTopics?: string[];
  sourceText: string;
  guidanceSummary?: string;
};

export type AiReviewerQuestion = {
  type: string;
  question: string;
  choices?: string[];
  correctAnswer?: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
};

export type AiReviewerFlashcard = {
  front: string;
  back: string;
  topic?: string;
};

export type AiReviewerPayload = {
  title: string;
  subject: string;
  detectedTopics: string[];
  questions: AiReviewerQuestion[];
  flashcards?: AiReviewerFlashcard[];
};

export async function generateReviewerWithAi(input: ReviewerGenerationRequest) {
  if (!input.sourceText.trim()) {
    throw new Error('Extracted text is empty. Please add or edit your notes before generating.');
  }

  const response = await askTalinoqMentor([
    {
      role: 'user',
      content: buildReviewerPrompt(input),
    },
  ]);

  const parsed = parseAiPayload(response.message);
  const cleaned = normalizeAiPayload(parsed, input);

  return removeDuplicateQuestions(cleaned, input.avoidDuplicates);
}

export async function regenerateQuestion(input: {
  sourceText: string;
  question: AiReviewerQuestion;
  includeExplanations: boolean;
}) {
  if (!input.sourceText.trim()) {
    throw new Error('Source text is required to regenerate a question.');
  }

  const response = await askTalinoqMentor([
    {
      role: 'user',
      content: buildQuestionRegenerationPrompt(input),
    },
  ]);

  const parsed = parseAiPayload(response.message);
  const question = parsed.questions?.[0];

  if (!question) {
    throw new Error('AI did not return a regenerated question.');
  }

  return question;
}

function buildReviewerPrompt(input: ReviewerGenerationRequest) {
  return [
    'You are TalinoQ AI, generating reviewers ONLY from the provided learning material.',
    'Do not invent facts outside of the source text.',
    'Return only valid JSON. No markdown, no extra text.',
    'JSON schema:',
    '{"title":"...","subject":"...","detectedTopics":["..."],"questions":[{"type":"multiple_choice","question":"...","choices":["A","B","C","D"],"correctAnswer":"A","explanation":"...","topic":"...","difficulty":"medium"}],"flashcards":[{"front":"...","back":"...","topic":"..."}]}',
    `Title: ${input.title}`,
    `Subject: ${input.subject}`,
    `Difficulty: ${input.difficulty}`,
    `Question types: ${input.questionTypes.join(', ')}`,
    `Item counts: ${JSON.stringify(input.itemCounts)}`,
    `Include answer key: ${input.includeAnswers ? 'yes' : 'no'}`,
    `Include explanations: ${input.includeExplanations ? 'yes' : 'no'}`,
    `Avoid duplicate questions: ${input.avoidDuplicates ? 'yes' : 'no'}`,
    input.focusTopics?.length ? `Focus topics: ${input.focusTopics.join(', ')}` : 'Focus topics: none',
    input.guidanceSummary ? `Guidance summary: ${input.guidanceSummary}` : 'Guidance summary: none',
    'SOURCE TEXT START',
    input.sourceText.trim().slice(0, 12000),
    'SOURCE TEXT END',
  ].join('\n');
}

function buildQuestionRegenerationPrompt(input: {
  sourceText: string;
  question: AiReviewerQuestion;
  includeExplanations: boolean;
}) {
  return [
    'Regenerate the following question using ONLY the source text.',
    'Return valid JSON with a single question object in `questions`.',
    '{"questions":[{"type":"multiple_choice","question":"...","choices":["A","B","C","D"],"correctAnswer":"A","explanation":"...","topic":"...","difficulty":"medium"}]}',
    `Include explanations: ${input.includeExplanations ? 'yes' : 'no'}`,
    `Original question: ${input.question}`,
    'SOURCE TEXT START',
    input.sourceText.trim().slice(0, 12000),
    'SOURCE TEXT END',
  ].join('\n');
}

function parseAiPayload(message: string): AiReviewerPayload {
  const jsonText = extractJson(message);

  if (!jsonText) {
    throw new Error('AI response was not valid JSON. Please retry.');
  }

  try {
    return JSON.parse(jsonText) as AiReviewerPayload;
  } catch {
    throw new Error('AI response JSON could not be parsed. Please retry.');
  }
}

function extractJson(message: string) {
  const trimmed = message.trim();
  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : '';
}

function normalizeAiPayload(payload: AiReviewerPayload, input: ReviewerGenerationRequest) {
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const flashcards = Array.isArray(payload.flashcards) ? payload.flashcards : [];

  return {
    title: payload.title || input.title,
    subject: payload.subject || input.subject,
    detectedTopics: Array.isArray(payload.detectedTopics) ? payload.detectedTopics : [],
    questions: questions
      .filter((question) => Boolean(question?.question))
      .map((question) => ({
        type: question.type || 'multiple_choice',
        question: question.question.trim(),
        choices: Array.isArray(question.choices) ? question.choices.filter(Boolean) : [],
        correctAnswer: question.correctAnswer ?? '',
        explanation: input.includeExplanations ? question.explanation ?? '' : '',
        topic: question.topic ?? '',
        difficulty: question.difficulty ?? '',
      })),
    flashcards: flashcards
      .filter((card) => Boolean(card?.front))
      .map((card) => ({
        front: card.front.trim(),
        back: card.back?.trim() ?? '',
        topic: card.topic ?? '',
      })),
  };
}

function removeDuplicateQuestions(payload: AiReviewerPayload, avoidDuplicates: boolean) {
  if (!avoidDuplicates) {
    return payload;
  }

  const seen = new Set<string>();
  const questions = payload.questions.filter((question) => {
    const key = question.question.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return { ...payload, questions };
}

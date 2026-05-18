import { askTalinoqMentor } from '@/lib/aiMentor';
import { fetchLearningMaterialsByIds, type MaterialPreview } from '@/lib/learningMaterials';
import {
  buildFallbackReviewerQuestions,
  type CreateReviewerInput,
  type ReviewerQuestion,
} from '@/lib/reviewers';
import {
  formatCalculatedStudyContextForAi,
  type CalculatedStudyContext,
} from '@/lib/studyAnalytics';

type GenerateReviewerQuestionsInput = CreateReviewerInput & {
  estimatedItems: number;
  sourceContent?: string;
  calculatedContext?: CalculatedStudyContext;
};

export async function generateReviewerQuestionsWithAi(input: GenerateReviewerQuestionsInput) {
  const materials =
    input.sourceMaterialIds && input.sourceMaterialIds.length > 0
      ? await fetchLearningMaterialsByIds(input.sourceMaterialIds)
      : [];
  const fallback = buildFallbackReviewerQuestions(input);

  const response = await askTalinoqMentor([
    {
      role: 'user',
      content: buildReviewerGenerationPrompt(input, materials),
    },
  ]);

  return parseReviewerQuestions(response.message, fallback);
}

function buildReviewerGenerationPrompt(
  input: GenerateReviewerQuestionsInput,
  materials: MaterialPreview[]
) {
  const materialSummary =
    materials.length > 0
      ? materials
          .map((material, index) => {
            const source = material.remoteUrl ?? material.url ?? material.subtitle;
            const extracted = material.extractedText?.trim()
              ? `\nExtracted text:\n${material.extractedText.trim().slice(0, 3000)}`
              : '';
            return `${index + 1}. ${material.title} (${material.kind}) - ${source}${extracted}`;
          })
          .join('\n')
      : 'No source files were attached. Generate from the configured subject and difficulty.';
  const extractedMaterialText = materials
    .map((material) => material.extractedText?.trim())
    .filter((text): text is string => Boolean(text))
    .join('\n\n')
    .slice(0, 9000);
  const sourceContent = input.sourceContent?.trim()
    ? `User-provided notes:\n${input.sourceContent.trim().slice(0, 6000)}`
    : extractedMaterialText
      ? `Extracted learning material text:\n${extractedMaterialText}`
    : 'No pasted notes were provided. If no source text is available, generate a basic reviewer from the topic and subject.';
  const calculatedContext = input.calculatedContext
    ? formatCalculatedStudyContextForAi(
        input.calculatedContext,
        `Generate a ${input.difficulty} reviewer for ${input.subject} / ${input.category}.`
      )
    : 'Calculated TalinoQ study signals: not available for this generation.';

  return [
    'Generate reviewer questions for TalinoQ.',
    'Use calculation-first targeting: TalinoQ calculates the weak areas, then AI writes the reviewer.',
    'Do not infer broad study performance from raw history. Use only the calculated study signals below for targeting.',
    'Return only valid JSON. No markdown. No commentary.',
    'JSON shape: {"questions":[{"type":"multiple-choice","concept":"...","prompt":"...","options":[{"label":"...","isCorrect":false},{"label":"...","isCorrect":true}],"explanation":"..."}]}',
    'Use 4 options for multiple-choice questions. Mark exactly one correct option.',
    'Create 6 to 10 high-quality representative questions, even if the requested item count is higher.',
    calculatedContext,
    `Title: ${input.title}`,
    `Subject: ${input.subject}`,
    `Category: ${input.category}`,
    `Difficulty: ${input.difficulty}`,
    `Requested composition: ${input.questionCounts
      .map((item) => `${item.title}: ${item.count}`)
      .join(', ')}`,
    `Estimated total items: ${input.estimatedItems}`,
    `Learning materials:\n${materialSummary}`,
    sourceContent,
  ].join('\n');
}

function parseReviewerQuestions(message: string, fallback: ReviewerQuestion[]) {
  const parsed = parseJsonObject(message);
  const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const questions = rawQuestions
    .map((item, index): ReviewerQuestion | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const options = Array.isArray(raw.options)
        ? raw.options
            .map((option, optionIndex) => {
              if (!option || typeof option !== 'object') {
                return null;
              }

              const rawOption = option as Record<string, unknown>;
              const label = readText(rawOption.label, `Option ${optionIndex + 1}`);

              return {
                id: String.fromCharCode(97 + optionIndex),
                label,
                isCorrect: Boolean(rawOption.isCorrect),
              };
            })
            .filter((option): option is ReviewerQuestion['options'][number] => Boolean(option))
            .slice(0, 5)
        : [];

      return {
        id: `question-${index + 1}`,
        type: readText(raw.type, 'multiple-choice'),
        concept: readText(raw.concept, 'Core concept'),
        prompt: readText(raw.prompt, fallback[0]?.prompt ?? 'Review this concept.'),
        options,
        explanation: readText(raw.explanation, fallback[0]?.explanation ?? 'Review the source.'),
      };
    })
    .filter((question): question is ReviewerQuestion => Boolean(question))
    .filter((question) => question.prompt.length > 0)
    .slice(0, 10);

  return questions.length > 0 ? questions : fallback;
}

function parseJsonObject(message: string) {
  const trimmed = message.trim();
  const jsonText = trimmed.startsWith('{') ? trimmed : (trimmed.match(/\{[\s\S]*\}/)?.[0] ?? '');

  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText) as { questions?: unknown[] };
  } catch {
    return null;
  }
}

function readText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 700) : fallback;
}

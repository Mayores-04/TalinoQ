import { formatFileSize } from '@/lib/materialExtraction';
import type { AiChatMessageRecord } from '@/lib/aiChats';
import type { AiMentorMessage } from '@/lib/aiMentor';
import type { LibraryRecord } from '@/lib/libraries';
import type { MaterialPreview } from '@/lib/learningMaterials';
import type { ReviewerDifficulty, ReviewerQuestionConfig } from '@/lib/reviewers';
import {
  contentSourceOptions,
  difficultyOptions,
  formatOptions,
  materialActionSuggestions,
  promptSuggestions,
} from './constants';
import type {
  ChatMessage,
  ContentSource,
  CreationStep,
  DraftReviewer,
  MentorMode,
  ReviewerFormat,
} from './types';

export function createChatMessage(
  role: AiMentorMessage['role'],
  content: string,
  tone?: ChatMessage['tone'],
  attachment?: MaterialPreview
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    time: formatTime(new Date()),
    tone,
    attachment,
  };
}

export function savedMessageToChatMessage(message: AiChatMessageRecord): ChatMessage {
  const attachment = message.attachments?.[0]
    ? materialFromAttachment(message.attachments[0])
    : undefined;

  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content,
    time: message.createdAt ? formatTime(new Date(message.createdAt)) : 'Saved',
    tone: message.type === 'error' ? 'warning' : undefined,
    attachment,
  };
}

export function materialFromAttachment(
  attachment: NonNullable<AiChatMessageRecord['attachments']>[number]
) {
  return {
    id: attachment.materialId ?? `attachment-${attachment.fileName ?? Date.now()}`,
    kind: attachment.fileType === 'image' ? 'image' : 'document',
    title: attachment.fileName ?? 'Learning material',
    subtitle: `${(attachment.fileType ?? 'file').toUpperCase()} - ${formatFileSize(
      attachment.fileSize
    )}`,
    status:
      attachment.status === 'Uploading' ||
      attachment.status === 'Processing' ||
      attachment.status === 'Failed' ||
      attachment.status === 'Ready'
        ? attachment.status
        : 'Saved',
    extractedText: attachment.extractedText,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    fileType: attachment.fileType,
    fileUrl: attachment.fileUrl,
    mimeType: attachment.mimeType,
    remoteUrl: attachment.fileUrl,
    sourceType:
      attachment.fileType === 'image' ||
      attachment.fileType === 'pdf' ||
      attachment.fileType === 'docx'
        ? attachment.fileType
        : 'unknown',
  } satisfies MaterialPreview;
}

export function findLastMaterial(messages: AiChatMessageRecord[]) {
  const attachment = [...messages].reverse().find((message) => message.attachments?.[0])
    ?.attachments?.[0];

  return attachment ? materialFromAttachment(attachment) : null;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatChatDate(value?: string) {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function buildLocalChatTitle(content: string) {
  const cleaned = content
    .replace(/^create\s+(a\s+)?reviewer\s+(about|on|for)?\s*/i, '')
    .replace(/^make\s+(flashcards|a reviewer)\s+(about|on|for)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = cleaned || content.replace(/\s+/g, ' ').trim() || 'New Chat';
  const title = base.length > 42 ? `${base.slice(0, 39).trim()}...` : base;

  if (/reviewer/i.test(content) && !/reviewer/i.test(title)) {
    return `${title} Reviewer`;
  }

  return title;
}

export function getFriendlyAiError(error: unknown) {
  const code = readErrorCode(error);

  if (code.includes('not-found')) {
    return 'AI backend is not deployed yet. Check the TalinoQ AI proxy setup, then try again.';
  }

  if (error instanceof Error) {
    const message = error.message.replace(/^FirebaseError:\s*/i, '').trim();
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('sign in')) {
      return 'Please sign in before using TalinoQ AI.';
    }

    if (
      lowerMessage.includes('ai proxy url is missing') ||
      lowerMessage.includes('groq') ||
      lowerMessage.includes('api key') ||
      lowerMessage.includes('invalid_api_key') ||
      lowerMessage.includes('free groq limit') ||
      lowerMessage.includes('model is unavailable') ||
      lowerMessage.includes('backend is not deployed') ||
      lowerMessage.includes('firebase') ||
      lowerMessage.includes('reviewer')
    ) {
      return message;
    }
  }

  return 'TalinoQ AI is unavailable right now. Please try again in a moment.';
}

function readErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;

    return typeof code === 'string' ? code.toLowerCase() : '';
  }

  return '';
}

export function buildLibraryQuestion(libraries: LibraryRecord[]) {
  if (libraries.length === 0) {
    return 'What subject should this reviewer belong to? You do not have libraries yet, so I will save it as an unfiled reviewer unless you create a library later.';
  }

  return `What subject or library should this reviewer belong to?\n\nAvailable libraries: ${libraries
    .map((library) => library.name)
    .join(', ')}\n\nYou can also type a new subject name.`;
}

export function buildSaveMaterialQuestion(libraries: LibraryRecord[]) {
  if (libraries.length === 0) {
    return 'Which subject/library should I save this to? Type a subject name and I will create it for you.';
  }

  return `Which subject/library should I save this to?\n\nAvailable libraries: ${libraries
    .map((library) => library.name)
    .join(', ')}\n\nYou can also type a new subject name.`;
}

export function buildMaterialContextPrompt(material: MaterialPreview, userText: string) {
  return [
    'You are TalinoQ AI. Answer using the uploaded learning material context below.',
    'If the context is insufficient, say what is missing and ask for clearer notes.',
    `File name: ${material.fileName ?? material.title}`,
    `File type: ${material.sourceType ?? material.mimeType ?? 'unknown'}`,
    `Saved library: ${material.libraryName ?? 'Not saved to a library yet'}`,
    `Extracted text:\n${(material.extractedText ?? '').slice(0, 9000)}`,
    `User request: ${userText}`,
  ].join('\n\n');
}

export function isMaterialQuestion(value: string) {
  const normalized = normalize(value);

  return (
    normalized.includes('this file') ||
    normalized.includes('this material') ||
    normalized.includes('summarize') ||
    normalized.includes('explain') ||
    normalized.includes('quiz') ||
    normalized.includes('flashcard') ||
    normalized.includes('reviewer')
  );
}

export function getStepOptions({
  activeMaterial,
  libraries,
  mode,
  step,
}: {
  activeMaterial: MaterialPreview | null;
  libraries: LibraryRecord[];
  mode: MentorMode;
  step: CreationStep;
}) {
  if (mode === 'normal_chat') {
    if (activeMaterial) {
      return materialActionSuggestions;
    }

    return promptSuggestions;
  }

  if (mode === 'saving_material') {
    return libraries.length > 0
      ? [...libraries.slice(0, 8).map((library) => library.name), 'Create new subject', 'Cancel']
      : ['General Study', 'Create new subject', 'Cancel'];
  }

  if (step === 'select_library') {
    return libraries.length > 0
      ? [...libraries.slice(0, 8).map((library) => library.name), 'No library']
      : ['General Study', 'Math', 'Science', 'History'];
  }

  if (step === 'content_source') {
    return contentSourceOptions;
  }

  if (step === 'format') {
    return formatOptions;
  }

  if (step === 'difficulty') {
    return difficultyOptions;
  }

  if (step === 'confirm') {
    return ['Create', 'Revise title', 'Revise topic', 'Revise library', 'Cancel'];
  }

  return ['Cancel'];
}

export function getStepLabel(step: CreationStep) {
  const labels: Record<CreationStep, string> = {
    select_library: 'Choose library or subject',
    title: 'Reviewer title',
    topic: 'Topic or lesson',
    content_source: 'Content source',
    content: 'Notes or scanned text',
    format: 'Reviewer format',
    difficulty: 'Difficulty level',
    confirm: 'Confirm setup',
    saving: 'Saving to database',
    completed: 'Completed',
  };

  return labels[step];
}

export function getRevisionStep(value: string): CreationStep {
  if (value.includes('library') || value.includes('subject')) {
    return 'select_library';
  }

  if (value.includes('title')) {
    return 'title';
  }

  if (value.includes('topic') || value.includes('lesson')) {
    return 'topic';
  }

  if (value.includes('content') || value.includes('note')) {
    return 'content_source';
  }

  if (value.includes('format')) {
    return 'format';
  }

  if (value.includes('difficulty')) {
    return 'difficulty';
  }

  return 'title';
}

export function getRevisionPrompt(step: CreationStep, libraries: LibraryRecord[]) {
  if (step === 'select_library') {
    return buildLibraryQuestion(libraries);
  }

  if (step === 'title') {
    return 'What should the reviewer title be?';
  }

  if (step === 'topic') {
    return 'What topic or lesson should this reviewer cover?';
  }

  if (step === 'content_source') {
    return 'Do you want to paste notes, upload scanned text, type the content manually, or create from the topic only?';
  }

  if (step === 'format') {
    return 'What reviewer format do you want?';
  }

  if (step === 'difficulty') {
    return 'What difficulty level should I use?';
  }

  return 'What would you like to revise?';
}

export function buildConfirmationMessage(draft: DraftReviewer) {
  return [
    'Here is the reviewer setup. Should I create it now?',
    '',
    `Library/Subject: ${draft.libraryName ?? draft.subject}`,
    `Title: ${draft.title}`,
    `Topic: ${draft.topic}`,
    `Content: ${draft.sourceContent ? 'Notes provided' : 'Topic only'}`,
    `Format: ${formatLabel(draft.format ?? 'mixed')}`,
    `Difficulty: ${draft.difficulty ?? 'Medium'}`,
    '',
    'Type "create" to save it, "cancel" to stop, or "revise title/topic/library/format/difficulty/content".',
  ].join('\n');
}

export function buildQuestionCounts(format: ReviewerFormat): ReviewerQuestionConfig[] {
  if (format === 'summary') {
    return [{ id: 'short-answer', title: 'Short Answer', subtitle: 'Concept checks', count: 12 }];
  }

  if (format === 'flashcards') {
    return [{ id: 'flashcards', title: 'Flashcards', subtitle: 'Active recall deck', count: 20 }];
  }

  if (format === 'quiz') {
    return [
      { id: 'multiple-choice', title: 'Multiple Choice', subtitle: 'Quiz questions', count: 15 },
      { id: 'identification', title: 'Identification', subtitle: 'Exact term matching', count: 5 },
    ];
  }

  return [
    { id: 'multiple-choice', title: 'Multiple Choice', subtitle: 'Standard questions', count: 15 },
    { id: 'identification', title: 'Identification', subtitle: 'Exact term matching', count: 5 },
    { id: 'flashcards', title: 'Flashcards', subtitle: 'Active recall deck', count: 20 },
  ];
}

export function findLibrary(value: string, libraries: LibraryRecord[]) {
  const normalized = normalize(value);
  if (isNoLibraryChoice(value)) {
    return null;
  }

  return libraries.find((library) => normalize(library.name) === normalized) ?? null;
}

export function isNoLibraryChoice(value: string) {
  return ['none', 'no library', 'unfiled', 'skip'].includes(normalize(value));
}

export function parseContentSource(value: string): ContentSource {
  const normalized = normalize(value);

  if (normalized.includes('upload') || normalized.includes('scan')) {
    return 'upload scanned text';
  }

  if (normalized.includes('type') || normalized.includes('manual')) {
    return 'type manually';
  }

  if (normalized.includes('topic') || normalized.includes('skip') || normalized.includes('none')) {
    return 'topic only';
  }

  return 'paste notes';
}

export function parseReviewerFormat(value: string): ReviewerFormat {
  const normalized = normalize(value);

  if (normalized.includes('summary')) {
    return 'summary';
  }

  if (normalized.includes('flash')) {
    return 'flashcards';
  }

  if (normalized.includes('quiz') || normalized.includes('question')) {
    return 'quiz';
  }

  return 'mixed';
}

export function parseDifficulty(value: string): ReviewerDifficulty {
  const normalized = normalize(value);

  if (normalized.includes('easy')) {
    return 'Easy';
  }

  if (normalized.includes('hard')) {
    return 'Hard';
  }

  return 'Medium';
}

export function isCreateReviewerIntent(value: string) {
  const normalized = normalize(value);
  return (
    normalized.includes('create a reviewer') ||
    normalized.includes('make a reviewer') ||
    normalized.includes('generate reviewer')
  );
}

export function isConfirmation(value: string) {
  const normalized = normalize(value);
  return ['yes', 'y', 'create', 'save', 'confirm', 'go', 'do it', 'create it'].includes(normalized);
}

export function cleanText(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

export function stripFileExtension(value: string) {
  return (
    value
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Learning Material'
  );
}

export function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function formatLabel(format: ReviewerFormat) {
  const labels: Record<ReviewerFormat, string> = {
    summary: 'Summary reviewer',
    flashcards: 'Flashcards',
    quiz: 'Quiz questions',
    mixed: 'Mixed reviewer',
  };

  return labels[format];
}

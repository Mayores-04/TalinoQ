import type { ReviewerDifficulty } from '@/lib/reviewers';
import type { DraftReviewer } from './types';

export const AI_LOGO = require('../../../../assets/LightModeAppLogo.png');

export const promptSuggestions = [
  'Create a reviewer',
  'Make flashcards',
  'Quiz me',
  'Summarize my notes',
  'Explain this topic',
  'Improve my reviewer',
];

export const materialActionSuggestions = [
  'Summarize this',
  'Create reviewer',
  'Make flashcards',
  'Quiz me',
  'Save to subject',
  'Explain this',
];

export const contentSourceOptions = [
  'Paste notes',
  'Upload scanned text',
  'Type manually',
  'Topic only',
];

export const formatOptions = ['Summary reviewer', 'Flashcards', 'Quiz questions', 'Mixed reviewer'];

export const difficultyOptions: ReviewerDifficulty[] = ['Easy', 'Medium', 'Hard'];

export const emptyDraft: DraftReviewer = {
  libraryId: null,
  libraryName: null,
  subject: '',
  title: '',
  topic: '',
  contentSource: null,
  sourceContent: '',
  format: null,
  difficulty: null,
};

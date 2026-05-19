import type { AiMentorMessage } from '@/lib/aiMentor';
import type { MaterialPreview } from '@/lib/learningMaterials';
import type { ReviewerDifficulty } from '@/lib/reviewers';

export type AIChatPageProps = {
  onBack?: () => void;
  onOpenHome?: () => void;
  onOpenReviewers?: () => void;
  onOpenCreate?: () => void;
  onOpenProgress?: () => void;
};

export type ChatMessage = AiMentorMessage & {
  id: string;
  time: string;
  tone?: 'success' | 'warning';
  attachment?: MaterialPreview;
};

export type MentorMode = 'normal_chat' | 'creating_reviewer' | 'saving_material';
export type CreationStep =
  | 'select_library'
  | 'title'
  | 'topic'
  | 'content_source'
  | 'content'
  | 'format'
  | 'difficulty'
  | 'confirm'
  | 'saving'
  | 'completed';
export type ReviewerFormat = 'summary' | 'flashcards' | 'quiz' | 'mixed';
export type ContentSource = 'paste notes' | 'upload scanned text' | 'type manually' | 'topic only';

export type DraftReviewer = {
  libraryId: string | null;
  libraryName: string | null;
  subject: string;
  title: string;
  topic: string;
  contentSource: ContentSource | null;
  sourceContent: string;
  format: ReviewerFormat | null;
  difficulty: ReviewerDifficulty | null;
};

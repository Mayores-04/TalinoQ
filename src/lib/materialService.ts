import { extractTextFromFile } from '@/lib/ocrService';
import { extractPdfTextFromRemote } from '@/lib/pdfExtraction';
import {
  saveLearningMaterialFileRecord,
  updateLearningMaterial,
  type FileMaterialKind,
  type MaterialPreview,
  type MaterialSourceType,
} from '@/lib/learningMaterials';
import { isOnline } from '@/lib/networkService';
import { queueSync } from '@/lib/syncQueueService';
import { saveLocalExamResult, saveLocalMaterial } from '@/lib/localStorageService';

export type MaterialFileInput = {
  uri: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  kind: FileMaterialKind;
  title: string;
  sourceType?: MaterialSourceType;
  isExamResult?: boolean;
};

export type MaterialProcessingResult = {
  material: MaterialPreview;
  extractedText: string;
  warning?: string;
  examResult?: ParsedExamResult;
};

export type ParsedExamResult = {
  score?: number;
  total?: number;
  sections?: Record<string, { score: number; total?: number }>;
};

export async function createMaterialFromFile(
  input: MaterialFileInput
): Promise<MaterialProcessingResult> {
  const { text, sourceType, warning } = await extractTextFromFile({
    uri: input.uri,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sourceType: input.sourceType,
  });

  const online = await isOnline();
  const now = new Date().toISOString();
  let material: MaterialPreview;

  if (online) {
    try {
      const saved = await saveLearningMaterialFileRecord({
        kind: input.kind,
        title: input.title,
        fileName: input.fileName,
        localUri: input.uri,
        contentType: input.mimeType,
        fileSize: input.fileSize,
        extractedText: text,
      });
      const remoteExtraction =
        sourceType === 'pdf' && !text.trim()
          ? await extractPdfTextFromRemote(saved.remoteUrl)
          : null;
      const extractedText = remoteExtraction?.text || text;

      material = {
        id: saved.id,
        kind: input.kind,
        title: input.title,
        subtitle: `${(sourceType ?? 'file').toUpperCase()}`,
        status: text.trim() ? 'Ready' : 'Saved',
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileUrl: saved.remoteUrl,
        remoteUrl: saved.remoteUrl,
        previewUri: saved.remoteUrl,
        sourceType,
        extractedText,
        uri: input.uri,
      };

      if (remoteExtraction || extractedText.trim()) {
        await updateLearningMaterial(saved.id, {
          extractedText,
          status: extractedText.trim() ? 'Ready' : 'Saved',
        });
      }

      if (input.isExamResult && extractedText.trim()) {
        const exam = parseExamResultText(extractedText);
        await saveLocalExamResult({
          id: `exam-${saved.id}`,
          title: input.title,
          subject: input.title,
          rawText: extractedText,
          score: exam.score,
          total: exam.total,
          sections: JSON.stringify(exam.sections ?? {}),
          createdAt: now,
        });
      }

      return {
        material,
        extractedText,
        warning: remoteExtraction?.warning ?? warning,
        examResult: input.isExamResult ? parseExamResultText(extractedText) : undefined,
      };
    } catch {
      // Fall through to offline handling
    }
  }

  const localId = `local-material-${Date.now()}`;
  material = {
    id: localId,
    kind: input.kind,
    title: input.title,
    subtitle: `${(sourceType ?? 'file').toUpperCase()}`,
    status: text.trim() ? 'Ready' : 'Saved',
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    sourceType,
    extractedText: text,
    uri: input.uri,
  };

  await saveLocalMaterial({
    id: localId,
    title: input.title,
    kind: input.kind,
    sourceType: sourceType ?? 'unknown',
    fileName: input.fileName,
    mimeType: input.mimeType,
    localUri: input.uri,
    extractedText: text,
    status: material.status,
    createdAt: now,
    updatedAt: now,
  });

  await queueSync({
    entityType: 'material',
    entityId: localId,
    action: 'create',
    data: {
      ...material,
      extractedText: text,
    },
  });

  if (input.isExamResult && text.trim()) {
    const exam = parseExamResultText(text);
    await saveLocalExamResult({
      id: `exam-${localId}`,
      title: input.title,
      subject: input.title,
      rawText: text,
      score: exam.score,
      total: exam.total,
      sections: JSON.stringify(exam.sections ?? {}),
      createdAt: now,
    });
  }

  return {
    material,
    extractedText: text,
    warning,
    examResult: input.isExamResult ? parseExamResultText(text) : undefined,
  };
}

export function parseExamResultText(text: string): ParsedExamResult {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const scoreMatch = normalized.match(
    /(score|total)\s*[:\-]?\s*(\d{1,3})\s*(?:\/|out of)?\s*(\d{1,3})?/i
  );
  const score = scoreMatch ? Number(scoreMatch[2]) : undefined;
  const total = scoreMatch && scoreMatch[3] ? Number(scoreMatch[3]) : undefined;
  const sections: Record<string, { score: number; total?: number }> = {};

  const sectionRegex = /([A-Za-z][A-Za-z\s]{2,40})\s*[:\-]\s*(\d{1,3})(?:\s*\/\s*(\d{1,3}))?/g;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRegex.exec(normalized))) {
    const label = sectionMatch[1].trim();
    const sectionScore = Number(sectionMatch[2]);
    const sectionTotal = sectionMatch[3] ? Number(sectionMatch[3]) : undefined;

    if (label && Number.isFinite(sectionScore)) {
      sections[label] = {
        score: sectionScore,
        total: sectionTotal,
      };
    }
  }

  return {
    score: Number.isFinite(score ?? NaN) ? score : undefined,
    total: Number.isFinite(total ?? NaN) ? total : undefined,
    sections: Object.keys(sections).length > 0 ? sections : undefined,
  };
}

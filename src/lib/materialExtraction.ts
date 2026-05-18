import * as FileSystem from 'expo-file-system';

import type { FileMaterialKind, MaterialSourceType } from '@/lib/learningMaterials';
import { extractTextFromFile } from '@/lib/ocrService';
import { extractPdfTextFromLocal } from '@/lib/pdfExtraction';

export type PickedMaterialFile = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

export type MaterialExtractionResult = {
  extractedText: string;
  extractionMessage: string;
  sourceType: MaterialSourceType;
};

const maxUploadBytes = 20 * 1024 * 1024;

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
]);

export function validatePickedMaterial(file: PickedMaterialFile) {
  const sourceType = getMaterialSourceType(file.name, file.mimeType);

  if (sourceType === 'unknown') {
    throw new Error(
      'Unsupported file type. Please upload a PDF, DOCX, JPG, JPEG, PNG, or HEIC file.'
    );
  }

  if (file.size && file.size > maxUploadBytes) {
    throw new Error('This file is too large. Please upload a file smaller than 20 MB.');
  }

  return sourceType;
}

export function getFileMaterialKind(sourceType: MaterialSourceType): FileMaterialKind {
  return sourceType === 'image' ? 'image' : 'document';
}

export async function extractPickedMaterialText(
  file: PickedMaterialFile
): Promise<MaterialExtractionResult> {
  const sourceType = validatePickedMaterial(file);

  if (isPlainTextFile(file.name, file.mimeType)) {
    const extractedText = await FileSystem.readAsStringAsync(file.uri);

    return {
      extractedText: extractedText.trim(),
      extractionMessage: extractedText.trim()
        ? 'I extracted readable text from this file.'
        : 'The file uploaded, but I could not find readable text in it.',
      sourceType,
    };
  }

  if (sourceType === 'pdf') {
    const extraction = await extractPdfTextFromLocal({
      uri: file.uri,
      fileName: file.name,
      fileSize: file.size,
    });

    return {
      extractedText: extraction.text,
      extractionMessage:
        extraction.text.trim()
          ? 'I extracted readable text from this PDF.'
          : extraction.warning ||
            'The PDF uploaded, but I could not find readable selectable text in it.',
      sourceType,
    };
  }

  const extraction = await extractTextFromFile({
    uri: file.uri,
    fileName: file.name,
    mimeType: file.mimeType,
    sourceType,
  });
  const extractedText = extraction.text.trim();

  return {
    extractedText,
    extractionMessage:
      extraction.warning ??
      (extractedText
        ? 'I extracted readable text from this material.'
        : 'The file uploaded, but I could not find readable text in it.'),
    sourceType: extraction.sourceType,
  };
}

export function formatFileSize(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes)) {
    return 'Unknown size';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMaterialSourceType(fileName: string, mimeType?: string): MaterialSourceType {
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  const normalizedName = fileName.toLowerCase();

  if (allowedMimeTypes.has(normalizedMime)) {
    if (normalizedMime.includes('pdf')) return 'pdf';
    if (normalizedMime.includes('wordprocessingml')) return 'docx';
    if (normalizedMime.startsWith('image/')) return 'image';
  }

  if (normalizedName.endsWith('.pdf')) return 'pdf';
  if (normalizedName.endsWith('.docx')) return 'docx';
  if (/\.(jpg|jpeg|png|heic|heif)$/i.test(normalizedName)) return 'image';

  return 'unknown';
}

function isPlainTextFile(fileName: string, mimeType?: string) {
  return mimeType?.toLowerCase().startsWith('text/') || /\.txt$/i.test(fileName);
}

import * as FileSystem from 'expo-file-system';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import JSZip from 'jszip';

import type { MaterialSourceType } from '@/lib/learningMaterials';

export type OcrResult = {
  text: string;
  sourceType: MaterialSourceType;
  warning?: string;
};

export async function extractTextFromFile(input: {
  uri: string;
  fileName: string;
  mimeType?: string;
  sourceType?: MaterialSourceType;
}): Promise<OcrResult> {
  const sourceType = input.sourceType ?? detectSourceType(input.fileName, input.mimeType);

  if (sourceType === 'image') {
    return extractTextFromImage(input.uri);
  }

  if (sourceType === 'docx') {
    return extractTextFromDocx(input.uri);
  }

  if (sourceType === 'pdf') {
    return {
      text: '',
      sourceType,
      warning: 'PDF uploaded. TalinoQ will extract readable text after it is saved.',
    };
  }

  return {
    text: '',
    sourceType: 'unknown',
    warning: 'Unsupported file type. Please upload a PDF, DOCX, or image file.',
  };
}

export async function extractTextFromImage(uri: string): Promise<OcrResult> {
  try {
    const result = await TextRecognition.recognize(uri);
    const text = normalizeText(result?.text ?? '');

    return {
      text,
      sourceType: 'image',
      warning: text ? undefined : 'No readable text was found. You can edit it manually.',
    };
  } catch (error) {
    return {
      text: '',
      sourceType: 'image',
      warning:
        error instanceof Error
          ? error.message
          : 'OCR failed on this image. You can paste the text manually.',
    };
  }
}

export async function extractTextFromDocx(uri: string): Promise<OcrResult> {
  try {
    const data = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    const zip = await JSZip.loadAsync(data, { base64: true });
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      return {
        text: '',
        sourceType: 'docx',
        warning: 'Unable to read DOCX contents. Please paste or edit the text manually.',
      };
    }

    const text = normalizeText(stripDocxXml(documentXml));

    return {
      text,
      sourceType: 'docx',
      warning: text ? undefined : 'No readable text was found. You can edit it manually.',
    };
  } catch (error) {
    return {
      text: '',
      sourceType: 'docx',
      warning:
        error instanceof Error
          ? error.message
          : 'DOCX extraction failed. You can paste the text manually.',
    };
  }
}

function detectSourceType(fileName: string, mimeType?: string): MaterialSourceType {
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  const normalizedName = fileName.toLowerCase();

  if (normalizedMime.includes('pdf') || normalizedName.endsWith('.pdf')) {
    return 'pdf';
  }

  if (
    normalizedMime.includes('wordprocessingml') ||
    normalizedName.endsWith('.docx') ||
    normalizedName.endsWith('.doc')
  ) {
    return 'docx';
  }

  if (normalizedMime.startsWith('image/') || /\.(jpg|jpeg|png|heic|heif)$/i.test(normalizedName)) {
    return 'image';
  }

  return 'unknown';
}

function stripDocxXml(xml: string) {
  const textNodes = Array.from(xml.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)).map((match) =>
    decodeXmlEntities(match[1] ?? '')
  );

  return textNodes.join(' ');
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

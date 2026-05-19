import * as FileSystem from 'expo-file-system';
import { firebaseAuth } from '@/lib/firebase';

export type RemotePdfExtractionResult = {
  text: string;
  warning?: string;
};

export async function extractPdfTextFromRemote(
  fileUrl?: string | null
): Promise<RemotePdfExtractionResult> {
  if (!fileUrl) {
    return {
      text: '',
      warning: 'PDF uploaded, but no remote file URL was available for extraction.',
    };
  }

  return requestPdfExtraction({ fileUrl });
}

export async function extractPdfTextFromLocal(input: {
  uri: string;
  fileName?: string;
  fileSize?: number;
}): Promise<RemotePdfExtractionResult> {
  const maxPdfBytes = 15 * 1024 * 1024;

  if (input.fileSize && input.fileSize > maxPdfBytes) {
    return {
      text: '',
      warning: 'PDF uploaded, but it is too large for free text extraction.',
    };
  }

  const base64 = await FileSystem.readAsStringAsync(input.uri, {
    encoding: 'base64',
  });

  return requestPdfExtraction({
    base64,
    fileName: input.fileName,
  });
}

async function requestPdfExtraction(body: {
  fileUrl?: string | null;
  base64?: string;
  fileName?: string;
}): Promise<RemotePdfExtractionResult> {
  const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL?.trim();

  if (!proxyUrl) {
    return {
      text: '',
      warning: 'PDF uploaded, but the AI proxy URL is missing for PDF text extraction.',
    };
  }

  const currentUser = firebaseAuth?.currentUser;

  if (!currentUser) {
    return {
      text: '',
      warning: 'PDF uploaded, but sign in again before extracting its text.',
    };
  }

  const token = await currentUser.getIdToken();
  const endpoint = new URL('/extract-pdf', proxyUrl);
  const response = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await readPdfExtractionPayload(response);

  if (!response.ok) {
    return {
      text: '',
      warning: payload.error || 'PDF uploaded, but text extraction failed.',
    };
  }

  return {
    text: payload.text?.trim() ?? '',
    warning: payload.warning,
  };
}

async function readPdfExtractionPayload(response: Response) {
  try {
    return (await response.json()) as Partial<RemotePdfExtractionResult> & { error?: string };
  } catch {
    return {};
  }
}

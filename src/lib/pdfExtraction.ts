import * as FileSystem from 'expo-file-system';
import { firebaseAuth } from '@/lib/firebase';

export type RemotePdfExtractionResult = {
  diagnostics?: {
    bytes?: number;
    method?: 'base64' | 'fileUrl';
    status?: number;
  };
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

  let base64 = '';

  try {
    base64 = await FileSystem.readAsStringAsync(input.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    return {
      diagnostics: { method: 'base64' },
      text: '',
      warning:
        error instanceof Error
          ? `PDF saved, but TalinoQ could not read the local PDF copy: ${error.message}`
          : 'PDF saved, but TalinoQ could not read the local PDF copy.',
    };
  }

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
      diagnostics: { method: body.base64 ? 'base64' : 'fileUrl' },
      warning: 'PDF saved, but the AI proxy URL is missing for PDF text extraction.',
    };
  }

  const currentUser = firebaseAuth?.currentUser;

  if (!currentUser) {
    return {
      text: '',
      diagnostics: { method: body.base64 ? 'base64' : 'fileUrl' },
      warning: 'PDF saved, but sign in again before extracting its text.',
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
    const message = payload.error || 'PDF uploaded, but text extraction failed.';

    return {
      text: '',
      diagnostics: {
        bytes: payload.bytes,
        method: body.base64 ? 'base64' : 'fileUrl',
        status: response.status,
      },
      warning: message.toLowerCase().includes('download')
        ? 'PDF saved, but TalinoQ could not read selectable text from the uploaded copy yet.'
        : message,
    };
  }

  return {
    diagnostics: {
      bytes: payload.bytes,
      method: body.base64 ? 'base64' : 'fileUrl',
      status: response.status,
    },
    text: payload.text?.trim() ?? '',
    warning: payload.warning,
  };
}

async function readPdfExtractionPayload(response: Response) {
  try {
    return (await response.json()) as Partial<RemotePdfExtractionResult> & {
      bytes?: number;
      error?: string;
    };
  } catch {
    return {};
  }
}

import { getFunctions, httpsCallable } from 'firebase/functions';

import { firebaseApp, firebaseAuth } from '@/lib/firebase';

export type AiMentorMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiMentorResponse = {
  message: string;
  model?: string;
};

export async function askTalinoqMentor(messages: AiMentorMessage[]) {
  const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL?.trim();

  if (proxyUrl) {
    return askTalinoqMentorProxy(proxyUrl, messages);
  }

  if (process.env.EXPO_PUBLIC_USE_FIREBASE_AI !== 'true') {
    throw new Error(
      'AI proxy URL is missing. Deploy the free Cloudflare Worker and add EXPO_PUBLIC_AI_PROXY_URL to .env.'
    );
  }

  if (!firebaseApp) {
    throw new Error('Firebase is not initialized. Check your app Firebase configuration.');
  }

  const functions = getFunctions(firebaseApp, 'asia-southeast1');
  const askMentor = httpsCallable<{ messages: AiMentorMessage[] }, AiMentorResponse>(
    functions,
    'talinoqGroqChat'
  );
  const result = await askMentor({ messages });

  return result.data;
}

async function askTalinoqMentorProxy(proxyUrl: string, messages: AiMentorMessage[]) {
  const currentUser = firebaseAuth?.currentUser;

  if (!currentUser) {
    throw new Error('Please sign in before using the AI mentor.');
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });
  const payload = await readAiProxyPayload(response);

  if (!response.ok) {
    throw new Error(payload.error || 'AI mentor is unavailable right now. Please try again.');
  }

  if (!payload.message) {
    throw new Error('AI mentor returned an empty response. Please try again.');
  }

  return {
    message: payload.message,
    model: payload.model,
  };
}

async function readAiProxyPayload(response: Response) {
  try {
    return (await response.json()) as Partial<AiMentorResponse> & { error?: string };
  } catch {
    return {};
  }
}

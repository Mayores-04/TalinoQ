import Groq from 'groq-sdk';

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

const systemPrompt = [
  'You are TalinoQ, an academic AI mentor inside a mobile reviewer app.',
  'Help students understand lessons, reviewers, and weak topics with clear explanations.',
  'Keep answers concise, warm, and study-focused. Use steps or bullets when they improve clarity.',
  'Do not claim you accessed private files unless the user included their contents in the chat.',
].join(' ');

let cachedJwks;
let cachedJwksAt = 0;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Use POST to chat with TalinoQ AI.' }, 405);
    }

    try {
      await verifyFirebaseToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID);

      if (!env.GROQ_API_KEY) {
        return jsonResponse({ error: 'Groq API key is not configured on the AI proxy.' }, 500);
      }

      const body = await request.json();
      const messages = normalizeMessages(body?.messages);
      const model =
        typeof body?.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;

      const groq = new Groq({ apiKey: env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        reasoning_effort: 'low',
        temperature: 0.35,
        max_completion_tokens: 800,
      });

      const message = completion.choices?.[0]?.message?.content?.trim();

      if (!message) {
        return jsonResponse(
          { error: 'AI mentor returned an empty response. Please try again.' },
          502
        );
      }

      return jsonResponse({
        message,
        model: completion.model ?? model,
      });
    } catch (error) {
      const status = getStatusCode(error);

      return jsonResponse({ error: getPublicErrorMessage(error) }, status);
    }
  },
};

function normalizeMessages(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw createHttpError(400, 'Send at least one message for the AI mentor.');
  }

  return value.slice(-MAX_MESSAGES).map((message) => {
    if (!message || typeof message !== 'object') {
      throw createHttpError(400, 'Each chat message must be an object.');
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      throw createHttpError(400, 'Chat message roles must be user or assistant.');
    }

    return {
      role: message.role,
      content: cleanMessageContent(message.content),
    };
  });
}

function cleanMessageContent(value) {
  if (typeof value !== 'string') {
    throw createHttpError(400, 'Each chat message needs text content.');
  }

  const content = value.trim();

  if (!content) {
    throw createHttpError(400, 'Chat messages cannot be empty.');
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw createHttpError(400, `Chat messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
  }

  return content;
}

async function verifyFirebaseToken(authorizationHeader, projectId) {
  if (!projectId) {
    throw createHttpError(500, 'Firebase project ID is not configured on the AI proxy.');
  }

  const token = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw createHttpError(401, 'Sign in before using the AI mentor.');
  }

  const tokenParts = token.split('.');

  if (tokenParts.length !== 3) {
    throw createHttpError(401, 'Invalid Firebase session.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = tokenParts;
  const header = parseBase64UrlJson(encodedHeader);
  const payload = parseBase64UrlJson(encodedPayload);

  if (!header?.kid) {
    throw createHttpError(401, 'Invalid Firebase session.');
  }

  const jwk = await findFirebaseJwk(header.kid);
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  if (!isValid) {
    throw createHttpError(401, 'Invalid Firebase session.');
  }

  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId || payload.iss !== expectedIssuer || !payload.sub) {
    throw createHttpError(401, 'Invalid Firebase session.');
  }

  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    throw createHttpError(401, 'Firebase session expired. Sign in again.');
  }
}

async function findFirebaseJwk(kid) {
  const jwks = await getFirebaseJwks();
  const jwk = jwks.keys?.find((key) => key.kid === kid);

  if (!jwk) {
    throw createHttpError(401, 'Invalid Firebase session.');
  }

  return jwk;
}

async function getFirebaseJwks() {
  const now = Date.now();

  if (cachedJwks && now - cachedJwksAt < 60 * 60 * 1000) {
    return cachedJwks;
  }

  const response = await fetch(FIREBASE_JWKS_URL);

  if (!response.ok) {
    throw createHttpError(503, 'Could not verify Firebase session right now.');
  }

  cachedJwks = await response.json();
  cachedJwksAt = now;

  return cachedJwks;
}

function parseBase64UrlJson(value) {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
  } catch {
    throw createHttpError(401, 'Invalid Firebase session.');
  }
}

function base64UrlToBytes(value) {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;

  return error;
}

function getStatusCode(error) {
  if (isGroqApiKeyError(error)) {
    return 502;
  }

  const status = error?.status;

  if (typeof status === 'number' && status >= 400 && status < 600) {
    return status;
  }

  return 500;
}

function getPublicErrorMessage(error) {
  if (isGroqApiKeyError(error)) {
    return 'Groq API key is missing or invalid. Update the GROQ_API_KEY Worker secret.';
  }

  const status = error?.status;

  if (status === 401 || status === 403) {
    return error.message || 'Sign in before using the AI mentor.';
  }

  if (status === 404) {
    return 'The selected Groq model is unavailable. Try openai/gpt-oss-20b again later.';
  }

  if (status === 429) {
    return 'The free Groq limit was reached. Please try again after the limit resets.';
  }

  if (typeof error?.message === 'string' && error.message.startsWith('Chat message')) {
    return error.message;
  }

  if (typeof error?.message === 'string' && error.message.startsWith('Send at least')) {
    return error.message;
  }

  if (typeof error?.message === 'string' && error.message.includes('Groq API key')) {
    return error.message;
  }

  return 'AI mentor is unavailable right now. Please try again in a moment.';
}

function isGroqApiKeyError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  return message.includes('invalid_api_key') || message.includes('invalid api key');
}

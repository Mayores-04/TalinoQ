import Groq from 'groq-sdk';

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_EXTRACTED_TEXT = 30000;
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

    const url = new URL(request.url);
    const isPdfExtraction = url.pathname.endsWith('/extract-pdf');

    try {
      await verifyFirebaseToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID);

      if (isPdfExtraction) {
        if (request.method !== 'POST') {
          return jsonResponse({ error: 'Use POST to extract PDF text.' }, 405);
        }

        return await handlePdfExtraction(request);
      }

      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Use POST to chat with TalinoQ AI.' }, 405);
      }

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

async function handlePdfExtraction(request) {
  const body = await request.json();
  const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl.trim() : '';
  const base64 = typeof body?.base64 === 'string' ? body.base64.trim() : '';
  let pdfBytes;

  if (base64) {
    pdfBytes = base64ToBytes(base64);
  } else if (fileUrl) {
    const url = new URL(fileUrl);

    if (url.protocol !== 'https:') {
      throw createHttpError(400, 'Only secure HTTPS PDF URLs are supported.');
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/pdf,*/*',
      },
    });

    if (!response.ok) {
      throw createHttpError(502, 'Could not download the PDF for text extraction.');
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_PDF_BYTES) {
      throw createHttpError(413, 'This PDF is too large to extract on the free worker.');
    }

    pdfBytes = new Uint8Array(await response.arrayBuffer());
  } else {
    throw createHttpError(400, 'PDF file URL or base64 data is required.');
  }

  if (pdfBytes.byteLength > MAX_PDF_BYTES) {
    throw createHttpError(413, 'This PDF is too large to extract on the free worker.');
  }

  if (!latin1FromBytes(pdfBytes.subarray(0, 8)).startsWith('%PDF-')) {
    throw createHttpError(400, 'The downloaded file is not a valid PDF.');
  }

  const text = await extractTextFromPdfBytes(pdfBytes);

  return jsonResponse({
    text,
    warning: text
      ? undefined
      : 'I could not find selectable text in this PDF. It may be scanned or image-based.',
  });
}

async function extractTextFromPdfBytes(bytes) {
  const source = latin1FromBytes(bytes);
  const streamMatches = Array.from(source.matchAll(/<<(.*?)>>\s*stream([\s\S]*?)endstream/g));
  const decodedStreams = [];
  const chunks = [];

  for (const match of streamMatches) {
    const dictionary = match[1] ?? '';
    const streamBody = match[2] ?? '';
    const decoded = await decodePdfStream(dictionary, latin1ToBytes(streamBody));

    if (!decoded) {
      continue;
    }

    decodedStreams.push(latin1FromBytes(decoded));
  }

  const unicodeMap = buildUnicodeMap(decodedStreams);

  for (const decodedText of decodedStreams) {
    const text = extractTextOperators(decodedText, unicodeMap);
    if (text) {
      chunks.push(text);
    }

    if (chunks.join('\n').length >= MAX_EXTRACTED_TEXT) {
      break;
    }
  }

  return cleanExtractedText(chunks.join('\n')).slice(0, MAX_EXTRACTED_TEXT);
}

async function decodePdfStream(dictionary, bytes) {
  if (!/\/Filter\s*(?:\/FlateDecode|\[\s*\/FlateDecode)/.test(dictionary)) {
    return bytes;
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

function extractTextOperators(content, unicodeMap) {
  const chunks = [];

  for (const match of content.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    chunks.push(decodePdfLiteral(match[0].replace(/\s*Tj$/, '')));
  }

  for (const match of content.matchAll(/\[((?:.|\n|\r)*?)\]\s*TJ/g)) {
    const arrayBody = match[1] ?? '';

    for (const literal of arrayBody.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      chunks.push(decodePdfLiteral(literal[0]));
    }

    for (const hex of arrayBody.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
      chunks.push(decodePdfHex(hex[1], unicodeMap));
    }
  }

  for (const match of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
    chunks.push(decodePdfHex(match[1], unicodeMap));
  }

  return chunks.join(' ');
}

function buildUnicodeMap(decodedStreams) {
  const map = new Map();

  decodedStreams.forEach((content) => {
    for (const block of content.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const match of (block[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        map.set(normalizeHexKey(match[1]), unicodeFromHex(match[2]));
      }
    }

    for (const block of content.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const match of (block[1] ?? '').matchAll(
        /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
      )) {
        const start = parseInt(match[1], 16);
        const end = parseInt(match[2], 16);
        const dest = parseInt(match[3], 16);

        for (let code = start; code <= end && code - start < 256; code += 1) {
          map.set(normalizeHexKey(code.toString(16)), String.fromCharCode(dest + code - start));
        }
      }
    }
  });

  return map;
}

function decodePdfLiteral(value) {
  const inner = value.startsWith('(') && value.endsWith(')') ? value.slice(1, -1) : value;

  return inner
    .replace(/\\([nrtbf()\\])/g, (_, escaped) => {
      const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
      return map[escaped] ?? escaped;
    })
    .replace(/\\\r?\n/g, '')
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function decodePdfHex(value = '', unicodeMap = new Map()) {
  const hex = value.replace(/\s+/g, '');
  const mapped = decodeMappedHex(hex, unicodeMap);

  if (mapped) {
    return mapped;
  }

  const bytes = [];

  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2).padEnd(2, '0'), 16));
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let output = '';
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      output += String.fromCharCode((bytes[index] << 8) + bytes[index + 1]);
    }
    return output;
  }

  return latin1FromBytes(new Uint8Array(bytes));
}

function decodeMappedHex(hex, unicodeMap) {
  if (unicodeMap.size === 0 || !hex) {
    return '';
  }

  const widths = [4, 2, 6, 8];
  let output = '';
  let index = 0;

  while (index < hex.length) {
    let matched = false;

    for (const width of widths) {
      const key = normalizeHexKey(hex.slice(index, index + width));
      const value = unicodeMap.get(key);

      if (value) {
        output += value;
        index += width;
        matched = true;
        break;
      }
    }

    if (!matched) {
      return '';
    }
  }

  return output;
}

function normalizeHexKey(value = '') {
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  return normalized.length % 2 === 0 ? normalized : `0${normalized}`;
}

function unicodeFromHex(value = '') {
  const hex = value.replace(/\s+/g, '');
  let output = '';

  for (let index = 0; index + 3 < hex.length; index += 4) {
    output += String.fromCharCode(parseInt(hex.slice(index, index + 4), 16));
  }

  return output;
}

function cleanExtractedText(value) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function latin1FromBytes(bytes) {
  let output = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return output;
}

function latin1ToBytes(value) {
  value = value.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }

  return bytes;
}

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

function base64ToBytes(value) {
  const clean = value.replace(/^data:application\/pdf;base64,/i, '').replace(/\s+/g, '');
  const binary = atob(clean);
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

  if (status === 400 || status === 413 || status === 502) {
    return error.message || 'The request could not be completed.';
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

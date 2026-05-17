const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const Groq = require('groq-sdk');

admin.initializeApp();

const groqApiKey = defineSecret('GROQ_API_KEY');

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

const SYSTEM_PROMPT = [
  'You are TalinoQ, an academic AI mentor inside a mobile reviewer app.',
  'Help students understand lessons, reviewers, and weak topics with clear explanations.',
  'Keep answers concise, warm, and study-focused. Use steps or bullets when they improve clarity.',
  'Do not claim you accessed private files unless the user included their contents in the chat.',
].join(' ');

function cleanMessageContent(value) {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'Each chat message needs text content.');
  }

  const content = value.trim();

  if (!content) {
    throw new HttpsError('invalid-argument', 'Chat messages cannot be empty.');
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `Chat messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`
    );
  }

  return content;
}

function normalizeMessages(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpsError('invalid-argument', 'Send at least one message for the AI mentor.');
  }

  return value.slice(-MAX_MESSAGES).map((message) => {
    if (!message || typeof message !== 'object') {
      throw new HttpsError('invalid-argument', 'Each chat message must be an object.');
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new HttpsError('invalid-argument', 'Chat message roles must be user or assistant.');
    }

    return {
      role: message.role,
      content: cleanMessageContent(message.content),
    };
  });
}

function getGroqErrorMessage(error) {
  const status = error?.status;

  if (status === 401 || status === 403) {
    return 'Groq API key is missing or invalid. Set the GROQ_API_KEY Firebase secret.';
  }

  if (status === 404) {
    return 'The selected Groq model is unavailable. Try openai/gpt-oss-20b again later.';
  }

  if (status === 429) {
    return 'The free Groq limit was reached. Please try again after the limit resets.';
  }

  return 'AI mentor is unavailable right now. Please try again.';
}

exports.talinoqGroqChat = onCall(
  {
    region: 'asia-southeast1',
    secrets: [groqApiKey],
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before using the AI mentor.');
    }

    const userMessages = normalizeMessages(request.data?.messages);
    const apiKey = groqApiKey.value();
    const model =
      typeof request.data?.model === 'string' && request.data.model.trim()
        ? request.data.model.trim()
        : DEFAULT_MODEL;

    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'Groq API key is not configured. Set the GROQ_API_KEY Firebase secret.'
      );
    }

    try {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages],
        reasoning_effort: 'low',
        temperature: 0.35,
        max_completion_tokens: 800,
      });

      const message = completion.choices?.[0]?.message?.content?.trim();

      if (!message) {
        logger.error('Groq chat completion returned no assistant content', {
          model: completion.model ?? model,
        });
        throw new HttpsError('internal', 'AI mentor returned an empty response. Please try again.');
      }

      return {
        message,
        model: completion.model ?? model,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Groq chat completion failed', {
        status: error?.status,
        code: error?.code,
        message: error?.message,
      });
      throw new HttpsError('internal', getGroqErrorMessage(error));
    }
  }
);

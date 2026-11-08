import { getGeminiClient, getGeminiModel } from './gemini';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type ProviderName = 'gemini' | 'groq' | 'openrouter';

export interface ProviderStreamRequest {
  systemPrompt: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface ProviderSelection {
  provider: ProviderName;
  model: string;
}

export interface ProviderStream {
  selection: ProviderSelection;
  chunks: AsyncIterable<string>;
}

const DEFAULT_MODELS: Record<ProviderName, string> = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct',
};

const cooldownUntil = new Map<ProviderName, number>();
const failureCount = new Map<ProviderName, number>();

function configured(provider: ProviderName): boolean {
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY?.trim());
  if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY?.trim());
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function modelFor(provider: ProviderName): string {
  const envKey = `${provider.toUpperCase()}_MODEL`;
  return process.env[envKey]?.trim() || DEFAULT_MODELS[provider];
}

function isAvailable(provider: ProviderName): boolean {
  return configured(provider) && (cooldownUntil.get(provider) || 0) <= Date.now();
}

function markFailure(provider: ProviderName) {
  const failures = (failureCount.get(provider) || 0) + 1;
  failureCount.set(provider, failures);
  if (failures >= 2) {
    cooldownUntil.set(provider, Date.now() + Math.min(60_000, failures * 10_000));
  }
}

function markSuccess(provider: ProviderName) {
  failureCount.delete(provider);
  cooldownUntil.delete(provider);
}

function providerTimeout(): number {
  const parsed = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 7000);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1000), 30_000) : 7000;
}

function withTimeout(signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Provider connection timeout')), providerTimeout());
  signal?.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}

function isRecoverable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|408|5\\d\\d|timeout|timed out|network|fetch failed|overloaded|quota/i.test(message);
}

async function* openAiCompatibleStream(
  provider: Exclude<ProviderName, 'gemini'>,
  request: ProviderStreamRequest
): AsyncIterable<string> {
  const apiKey = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
  const endpoint = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.APP_URL || 'http://localhost:3000';
    headers['X-Title'] = 'Nexus Cyber & Tech Studio';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    signal: withTimeout(request.signal),
    body: JSON.stringify({
      model: modelFor(provider),
      stream: true,
      temperature: 0.2,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages,
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => 'No provider detail');
    throw new Error(`${provider} ${response.status}: ${detail.slice(0, 300)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try {
          const payload = JSON.parse(line.slice(6));
          const delta = payload.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) yield delta;
        } catch {
          // Ignore incomplete SSE frames; the next chunk completes them.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* geminiStream(request: ProviderStreamRequest): AsyncIterable<string> {
  const contents = request.messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
  const stream = await getGeminiClient().models.generateContentStream({
    model: getGeminiModel(),
    contents,
    config: { systemInstruction: request.systemPrompt },
  });
  for await (const chunk of stream) {
    const text = chunk.text || '';
    if (text) yield text;
  }
}

export async function openProviderStream(request: ProviderStreamRequest): Promise<ProviderStream> {
  const order: ProviderName[] = ['gemini', 'groq', 'openrouter'];
  let lastError: unknown = new Error('No AI provider is configured');

  for (const provider of order) {
    if (!isAvailable(provider)) continue;
    try {
      const chunks = provider === 'gemini' ? geminiStream(request) : openAiCompatibleStream(provider, request);
      const iterator = chunks[Symbol.asyncIterator]();
      const first = await iterator.next();
      if (first.done) throw new Error(`${provider} returned an empty response`);
      markSuccess(provider);
      async function* replay(): AsyncIterable<string> {
        yield first.value;
        yield* { [Symbol.asyncIterator]: () => iterator } as AsyncIterable<string>;
      }
      return { selection: { provider, model: modelFor(provider) }, chunks: replay() };
    } catch (error) {
      lastError = error;
      if (!isRecoverable(error)) throw error;
      markFailure(provider);
    }
  }

  throw lastError;
}

export function getProviderStatus() {
  return (['gemini', 'groq', 'openrouter'] as ProviderName[]).map((provider) => ({
    provider,
    configured: configured(provider),
    model: modelFor(provider),
    cooldownUntil: cooldownUntil.get(provider) || null,
  }));
}

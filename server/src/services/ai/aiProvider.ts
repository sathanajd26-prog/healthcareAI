export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AiCompletionResult {
  success: boolean;
  text?: string;
  provider: 'OPENAI_LIVE' | 'GEMINI_LIVE' | 'NONE';
  latencyMs?: number;
  error?: string;
}

export class AiProviderService {
  private static DEFAULT_TIMEOUT_MS = 10000;

  public static getActiveProviderName(): 'OPENAI_CONFIGURED' | 'GEMINI_CONFIGURED' | 'UNCONFIGURED' {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0) {
      return 'OPENAI_CONFIGURED';
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
      return 'GEMINI_CONFIGURED';
    }
    return 'UNCONFIGURED';
  }

  public static isLiveAiConfigured(): boolean {
    return this.getActiveProviderName() !== 'UNCONFIGURED';
  }

  /**
   * Request completion from the active configured provider.
   * If no provider is configured, or if the call fails/times out, returns failure
   * without throwing so the caller can execute safe local fallback.
   */
  public static async generateCompletion(options: AiCompletionOptions): Promise<AiCompletionResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;

    const openAiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (openAiKey) {
      return this.callOpenAi(openAiKey, options, timeoutMs, startTime);
    } else if (geminiKey) {
      return this.callGemini(geminiKey, options, timeoutMs, startTime);
    }

    return {
      success: false,
      provider: 'NONE',
      error: 'NO_LIVE_AI_CREDENTIALS_CONFIGURED',
      latencyMs: Date.now() - startTime,
    };
  }

  private static async callOpenAi(
    apiKey: string,
    options: AiCompletionOptions,
    timeoutMs: number,
    startTime: number
  ): Promise<AiCompletionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: options.messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 700,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        return {
          success: false,
          provider: 'OPENAI_LIVE',
          error: `PROVIDER_HTTP_${status}`,
          latencyMs: Date.now() - startTime,
        };
      }

      const json = (await response.json()) as any;
      const text = json?.choices?.[0]?.message?.content;

      if (!text || typeof text !== 'string') {
        return {
          success: false,
          provider: 'OPENAI_LIVE',
          error: 'MALFORMED_PROVIDER_RESPONSE',
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        text,
        provider: 'OPENAI_LIVE',
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        provider: 'OPENAI_LIVE',
        error: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_ERROR',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private static async callGemini(
    apiKey: string,
    options: AiCompletionOptions,
    timeoutMs: number,
    startTime: number
  ): Promise<AiCompletionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Map OpenAI messages format to Gemini contents
      const contents = options.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const systemInstructionMsg = options.messages.find((m) => m.role === 'system');
      const bodyPayload: any = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens ?? 700,
        },
      };

      if (systemInstructionMsg) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemInstructionMsg.content }],
        };
      }

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          provider: 'GEMINI_LIVE',
          error: `PROVIDER_HTTP_${response.status}`,
          latencyMs: Date.now() - startTime,
        };
      }

      const json = (await response.json()) as any;
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text || typeof text !== 'string') {
        return {
          success: false,
          provider: 'GEMINI_LIVE',
          error: 'MALFORMED_PROVIDER_RESPONSE',
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        text,
        provider: 'GEMINI_LIVE',
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        provider: 'GEMINI_LIVE',
        error: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_ERROR',
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

/**
 * Google Gemini Provider Implementation
 */

import { AIProvider, ChatMessage, ChatCompletionOptions } from '../providers.js';

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  validateApiKey(apiKey: string): boolean {
    // Gemini API keys are typically longer strings without a specific prefix
    return apiKey.length > 20;
  }

  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    const model = options.model || 'gemini-pro';
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2000;

    // Convert messages to Gemini format
    const contents = messages
      .filter(msg => msg.role !== 'system') // Gemini doesn't use system messages the same way
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    // Add system message as the first user message if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      contents.unshift({
        role: 'user',
        parts: [{ text: systemMessage.content }],
      });
    }

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }
}

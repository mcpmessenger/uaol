/**
 * OpenAI Provider Implementation
 */

import { AIProvider, ChatMessage, ChatCompletionOptions } from '../providers.js';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }

  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4';
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2000;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

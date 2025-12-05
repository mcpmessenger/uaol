/**
 * Anthropic Claude Provider Implementation
 */

import { AIProvider, ChatMessage, ChatCompletionOptions } from '../providers.js';

export class ClaudeProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  }

  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    const model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2000;

    // Separate system message from user/assistant messages
    const systemMessage = messages.find(msg => msg.role === 'system');
    const conversationMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        system: systemMessage?.content || '',
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }
}

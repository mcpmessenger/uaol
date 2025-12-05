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
      const errorMessage = error.error?.message || `OpenAI API error: ${response.statusText}`;
      const errorCode = error.error?.code || response.status;
      
      // Log detailed error for debugging (without exposing API key)
      console.error('OpenAI API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorCode,
        errorMessage,
        errorType: error.error?.type,
        apiKeyPrefix: this.apiKey.substring(0, 7) + '...',
        apiKeyLength: this.apiKey.length,
        apiKeyFormatValid: this.apiKey.startsWith('sk-'),
        apiKeyType: this.apiKey.startsWith('sk-proj-') ? 'project' : 
                   this.apiKey.startsWith('sk-') ? 'personal' : 'unknown'
      });
      
      // Provide more helpful error message for invalid keys
      if (errorCode === 'invalid_api_key' || errorMessage.includes('Incorrect API key')) {
        throw new Error(`Invalid OpenAI API key. The key format is correct but OpenAI rejected it. Please verify:
1. The API key is active in your OpenAI dashboard
2. The key hasn't been revoked or expired
3. You have sufficient credits/quota
4. If using a project key, ensure it has the correct permissions

Get a new key at: https://platform.openai.com/api-keys`);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

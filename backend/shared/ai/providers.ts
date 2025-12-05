/**
 * AI Provider Interfaces and Base Classes
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AIProvider {
  validateApiKey(apiKey: string): boolean;
  chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<string>;
}

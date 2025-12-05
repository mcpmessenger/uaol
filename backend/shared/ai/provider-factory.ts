/**
 * AI Provider Factory
 * Creates provider instances for OpenAI, Gemini, and Claude
 */

import { AIProvider } from './providers.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { ClaudeProvider } from './providers/claude.js';

/**
 * Create an AI provider instance
 */
export function createProvider(
  provider: 'openai' | 'gemini' | 'claude',
  apiKey: string
): AIProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    
    case 'gemini':
      return new GeminiProvider(apiKey);
    
    case 'claude':
      return new ClaudeProvider(apiKey);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

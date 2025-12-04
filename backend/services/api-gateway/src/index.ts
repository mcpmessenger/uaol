// CRITICAL: Load .env FIRST, before any other imports that might need it
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load .env from backend root (2 levels up from src/index.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { rateLimiter } from './middleware/rate-limiter';

// Verify .env was loaded
console.log('🔍 Environment check:');
console.log('  .env path:', envPath);
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ SET (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '✗ NOT SET');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');

const logger = createLogger('api-gateway');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Rate limiting
app.use(rateLimiter);

// Chat endpoint - processes messages with AI
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required',
        },
      });
    }

    logger.info('Chat message received', { message: message.substring(0, 100) });
    
    // Get OpenAI API key - check process.env directly (most reliable)
    const openaiApiKey = process.env.OPENAI_API_KEY || '';
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4';
    
    // Log for debugging
    logger.info('OpenAI config check', { 
      hasEnvKey: !!process.env.OPENAI_API_KEY,
      keyLength: openaiApiKey.length,
      keyPreview: openaiApiKey ? openaiApiKey.substring(0, 20) + '...' : 'empty'
    });
    
    if (!openaiApiKey) {
      // Fallback response if OpenAI not configured
      return res.json({
        success: true,
        data: {
          message: `I received your message: "${message}". To enable AI responses, please set OPENAI_API_KEY in your backend .env file.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Call OpenAI API
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            {
              role: 'system',
              content: 'You are UAOL (Universal AI Orchestration Layer), an AI assistant that helps users execute complex workflows, analyze data, and orchestrate AI tools. Be helpful, concise, and professional.',
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(errorData.error?.message || 'OpenAI API error');
      }

      const data = await openaiResponse.json();
      const aiMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

      res.json({
        success: true,
        data: {
          message: aiMessage,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (openaiError: any) {
      logger.error('OpenAI API error', openaiError);
      res.json({
        success: true,
        data: {
          message: `I received your message: "${message}". However, there was an error calling the AI service: ${openaiError.message}. Please check your OpenAI API key.`,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    logger.error('Chat endpoint error', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to process chat message',
      },
    });
  }
});

// Proxy routes to services
app.use('/auth', createProxyMiddleware({
  target: `http://localhost:${config.services.auth.port}`,
  changeOrigin: true,
  pathRewrite: { '^/auth': '' },
}));

app.use('/tools', createProxyMiddleware({
  target: `http://localhost:${config.services.toolRegistry.port}`,
  changeOrigin: true,
  pathRewrite: { '^/tools': '/tools' },
}));

app.use('/jobs', createProxyMiddleware({
  target: `http://localhost:${config.services.jobOrchestration.port}`,
  changeOrigin: true,
  pathRewrite: { '^/jobs': '/jobs' },
}));

app.use('/proxy', createProxyMiddleware({
  target: `http://localhost:${config.services.toolProxy.port}`,
  changeOrigin: true,
  pathRewrite: { '^/proxy': '/proxy' },
}));

app.use('/billing', createProxyMiddleware({
  target: `http://localhost:${config.services.billing.port}`,
  changeOrigin: true,
  pathRewrite: { '^/billing': '/billing' },
}));

app.use('/storage', createProxyMiddleware({
  target: `http://localhost:${config.services.storage.port}`,
  changeOrigin: true,
  pathRewrite: { '^/storage': '/storage' },
}));

const port = config.apiGateway.port;

app.listen(port, () => {
  logger.info(`API Gateway listening on port ${port}`);
});


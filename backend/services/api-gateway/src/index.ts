// CRITICAL: Load .env FIRST, before any other imports that might need it
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

// Load .env from backend root
// From: backend/services/api-gateway/src/index.ts
// To: backend/.env (need to go up 3 levels: src -> api-gateway -> services -> backend)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env'); // FIXED: was ../../, now ../../../
dotenv.config({ path: envPath, override: true });

import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import multer from 'multer';
import path from 'path';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { rateLimiter } from './middleware/rate-limiter';
import { optionalAuthenticate } from '@uaol/shared/auth/optional-authenticate';

// Configure multer for audio file uploads (Whisper)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper max)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Configure multer for general file uploads
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Accept common file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/xml',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Verify .env was loaded
const logger = createLogger('api-gateway');
console.log('🔍 Environment check:');
console.log('  .env path:', envPath);
console.log('  .env exists:', existsSync(envPath));
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ SET (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '✗ NOT SET');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');

const app = express();

app.use(cors());

// Health check (before JSON parsing)
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Rate limiting
app.use(rateLimiter);

// Apply express.json() only for non-multipart routes
// Multer routes handle their own body parsing for multipart/form-data
app.use((req, res, next) => {
  // Skip JSON parsing for routes that use multer (multipart/form-data)
  if (req.path === '/chat/upload' || req.path === '/chat/transcribe') {
    return next();
  }
  // For other routes, parse JSON
  express.json()(req, res, next);
});

// Chat endpoint - processes messages with AI
// Uses optional auth: works for both authenticated users and guests
app.post('/chat', optionalAuthenticate, async (req, res) => {
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
                      content: 'You are UAOL (Universal AI Orchestration Layer), an AI assistant that helps users execute complex workflows, analyze data, and orchestrate AI tools. When users upload documents, you have access to the extracted text content. Analyze documents thoroughly, summarize key points, answer questions about the content, and provide insights. Be helpful, concise, and professional.',
                    },
                    {
                      role: 'user',
                      content: message,
                    },
                  ],
          temperature: 0.7,
          max_tokens: 2000, // Increased for document analysis
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

// File upload endpoint
app.post('/chat/upload', optionalAuthenticate, fileUpload.array('files', 10), async (req, res) => {
  try {
    const user = (req as any).user;
    const files = (req.files as Express.Multer.File[]) || [];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one file is required',
        },
      });
    }

    logger.info('File upload request', { 
      userId: user.user_id, 
      fileCount: files.length,
      files: files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype }))
    });

    // Process all files
    const { processFile } = await import('./services/file-processor.js');
    const processedFiles = await Promise.all(
      files.map(file => processFile(file, user.user_id))
    );

    // If files contain text, we can optionally analyze them with AI
    const filesWithText = processedFiles.filter(f => f.extractedText);
    
    res.json({
      success: true,
      data: {
        files: processedFiles.map(f => ({
          fileId: f.fileId,
          filename: f.originalName,
          size: f.size,
          type: f.mimeType,
          url: f.url,
          extractedText: f.extractedText,
          metadata: f.metadata,
        })),
        summary: {
          total: processedFiles.length,
          withText: filesWithText.length,
          totalSize: processedFiles.reduce((sum, f) => sum + f.size, 0),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('File upload error', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to upload files',
      },
    });
  }
});

// Whisper transcription endpoint (STT)
app.post('/chat/transcribe', optionalAuthenticate, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Audio file is required',
        },
      });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'OpenAI API key not configured',
        },
      });
    }

    logger.info('Transcription request received', { 
      fileSize: req.file.size,
      mimetype: req.file.mimetype 
    });

    // Convert audio to format Whisper accepts (if needed)
    // Whisper accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const audioFile = req.file;

    // Create FormData for OpenAI Whisper API
    // Use form-data package for Node.js
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
      filename: audioFile.originalname || 'recording.webm',
      contentType: audioFile.mimetype || 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optional: auto-detect if not specified

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json();
      logger.error('Whisper API error', errorData);
      throw new Error(errorData.error?.message || 'Whisper API error');
    }

    const transcriptionData = await whisperResponse.json();
    const transcribedText = transcriptionData.text || '';

    logger.info('Transcription successful', { textLength: transcribedText.length });

    res.json({
      success: true,
      data: {
        text: transcribedText,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Transcription endpoint error', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to transcribe audio',
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

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsDir));

const port = config.apiGateway.port;

app.listen(port, () => {
  logger.info(`API Gateway listening on port ${port}`);
});


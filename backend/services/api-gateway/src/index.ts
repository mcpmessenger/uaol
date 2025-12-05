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
import { getDatabasePool } from '@uaol/shared/database/connection';
// CRITICAL: optionalAuthenticate imports database connection, so it must be imported dynamically
// This will be imported in the async setup function below

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

// CRITICAL: Load routes that use optionalAuthenticate dynamically AFTER .env is loaded
(async () => {
  const { optionalAuthenticate } = await import('@uaol/shared/auth/optional-authenticate');
  
  // Chat endpoint - processes messages with AI
  // Uses optional auth: works for both authenticated users and guests
  app.post('/chat', optionalAuthenticate, async (req, res) => {
  try {
    const { message, fileId, provider } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required',
        },
      });
    }

    const user = (req as any).user;
    const isGuest = (req as any).isGuest;
    
    logger.info('Chat message received', { 
      message: message.substring(0, 100),
      fileId: fileId || 'none',
      provider: provider || 'default',
      userId: user?.user_id,
      isGuest
    });
    
    // Determine which provider to use and get API key
    let selectedProvider: 'openai' | 'gemini' | 'claude' = 'openai';
    let apiKey: string | null = null;
    
    // If user is authenticated (not guest), try to get their API key
    if (!isGuest && user) {
      const { UserApiKeyModel } = await import('@uaol/shared/database/models/user-api-key');
      const { decryptApiKey } = await import('@uaol/shared/auth/encryption');
      const apiKeyModel = new UserApiKeyModel(getDatabasePool());
      
      // Determine provider: use requested provider, or default, or first available
      if (provider && ['openai', 'gemini', 'claude'].includes(provider)) {
        selectedProvider = provider as 'openai' | 'gemini' | 'claude';
      } else {
        // Get default provider
        const defaultKey = await apiKeyModel.findDefaultByUser(user.user_id);
        if (defaultKey) {
          selectedProvider = defaultKey.provider;
        } else {
          // Get first available key
          const allKeys = await apiKeyModel.listByUser(user.user_id);
          if (allKeys.length > 0) {
            selectedProvider = allKeys[0].provider;
          }
        }
      }
      
      // Get the API key for selected provider
      const userApiKey = await apiKeyModel.findByUserAndProvider(user.user_id, selectedProvider);
      if (userApiKey) {
        try {
          apiKey = decryptApiKey(userApiKey.encrypted_key);
          logger.info('Using user API key', { provider: selectedProvider, userId: user.user_id });
        } catch (decryptError: any) {
          logger.error('Failed to decrypt user API key', { error: decryptError.message });
        }
      }
    }
    
    // Fallback to global API key if no user key found
    const rawKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      apiKey = rawKey.trim();
      selectedProvider = 'openai'; // Global key is always OpenAI
      logger.info('Using global API key fallback');
    }
    
    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          message: `I received your message: "${message}". To enable AI responses, please set an API key. You can set your own API keys via /setkey command or use the settings.`,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Log for debugging (but don't log the full key)
    logger.info('API key config check', { 
      hasEnvKey: !!process.env.OPENAI_API_KEY,
      hasApiKey: !!apiKey,
      provider: selectedProvider,
      rawKeyLength: rawKey.length,
      trimmedKeyLength: apiKey ? apiKey.length : 0,
      keyStarts: apiKey ? apiKey.substring(0, 12) + '...' : 'empty',
      keyEnds: apiKey && apiKey.length > 12 ? '...' + apiKey.substring(apiKey.length - 8) : 'empty',
      keyFormatValid: apiKey ? (selectedProvider === 'openai' ? apiKey.startsWith('sk-') : true) : false,
      hasWhitespace: rawKey !== rawKey.trim()
    });
    
    // Validate key format based on provider
    const { createProvider } = await import('@uaol/shared/ai/provider-factory');
    let aiProvider;
    try {
      aiProvider = createProvider(selectedProvider, apiKey);
      if (!aiProvider.validateApiKey(apiKey)) {
        throw new Error(`Invalid ${selectedProvider} API key format`);
      }
    } catch (validationError: any) {
      logger.error('Invalid API key format', { 
        provider: selectedProvider,
        error: validationError.message
      });
      return res.json({
        success: true,
        data: {
          message: `I received your message: "${message}". However, the ${selectedProvider} API key format is invalid. Please check your API key.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // RAG Step: Retrieve context from vector store if fileId is provided
    let context = '';
    if (fileId) {
      try {
        const { queryVectorStore } = await import('@uaol/shared/vector-store/vector-store');
        const retrievedChunks = await queryVectorStore(message, fileId, 5);
        
        if (retrievedChunks.length > 0) {
          // Format the retrieved context for the LLM
          context = `--- CONTEXT FROM USER DOCUMENT (File ID: ${fileId}) ---
${retrievedChunks.join('\n\n---\n\n')}
--- END CONTEXT ---

`;
          logger.info('RAG context retrieved', { 
            fileId, 
            chunkCount: retrievedChunks.length 
          });
        } else {
          logger.info('No RAG context found for file', { fileId });
        }
      } catch (ragError: any) {
        logger.warn('RAG retrieval failed', { 
          error: ragError.message, 
          fileId 
        });
        // Continue without RAG context if retrieval fails
      }
    }

    // Construct the final prompt for the LLM
    const systemPrompt = `You are UAOL (Universal AI Orchestration Layer), an AI assistant that helps users execute complex workflows, analyze data, and orchestrate AI tools.

CRITICAL INSTRUCTION: When users upload files (PDFs, documents, etc.), the FULL EXTRACTED TEXT CONTENT from those files is included directly in their message. 

Look for these markers in the user's message:
- "[Document Content Extracted]" - indicates document text follows
- "--- Document: [filename]" - marks the start of a document's extracted text
- The actual text content appears AFTER these markers

When you see document content in the user's message, you MUST:
1. Read and analyze the FULL extracted text
2. Use it to answer their questions about the document
3. Summarize, explain, or provide insights based on that content
4. Do NOT say you don't have access - the content IS in the message

Your capabilities:
- Analyze documents thoroughly using the extracted text provided
- Summarize key points from document content
- Answer questions about the document content
- Provide insights based on the extracted text
- Explain technical terms and concepts in simpler language

Be helpful, concise, and professional. ALWAYS use the document content when it's provided in the message.

${context ? 'Additionally, you have access to RAG-retrieved context from the user\'s document. Use this context along with any content directly in the message to provide comprehensive answers.' : ''}`;

    // Log the message to help debug document content inclusion
    const hasDocumentContent = message.includes('[Document Content Extracted]') || message.includes('--- Document:');
    const documentContentLength = message.match(/\[Document Content Extracted\]([\s\S]*?)(?=\n\n|$)/)?.[1]?.length || 0;
    
    logger.info('Message analysis', {
      messageLength: message.length,
      hasDocumentContent,
      documentContentLength,
      messagePreview: message.substring(0, 300),
      messageEnd: message.length > 300 ? message.substring(message.length - 200) : ''
    });
    
    // If document content is detected but seems empty, log a warning
    if (hasDocumentContent && documentContentLength < 50) {
      logger.warn('Document content marker found but content appears empty or very short', {
        documentContentLength
      });
    }

    const finalUserMessage = context ? `${context}User Question: ${message}` : message;

    // Call AI provider
    try {
      logger.info('AI provider request', {
        provider: selectedProvider,
        messageLength: finalUserMessage.length
      });
      
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: finalUserMessage,
        },
      ];
      
      const aiMessage = await aiProvider.chatCompletion(messages, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      res.json({
        success: true,
        data: {
          message: aiMessage,
          provider: selectedProvider,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (aiError: any) {
      logger.error('AI provider error', {
        provider: selectedProvider,
        error: aiError.message,
        stack: aiError.stack,
      });
      
      // Provide more helpful error messages
      let errorMessage = aiError.message;
      if (errorMessage.includes('Incorrect API key') || errorMessage.includes('Invalid API key')) {
        errorMessage = `Incorrect or invalid ${selectedProvider} API key. Please verify your API key is correct and active.`;
      }
      
      res.json({
        success: true,
        data: {
          message: `I received your message: "${message}". However, there was an error calling the ${selectedProvider} AI service: ${errorMessage}`,
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
  // API Key management routes (requires authentication, not guest)
  const apiKeysRouter = await import('./routes/api-keys.js');
  app.use('/api-keys', apiKeysRouter.default);
  
  // Proxy routes to services
  app.use('/auth', createProxyMiddleware({
    target: `http://localhost:${config.services.auth.port}`,
    changeOrigin: true,
    pathRewrite: { '^/auth': '' }, // Strip /auth prefix before forwarding
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

  // Start server AFTER all routes are registered
  const port = config.apiGateway.port;
  app.listen(port, () => {
    logger.info(`API Gateway listening on port ${port}`);
  });
})(); // End async IIFE - server starts after routes are registered


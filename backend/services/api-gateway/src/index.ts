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
    const { message, fileId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required',
        },
      });
    }

    logger.info('Chat message received', { 
      message: message.substring(0, 100),
      fileId: fileId || 'none'
    });
    
    // Get OpenAI API key - check process.env directly (most reliable)
    const rawKey = process.env.OPENAI_API_KEY || '';
    const openaiApiKey = rawKey.trim(); // Remove whitespace
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4';
    
    // Log for debugging (but don't log the full key)
    logger.info('OpenAI config check', { 
      hasEnvKey: !!process.env.OPENAI_API_KEY,
      rawKeyLength: rawKey.length,
      trimmedKeyLength: openaiApiKey.length,
      keyStarts: openaiApiKey ? openaiApiKey.substring(0, 12) + '...' : 'empty',
      keyEnds: openaiApiKey && openaiApiKey.length > 12 ? '...' + openaiApiKey.substring(openaiApiKey.length - 8) : 'empty',
      keyFormatValid: openaiApiKey.startsWith('sk-'),
      hasWhitespace: rawKey !== rawKey.trim()
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
    
    // Validate key format
    if (!openaiApiKey.startsWith('sk-')) {
      logger.error('Invalid OpenAI API key format', { 
        keyStarts: openaiApiKey.substring(0, 10) 
      });
      return res.json({
        success: true,
        data: {
          message: `I received your message: "${message}". However, the OpenAI API key format is invalid. It should start with "sk-". Please check your OPENAI_API_KEY in backend/.env.`,
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

    // Call OpenAI API
    try {
      // Some newer models (o1, o3, gpt-5.x, etc.) require max_completion_tokens instead of max_tokens
      // Check if model name suggests it needs max_completion_tokens
      const modelLower = openaiModel.toLowerCase().replace(/\s+/g, ''); // Remove spaces
      const modelsRequiringMaxCompletionTokens = ['o1', 'o1-preview', 'o1-mini', 'o3', 'o3-mini', 'gpt-5'];
      const useMaxCompletionTokens = modelsRequiringMaxCompletionTokens.some(m => modelLower.includes(m)) || 
                                      modelLower.startsWith('o1') || 
                                      modelLower.startsWith('o3') ||
                                      modelLower.startsWith('gpt-5') ||
                                      modelLower.startsWith('gpt5') ||
                                      /^gpt-?5\./.test(modelLower);
      
      logger.info('OpenAI API request', {
        model: openaiModel,
        useMaxCompletionTokens,
        parameter: useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens'
      });
      
      // Build request body with appropriate token limit parameter
      const requestBody: any = {
        model: openaiModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: finalUserMessage,
          },
        ],
        temperature: 0.7,
      };
      
      // Use the correct parameter based on model
      if (useMaxCompletionTokens) {
        requestBody.max_completion_tokens = 2000;
      } else {
        requestBody.max_tokens = 2000; // Increased for document analysis
      }
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        const errorMessage = errorData.error?.message || `OpenAI API error: ${openaiResponse.statusText}`;
        
        logger.error('OpenAI API error response', {
          status: openaiResponse.status,
          statusText: openaiResponse.statusText,
          error: errorData.error,
          model: openaiModel,
          keyEnds: openaiApiKey.substring(openaiApiKey.length - 8)
        });
        
        // Handle specific parameter errors
        if (errorMessage.includes("max_tokens") && (errorMessage.includes("max_completion_tokens") || errorMessage.includes("not supported"))) {
          logger.warn('Model requires max_completion_tokens but was not detected', { model: openaiModel });
          throw new Error(`Model ${openaiModel} requires 'max_completion_tokens' instead of 'max_tokens'. Please check your OPENAI_MODEL setting in backend/.env. Supported models that need this: o1, o1-preview, o1-mini, o3, o3-mini, gpt-5.x.`);
        }
        
        throw new Error(errorMessage);
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
      logger.error('OpenAI API error', {
        error: openaiError.message,
        stack: openaiError.stack,
        keyLength: openaiApiKey.length,
        keyEnds: openaiApiKey.substring(openaiApiKey.length - 8)
      });
      
      // Provide more helpful error messages
      let errorMessage = openaiError.message;
      if (errorMessage.includes('Incorrect API key')) {
        errorMessage = 'Incorrect API key provided. Please verify your OPENAI_API_KEY in backend/.env is correct and active. You can check your keys at https://platform.openai.com/api-keys';
      } else if (errorMessage.includes('Invalid API key')) {
        errorMessage = 'Invalid API key format. Please check your OPENAI_API_KEY in backend/.env starts with "sk-" and has no quotes or extra spaces.';
      }
      
      res.json({
        success: true,
        data: {
          message: `I received your message: "${message}". However, there was an error calling the AI service: ${errorMessage}`,
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
})(); // End async IIFE for routes with optionalAuthenticate

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


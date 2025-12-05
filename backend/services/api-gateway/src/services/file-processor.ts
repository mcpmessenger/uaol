import { createLogger } from '@uaol/shared/logger';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// @ts-ignore - mammoth doesn't have types
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { indexDocumentChunks, type DocumentChunk } from '@uaol/shared/vector-store/vector-store';

// CRITICAL: Set DOMMatrix polyfill immediately at module load time
// pdfjs-dist and pdf-parse check for DOMMatrix during module initialization
if (typeof globalThis.DOMMatrix === 'undefined') {
  // Minimal DOMMatrix polyfill - set immediately so PDF libraries can use it
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init?: string | number[]) {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; this.m41 = 0; this.m42 = 0;
      if (typeof init === 'string') {
        const values = init.match(/[\d.-]+/g);
        if (values && values.length >= 6) {
          this.a = this.m11 = parseFloat(values[0]);
          this.b = this.m12 = parseFloat(values[1]);
          this.c = this.m21 = parseFloat(values[2]);
          this.d = this.m22 = parseFloat(values[3]);
          this.e = this.m41 = parseFloat(values[4]);
          this.f = this.m42 = parseFloat(values[5]);
        }
      }
    }
    a: number; b: number; c: number; d: number; e: number; f: number;
    m11: number; m12: number; m21: number; m22: number; m41: number; m42: number;
    multiply(other: any) { return this; }
    translate(x: number, y?: number) { return this; }
    scale(x: number, y?: number) { return this; }
    rotate(angle: number) { return this; }
    toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
  } as any;
}

// Polyfill loading function - ensures DOM APIs are available for pdf-parse
let polyfillsLoaded = false;
async function ensurePolyfillsLoaded() {
  if (polyfillsLoaded) return;
  
  try {
    // Load DOMMatrix polyfill - MUST be loaded before any PDF library imports
    if (typeof globalThis.DOMMatrix === 'undefined') {
      try {
        // @thednp/dommatrix exports CSSMatrix as default, which is DOMMatrix-compatible
        const dommatrixModule = await import('@thednp/dommatrix');
        
        // Log what we got for debugging
        const moduleKeys = Object.keys(dommatrixModule);
        logger.debug('dommatrix module structure', {
          keys: moduleKeys,
          hasDefault: !!dommatrixModule.default,
          defaultType: typeof dommatrixModule.default,
          hasDOMMatrix: !!dommatrixModule.DOMMatrix,
          hasCSSMatrix: !!dommatrixModule.CSSMatrix
        });
        
        // Try to get DOMMatrix/CSSMatrix - use default export (CSSMatrix) as DOMMatrix
        const DOMMatrixClass = dommatrixModule.DOMMatrix || 
                              dommatrixModule.default || 
                              dommatrixModule.CSSMatrix ||
                              (dommatrixModule as any);
        
        const DOMPointClass = dommatrixModule.DOMPoint || 
                             (dommatrixModule.default as any)?.DOMPoint;
        
        if (DOMMatrixClass && typeof DOMMatrixClass === 'function') {
          globalThis.DOMMatrix = DOMMatrixClass;
          if (DOMPointClass && typeof DOMPointClass === 'function') {
            globalThis.DOMPoint = DOMPointClass;
          }
          logger.info('DOMMatrix polyfill loaded successfully', {
            source: dommatrixModule.DOMMatrix ? 'DOMMatrix' : 
                   dommatrixModule.default ? 'default (CSSMatrix)' : 'CSSMatrix',
            hasDOMPoint: !!DOMPointClass
          });
        } else {
          // If we can't find DOMMatrix in the module, use fallback
          logger.warn('DOMMatrix not found in module, using fallback', {
            moduleKeys,
            hasDefault: !!dommatrixModule.default,
            defaultType: typeof dommatrixModule.default
          });
          throw new Error(`DOMMatrix class not found. Module exports: ${moduleKeys.join(', ')}`);
        }
      } catch (importError: any) {
        logger.warn('Failed to import @thednp/dommatrix, using fallback', { 
          error: importError.message
        });
        
        // Fallback: Create a minimal DOMMatrix polyfill
        // This is a basic implementation that should work for pdfjs-dist
        globalThis.DOMMatrix = class DOMMatrix {
          constructor(init?: string | number[]) {
            this.a = 1;
            this.b = 0;
            this.c = 0;
            this.d = 1;
            this.e = 0;
            this.f = 0;
            this.m11 = 1;
            this.m12 = 0;
            this.m21 = 0;
            this.m22 = 1;
            this.m41 = 0;
            this.m42 = 0;
            if (typeof init === 'string') {
              // Basic matrix parsing (simplified)
              const values = init.match(/[\d.-]+/g);
              if (values && values.length >= 6) {
                this.a = parseFloat(values[0]);
                this.b = parseFloat(values[1]);
                this.c = parseFloat(values[2]);
                this.d = parseFloat(values[3]);
                this.e = parseFloat(values[4]);
                this.f = parseFloat(values[5]);
                this.m11 = this.a;
                this.m12 = this.b;
                this.m21 = this.c;
                this.m22 = this.d;
                this.m41 = this.e;
                this.m42 = this.f;
              }
            }
          }
          a: number;
          b: number;
          c: number;
          d: number;
          e: number;
          f: number;
          m11: number;
          m12: number;
          m21: number;
          m22: number;
          m41: number;
          m42: number;
          multiply(other: any) { return this; }
          translate(x: number, y?: number) { return this; }
          scale(x: number, y?: number) { return this; }
          rotate(angle: number) { return this; }
          toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
        } as any;
        
        logger.info('Minimal DOMMatrix polyfill installed as fallback');
      }
    } else {
      logger.debug('DOMMatrix already available on globalThis');
    }
    
    // Polyfill ImageData
    if (typeof globalThis.ImageData === 'undefined') {
      globalThis.ImageData = class ImageData {
        constructor(data: Uint8ClampedArray | number, width: number, height?: number) {
          if (typeof data === 'number') {
            this.data = new Uint8ClampedArray(data * (height || width));
            this.width = data;
            this.height = height || width;
          } else {
            this.data = data;
            this.width = width;
            this.height = height || (data.length / (width * 4));
          }
        }
        data: Uint8ClampedArray;
        width: number;
        height: number;
      } as any;
    }
    
    // Polyfill Path2D
    if (typeof globalThis.Path2D === 'undefined') {
      globalThis.Path2D = class Path2D {} as any;
    }
    
    polyfillsLoaded = true;
    logger.info('DOM polyfills loaded for PDF parsing', {
      hasDOMMatrix: typeof globalThis.DOMMatrix !== 'undefined',
      hasDOMPoint: typeof globalThis.DOMPoint !== 'undefined',
      hasImageData: typeof globalThis.ImageData !== 'undefined',
      hasPath2D: typeof globalThis.Path2D !== 'undefined'
    });
    
    // Final check - if DOMMatrix still not set, use fallback
    if (typeof globalThis.DOMMatrix === 'undefined') {
      logger.warn('DOMMatrix still not set after polyfill load, installing fallback');
      globalThis.DOMMatrix = class DOMMatrix {
        constructor(init?: string | number[]) {
          this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
          this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; this.m41 = 0; this.m42 = 0;
          if (typeof init === 'string') {
            const values = init.match(/[\d.-]+/g);
            if (values && values.length >= 6) {
              this.a = this.m11 = parseFloat(values[0]);
              this.b = this.m12 = parseFloat(values[1]);
              this.c = this.m21 = parseFloat(values[2]);
              this.d = this.m22 = parseFloat(values[3]);
              this.e = this.m41 = parseFloat(values[4]);
              this.f = this.m42 = parseFloat(values[5]);
            }
          }
        }
        a: number; b: number; c: number; d: number; e: number; f: number;
        m11: number; m12: number; m21: number; m22: number; m41: number; m42: number;
        multiply(other: any) { return this; }
        translate(x: number, y?: number) { return this; }
        scale(x: number, y?: number) { return this; }
        rotate(angle: number) { return this; }
        toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
      } as any;
      logger.info('Fallback DOMMatrix installed');
    }
  } catch (error: any) {
    logger.error('Could not load DOM polyfills for PDF parsing', { 
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      package: '@thednp/dommatrix'
    });
    
    // Ensure fallback is set even if everything fails
    if (typeof globalThis.DOMMatrix === 'undefined') {
      logger.warn('Installing fallback DOMMatrix after error');
      globalThis.DOMMatrix = class DOMMatrix {
        constructor(init?: string | number[]) {
          this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
          this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; this.m41 = 0; this.m42 = 0;
          if (typeof init === 'string') {
            const values = init.match(/[\d.-]+/g);
            if (values && values.length >= 6) {
              this.a = this.m11 = parseFloat(values[0]);
              this.b = this.m12 = parseFloat(values[1]);
              this.c = this.m21 = parseFloat(values[2]);
              this.d = this.m22 = parseFloat(values[3]);
              this.e = this.m41 = parseFloat(values[4]);
              this.f = this.m42 = parseFloat(values[5]);
            }
          }
        }
        a: number; b: number; c: number; d: number; e: number; f: number;
        m11: number; m12: number; m21: number; m22: number; m41: number; m42: number;
        multiply(other: any) { return this; }
        translate(x: number, y?: number) { return this; }
        scale(x: number, y?: number) { return this; }
        rotate(angle: number) { return this; }
        toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
      } as any;
    }
    
    // Set flag anyway to prevent infinite retry loops
    polyfillsLoaded = true;
    // Continue anyway - fallback should work
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('file-processor');

/**
 * Detect if a PDF is scanned (image-based) based on text extraction results
 */
async function detectScannedPDF(
  pdfBuffer: Buffer,
  extractedText: string,
  numPages: number
): Promise<boolean> {
  const textLength = (extractedText || '').trim().length;
  const avgCharsPerPage = numPages > 0 ? textLength / numPages : 0;
  
  // Heuristic: If average characters per page is very low, likely scanned
  // Threshold: Less than 50 characters per page suggests scanned document
  const isScanned = avgCharsPerPage < 50;
  
  logger.debug('PDF type detection', {
    textLength,
    numPages,
    avgCharsPerPage: avgCharsPerPage.toFixed(1),
    detectedType: isScanned ? 'scanned (needs OCR)' : 'native (text-based)',
  });
  
  return isScanned;
}

/**
 * Get OpenAI API key for a user, with fallback to global key
 */
async function getOpenAIApiKey(userId?: string): Promise<string | null> {
  // If userId is provided, try to get user's API key first
  if (userId) {
    try {
      const { UserApiKeyModel } = await import('@uaol/shared/database/models/user-api-key');
      const { decryptApiKey } = await import('@uaol/shared/auth/encryption');
      const { getDatabasePool } = await import('@uaol/shared/database/connection');
      
      const apiKeyModel = new UserApiKeyModel(getDatabasePool());
      const userApiKey = await apiKeyModel.findByUserAndProvider(userId, 'openai');
      
      if (userApiKey) {
        try {
          const decryptedKey = decryptApiKey(userApiKey.encrypted_key);
          logger.debug('Using user API key for Vision API', { userId });
          return decryptedKey;
        } catch (decryptError: any) {
          logger.warn('Failed to decrypt user API key, falling back to global key', {
            error: decryptError.message,
            userId,
          });
        }
      }
    } catch (error: any) {
      logger.warn('Failed to retrieve user API key, falling back to global key', {
        error: error.message,
        userId,
      });
    }
  }
  
  // Fallback to global API key
  const globalKey = process.env.OPENAI_API_KEY;
  if (globalKey) {
    const trimmedKey = globalKey.trim();
    // Validate key format (OpenAI keys start with 'sk-' or 'sk-proj-')
    if (trimmedKey.length > 0 && (trimmedKey.startsWith('sk-') || trimmedKey.startsWith('sk-proj-'))) {
      logger.debug('Using global OpenAI API key', {
        keyLength: trimmedKey.length,
        keyPrefix: trimmedKey.substring(0, 10) + '...',
      });
      return trimmedKey;
    } else {
      logger.warn('Global OpenAI API key has invalid format', {
        keyLength: trimmedKey.length,
        keyPrefix: trimmedKey.substring(0, Math.min(20, trimmedKey.length)),
        expectedPrefix: 'sk- or sk-proj-',
      });
      // Still return it - let OpenAI API validate it
      return trimmedKey;
    }
  }
  
  return null;
}

/**
 * Analyze image buffer with OpenAI Vision API
 * Reusable for both standalone images and PDF-extracted images
 */
async function analyzeImageWithVisionAPI(
  imageBuffer: Buffer,
  mimeType: string = 'image/png',
  customPrompt?: string,
  userId?: string
): Promise<string> {
  const openaiApiKey = await getOpenAIApiKey(userId);
  if (!openaiApiKey) {
    logger.error('OpenAI API key not found', {
      userId,
      hasGlobalKey: !!process.env.OPENAI_API_KEY,
      globalKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    });
    throw new Error('OpenAI API key not configured. Please add your API key in settings or configure OPENAI_API_KEY environment variable.');
  }
  
  // Log which key source is being used (without exposing the key)
  logger.debug('Using OpenAI API key for Vision API', {
    userId,
    keySource: userId ? 'user-specific' : 'global',
    keyLength: openaiApiKey.length,
    keyPrefix: openaiApiKey.substring(0, 7) + '...',
  });

  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const defaultPrompt = 'Extract all text from this image. If there are tables, format them clearly. Describe any charts, graphs, or visual elements. Provide a comprehensive analysis of the document content.';

  const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: customPrompt || defaultPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!visionResponse.ok) {
    const errorData = await visionResponse.json();
    const errorMessage = errorData.error?.message || 'OpenAI Vision API error';
    
    // Log detailed error for debugging
    logger.error('OpenAI Vision API error', {
      status: visionResponse.status,
      statusText: visionResponse.statusText,
      errorMessage,
      userId,
      keySource: userId ? 'user-specific' : 'global',
      keyPrefix: openaiApiKey.substring(0, 7) + '...',
      fullError: errorData,
    });
    
    // Provide more helpful error messages
    if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('Invalid API key')) {
      throw new Error(`Invalid OpenAI API key. Please verify your API key is correct and active. ${userId ? 'Check your API key settings.' : 'Configure OPENAI_API_KEY environment variable.'}`);
    }
    
    throw new Error(errorMessage);
  }

  const visionData = await visionResponse.json();
  return visionData.choices[0]?.message?.content || '';
}

/**
 * Extract embedded images from PDF
 */
interface ExtractedPDFImage {
  pageNumber: number;
  imageBuffer: Buffer;
  imageType: 'jpeg' | 'png' | 'gif';
}

async function extractImagesFromPDF(
  pdfBuffer: Buffer,
  options?: {
    maxImages?: number;
    minSize?: number;
  }
): Promise<ExtractedPDFImage[]> {
  const { maxImages = 20, minSize = 5000 } = options || {};
  const images: ExtractedPDFImage[] = [];
  
  try {
    // Ensure polyfills are loaded BEFORE importing pdfjs-dist
    // pdfjs-dist requires DOMMatrix to be available
    await ensurePolyfillsLoaded();
    
    // Dynamic import to avoid loading pdfjs-dist if not needed
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configure pdfjs worker (required for Node.js)
    // Using CDN worker - in production you might want to bundle it
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      verbosity: 0,
    });
    
    const pdfDocument = await loadingTask.promise;
    logger.info(`Extracting images from PDF: ${pdfDocument.numPages} pages`);
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages && images.length < maxImages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const operatorList = await page.getOperatorList();
      
      // Find all XObject references (images are XObjects)
      const imageNames = new Set<string>();
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        // OPS.paintXObject is the "Do" operator that draws XObjects
        if (operatorList.fnArray[i] === pdfjsLib.OPS.paintXObject) {
          const xObjectName = operatorList.argsArray[i][0];
          imageNames.add(xObjectName);
        }
      }
      
      // Extract each image
      for (const imageName of imageNames) {
        if (images.length >= maxImages) break;
        
        try {
          // Get the XObject from page's object manager
          const xObject = await page.objs.get(imageName);
          
          // Check if it has image data
          if (!xObject || !xObject.data) continue;
          
          const imageData = xObject.data;
          
          // Skip very small images (likely icons/logos, not charts)
          if (imageData.length < minSize) {
            logger.debug(`Skipping small image on page ${pageNum} (${imageData.length} bytes)`);
            continue;
          }
          
          // Detect image type by checking file signatures
          const imageType = detectImageType(imageData);
          if (!imageType) continue; // Skip if not a recognized image type
          
          images.push({
            pageNumber: pageNum,
            imageBuffer: Buffer.from(imageData),
            imageType,
          });
          
          logger.debug(`Extracted ${imageType.toUpperCase()} image from page ${pageNum} (${imageData.length} bytes)`);
        } catch (error: any) {
          // Some XObjects might not be images, skip them
          logger.debug(`Skipping non-image XObject: ${imageName}`, { error: error.message });
        }
      }
    }
    
    logger.info(`Extracted ${images.length} images from PDF`);
    return images;
    
  } catch (error: any) {
    logger.error('Failed to extract images from PDF', { error: error.message });
    // Don't throw - allow PDF processing to continue with text only
    return [];
  }
}

/**
 * Detect image type from raw bytes by checking file signatures
 */
function detectImageType(data: Uint8Array): 'jpeg' | 'png' | 'gif' | null {
  // JPEG signature: FF D8 FF
  if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
    return 'jpeg';
  }
  
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
    return 'png';
  }
  
  // GIF signature: GIF87a or GIF89a
  if (
    data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38 &&
    (data[4] === 0x37 || data[4] === 0x39) && data[5] === 0x61
  ) {
    return 'gif';
  }
  
  return null; // Not a recognized image type
}

export interface ProcessedFile {
  fileId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  storedPath: string;
  url: string;
  extractedText?: string;
  metadata?: {
    type: 'document' | 'image' | 'data' | 'other';
    pages?: number;
    dimensions?: { width: number; height: number };
    rowCount?: number;
    columnCount?: number;
    imageCount?: number; // Number of images extracted from PDF
  };
}

/**
 * Store file and extract comprehensive information
 */
export async function processFile(
  file: Express.Multer.File,
  userId: string
): Promise<ProcessedFile> {
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fileExt = path.extname(file.originalname);
  const sanitizedFilename = `${fileId}${fileExt}`;
  
  // Create user-specific upload directory
  const uploadDir = path.join(__dirname, '../../../uploads', userId);
  await fs.mkdir(uploadDir, { recursive: true });
  
  const storedPath = path.join(uploadDir, sanitizedFilename);
  
  // Write file to disk
  await fs.writeFile(storedPath, file.buffer);
  
  logger.info('File stored', { 
    userId, 
    fileId, 
    filename: file.originalname,
    size: file.size,
    storedPath 
  });

  // Determine file type
  const fileType = determineFileType(file.mimetype, fileExt);
  
  logger.info('Starting text extraction', {
    fileId,
    filename: file.originalname,
    fileType,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // Extract text and metadata
  let extractedText: string | undefined;
  let metadata: ProcessedFile['metadata'] = { type: fileType };
  
  try {
    const extractionResult = await extractTextAndMetadata(file, storedPath, fileType, userId);
    extractedText = extractionResult.text;
    metadata = { ...metadata, ...extractionResult.metadata };
    
    logger.info('Text extraction result', {
      fileId,
      filename: file.originalname,
      hasText: !!extractedText,
      textLength: extractedText?.length || 0,
      metadataKeys: Object.keys(metadata)
    });
    
    if (extractedText) {
      logger.info('Text extracted successfully', { 
        fileId, 
        filename: file.originalname,
        textLength: extractedText.length,
        fileType,
        metadata 
      });

      // RAG Indexing: Normalize, chunk, and index the document
      try {
        // 1. Normalize text
        const normalizedText = normalizeText(extractedText);
        
        // 2. Chunk text
        const chunks = await chunkText(normalizedText, fileId);
        
        // 3. Index chunks in vector store
        await indexDocumentChunks(fileId, chunks);
        
        logger.info('Document indexed for RAG', { fileId, chunkCount: chunks.length });
      } catch (ragError: any) {
        // Don't fail file processing if RAG indexing fails
        logger.warn('RAG indexing failed', { error: ragError.message, fileId });
      }
    } else {
      logger.warn('No text extracted from file', {
        fileId,
        filename: file.originalname,
        fileType,
        mimetype: file.mimetype,
      });
    }
  } catch (error: any) {
    // Enhanced error logging for PDF extraction issues
    const errorDetails: any = {
      error: error.message, 
      fileId,
      fileName: file.originalname,
      fileType: fileType,
      mimeType: file.mimetype,
      isPDF: file.mimetype === 'application/pdf',
      bufferSize: file.buffer?.length,
      errorType: error.constructor?.name,
      // Check for common PDF parsing errors
      isDOMMatrixError: error.message?.includes('DOMMatrix'),
      isImportError: error.message?.includes('Cannot find module') || error.message?.includes('import'),
      isParseError: error.message?.includes('parse') || error.message?.includes('PDF'),
      hasDOMMatrix: typeof globalThis.DOMMatrix !== 'undefined'
    };
    
    // Only include stack trace in debug mode to avoid log spam
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      errorDetails.stack = error.stack;
    }
    
    logger.error('Text extraction failed', errorDetails);
    // Don't throw - allow file to be uploaded even if text extraction fails
    // extractedText remains undefined, which frontend will handle
  }

  const url = `/uploads/${userId}/${sanitizedFilename}`;

  return {
    fileId,
    filename: sanitizedFilename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    storedPath,
    url,
    extractedText,
    metadata,
  };
}

/**
 * Cleans and normalizes text for better chunking and embedding.
 */
function normalizeText(text: string): string {
  // 1. Replace multiple newlines/spaces with a single space
  let cleanedText = text.replace(/[\r\n]+/g, ' ');
  // 2. Remove excessive whitespace
  cleanedText = cleanedText.replace(/\s{2,}/g, ' ').trim();
  // 3. Optional: Remove common header/footer patterns if they are noise
  // cleanedText = cleanedText.replace(/Page \d+ of \d+/g, '');
  return cleanedText;
}

/**
 * Splits the normalized text into chunks suitable for embedding.
 */
async function chunkText(text: string, fileId: string): Promise<DocumentChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000, // Optimal size for RAG context
    chunkOverlap: 200, // Ensures context continuity between chunks
  });

  const chunks = await splitter.splitText(text);

  return chunks.map((chunk, index) => ({
    id: `${fileId}-${index}`,
    text: chunk,
    metadata: { fileId, chunkIndex: index },
  }));
}

/**
 * Determine file type category
 */
function determineFileType(mimeType: string, ext: string): 'document' | 'image' | 'data' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf') || 
      mimeType.includes('document') || 
      mimeType.includes('wordprocessingml') ||
      mimeType.includes('msword') ||
      mimeType.includes('text')) {
    return 'document';
  }
  if (mimeType.includes('spreadsheet') || 
      mimeType.includes('csv') || 
      mimeType.includes('excel') ||
      mimeType === 'application/json') {
    return 'data';
  }
  return 'other';
}

/**
 * Extract text and metadata from file using document intelligence
 */
async function extractTextAndMetadata(
  file: Express.Multer.File,
  filePath: string,
  fileType: string,
  userId?: string
): Promise<{ text?: string; metadata: ProcessedFile['metadata'] }> {
  const metadata: ProcessedFile['metadata'] = { type: fileType as any };

  // 1. Plain text files
  if (file.mimetype.includes('text/') || file.mimetype === 'application/json') {
    const text = file.buffer.toString('utf-8');
    return { text, metadata };
  }

  // 2. PDF files
  if (file.mimetype === 'application/pdf') {
    // Declare enableOCR at the top of the scope to avoid any hoisting issues
    // Use a single declaration that will be used throughout this entire block
    const enableOCRFlag = process.env.ENABLE_OCR !== 'false';
    let nativeParseAttempted = false;
    let nativeParseSucceeded = false;
    
    try {
      // Ensure polyfills are loaded BEFORE any PDF library imports
      // This is critical - pdfjs-dist needs DOMMatrix to be available
      await ensurePolyfillsLoaded();
      
      // Final check - ensure DOMMatrix exists
      if (typeof globalThis.DOMMatrix === 'undefined') {
        logger.warn('DOMMatrix not set, installing emergency fallback');
        // Emergency fallback - should already be set at top level, but just in case
        (globalThis as any).DOMMatrix = class {
          constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
            this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; this.m41 = 0; this.m42 = 0;
          }
          a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
          m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
          multiply() { return this; }
          translate() { return this; }
          scale() { return this; }
          rotate() { return this; }
          toString() { return 'matrix(1,0,0,1,0,0)'; }
        };
      }
      
      // Use enableOCRFlag variable (already declared above)
      const willTryOCROnFailure = enableOCRFlag;
      
      logger.info('Starting PDF parsing', {
        hasDOMMatrix: typeof globalThis.DOMMatrix !== 'undefined',
        bufferSize: file.buffer.length,
        filename: file.originalname,
        mimetype: file.mimetype,
        enableOCR: enableOCRFlag,
        willTryOCROnFailure: willTryOCROnFailure
      });
      
      nativeParseAttempted = true;
      
      // Step 1: Try native PDF text extraction first (fast, free)
      // pdf-parse should work with our DOMMatrix polyfill
      logger.debug('Importing pdf-parse module...');
      
      // Suppress console warnings from pdf-parse about ImageData/Path2D (they don't affect text extraction)
      const originalWarn = console.warn;
      const suppressedWarnings: string[] = [];
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        // Suppress known harmless warnings from pdf-parse
        if (message.includes('ImageData') || message.includes('Path2D') || message.includes('require') || message.includes('getBuiltinModule')) {
          suppressedWarnings.push(message);
          return; // Suppress these warnings
        }
        originalWarn.apply(console, args);
      };
      
      let pdfData;
      try {
        const pdfParseModule = await import('pdf-parse');
        // pdf-parse exports PDFParse as a CLASS that requires 'new'
        // Error: "Class constructor PDFParse cannot be invoked without 'new'"
        // We need to instantiate it with 'new PDFParse(buffer)'
        let pdfParseFn: any;
        
        if (pdfParseModule.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
          // PDFParse is a class - check if it has a static parse method or needs instantiation
          if (pdfParseModule.PDFParse.parse && typeof pdfParseModule.PDFParse.parse === 'function') {
            // Static method
            pdfParseFn = pdfParseModule.PDFParse.parse;
          } else {
            // Need to instantiate with 'new' - the instance might be thenable
            pdfParseFn = (buffer: Buffer) => {
              return new pdfParseModule.PDFParse(buffer);
            };
          }
        } else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
          pdfParseFn = pdfParseModule.default;
        } else if (typeof pdfParseModule === 'function') {
          pdfParseFn = pdfParseModule;
        } else {
          throw new Error(`pdf-parse import failed: PDFParse is ${typeof pdfParseModule.PDFParse}, default is ${typeof pdfParseModule.default}`);
        }
        
        logger.debug('pdf-parse imported successfully, parsing PDF buffer...', {
          bufferLength: file.buffer.length,
          suppressedWarnings: suppressedWarnings.length,
          usingPDFParse: !!pdfParseModule.PDFParse,
          usingNew: !!pdfParseModule.PDFParse
        });
        
        // Parse PDF with timeout protection
        pdfData = await Promise.race([
          pdfParseFn(file.buffer),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('PDF parsing timeout after 30 seconds')), 30000)
          )
        ]) as any;
        
        // Restore console.warn
        console.warn = originalWarn;
      } catch (parseError: any) {
        // Restore console.warn even on error
        console.warn = originalWarn;
        logger.error('PDF parse failed during execution', {
          error: parseError.message,
          errorType: parseError.constructor?.name,
          bufferSize: file.buffer.length,
          filename: file.originalname,
          suppressedWarnings: suppressedWarnings.length,
          willTryOCR: enableOCRFlag
        });
        
        // If OCR is enabled, don't throw - try OCR fallback instead
        if (enableOCRFlag) {
          logger.info('Native PDF parsing failed, will attempt OCR fallback');
          nativeParseSucceeded = false;
          // Fall through to OCR fallback below
          throw parseError; // Still throw to trigger OCR fallback in catch block
        }
        
        throw parseError;
      }
      
      let text = pdfData.text || '';
      metadata.pages = pdfData.numpages;
      nativeParseSucceeded = true;
      
      logger.info('PDF parsed successfully', {
        pages: pdfData.numpages,
        textLength: text.length,
        hasText: text.length > 0,
        filename: file.originalname,
        preview: text.length > 0 ? text.substring(0, 200) : '(no text extracted)',
        info: pdfData.info ? Object.keys(pdfData.info) : [],
        metadata: pdfData.metadata ? Object.keys(pdfData.metadata) : []
      });
      
      // If no text extracted, log warning and try OCR immediately
      const hasNoText = !text || text.trim().length === 0;
      if (hasNoText) {
        logger.warn('PDF parsed but no text extracted - likely scanned PDF', {
          filename: file.originalname,
          pages: pdfData.numpages,
          bufferSize: file.buffer.length,
          pdfInfo: pdfData.info,
          pdfMetadata: pdfData.metadata,
          willTryOCR: process.env.ENABLE_OCR !== 'false'
        });
      }
      
      // Step 2: Detect if PDF is scanned (image-based) or native (text-based)
      // Use enableOCRFlag from outer scope to avoid variable shadowing
      // If no text extracted, assume it's scanned and try OCR
      const isScanned = enableOCRFlag ? (hasNoText || await detectScannedPDF(file.buffer, text, pdfData.numpages)) : false;
      
      logger.info('PDF text extraction status', {
        filename: file.originalname,
        pages: pdfData.numpages,
        textLength: text.length,
        hasNoText,
        isScanned,
        enableOCR: enableOCRFlag,
        willTryOCR: isScanned && enableOCRFlag
      });
      
      // Step 3: If scanned or text extraction yielded very little, use OCR
      if (isScanned && enableOCRFlag) {
        try {
          const { performOCR } = await import('./ocr-service.js');
          const { convertPdfPagesToImages } = await import('./pdf-ocr-helper.js');
          
          logger.info('PDF appears to be scanned, converting pages to images for OCR', {
            nativeTextLength: text.length,
            pages: pdfData.numpages,
          });
          
          // Convert PDF pages to images
          const maxPagesForOCR = parseInt(process.env.MAX_PDF_PAGES_FOR_OCR || '10', 10);
          const pageImages = await convertPdfPagesToImages(file.buffer, {
            format: 'jpeg',
            density: 200, // Good quality for OCR
            maxPages: maxPagesForOCR,
          });
          
          if (pageImages.length === 0) {
            logger.warn('Failed to convert PDF pages to images, falling back to native text');
            // Continue with native text
          } else {
            logger.info(`Converted ${pageImages.length} PDF pages to images, performing OCR...`);
            
            // Perform OCR on each page image
            const ocrResults = await Promise.all(
              pageImages.map(async (pageImage) => {
                try {
                  const ocrResult = await performOCR(pageImage.imageBuffer, {
                    languageHints: [], // Auto-detect language
                    enableDocumentTextDetection: true,
                  });
                  
                  return {
                    pageNumber: pageImage.pageNumber,
                    text: ocrResult.text || '',
                    confidence: ocrResult.confidence || 0,
                    language: ocrResult.language,
                  };
                } catch (pageOcrError: any) {
                  logger.warn(`OCR failed for page ${pageImage.pageNumber}`, {
                    error: pageOcrError.message,
                  });
                  return {
                    pageNumber: pageImage.pageNumber,
                    text: '',
                    confidence: 0,
                  };
                }
              })
            );
            
            // Combine OCR results from all pages
            const ocrTexts = ocrResults
              .filter(r => r.text && r.text.length > 0)
              .map(r => `\n--- Page ${r.pageNumber} ---\n${r.text}`)
              .join('\n');
            
            const totalOcrText = ocrTexts || '';
            const avgConfidence = ocrResults.length > 0
              ? ocrResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / ocrResults.length
              : 0;
            
            if (totalOcrText.length > text.length) {
              // OCR found more text than native extraction
              text = totalOcrText;
              logger.info('OCR extracted text from scanned PDF successfully', {
                textLength: text.length,
                pagesProcessed: ocrResults.length,
                avgConfidence: avgConfidence.toFixed(2),
                successfulPages: ocrResults.filter(r => r.text && r.text.length > 0).length,
              });
              (metadata as any).ocrUsed = true;
              (metadata as any).ocrConfidence = avgConfidence;
              (metadata as any).ocrPagesProcessed = ocrResults.length;
            } else if (text.length > 0) {
              // Native extraction worked, but combine with OCR if OCR found additional text
              logger.debug('Native PDF extraction sufficient, OCR not needed', {
                nativeTextLength: text.length,
                ocrTextLength: totalOcrText.length,
              });
            }
          }
        } catch (ocrError: any) {
          // OCR failed, but we have native text (if any)
          logger.warn('OCR failed for scanned PDF, using native text only', {
            error: ocrError.message,
            nativeTextLength: text.length,
          });
          // Continue with native text
        }
      }
      
      // Extract and analyze images from PDF (if enabled)
      const enableImageExtraction = process.env.ENABLE_PDF_IMAGE_EXTRACTION !== 'false';
      if (enableImageExtraction) {
        try {
          const extractedImages = await extractImagesFromPDF(file.buffer, {
            maxImages: parseInt(process.env.MAX_PDF_IMAGES || '20', 10),
            minSize: parseInt(process.env.MIN_PDF_IMAGE_SIZE || '5000', 10),
          });
          
          if (extractedImages.length > 0) {
            logger.info(`Found ${extractedImages.length} images in PDF, analyzing...`);
            
            // Analyze each image with Vision API
            const imageAnalyses = await Promise.all(
              extractedImages.map(async (img, index) => {
                try {
                  const mimeType = `image/${img.imageType}`;
                  const analysis = await analyzeImageWithVisionAPI(
                    img.imageBuffer,
                    mimeType,
                    `Analyze this image from page ${img.pageNumber} of a PDF document. Extract any text (OCR), describe charts/graphs/diagrams, and identify visual elements.`,
                    userId
                  );
                  
                  return `\n--- Page ${img.pageNumber} Image ${index + 1} (${img.imageType.toUpperCase()}) ---\n${analysis}`;
                } catch (imgError: any) {
                  logger.warn(`Failed to analyze image ${index + 1} from page ${img.pageNumber}`, {
                    error: imgError.message,
                  });
                  return ''; // Skip failed images
                }
              })
            );
            
            // Combine text + image analyses
            const imageAnalysisText = imageAnalyses.filter(a => a).join('\n');
            if (imageAnalysisText) {
              text += '\n\n--- VISUAL ELEMENTS ANALYSIS ---' + imageAnalysisText;
              (metadata as any).imageCount = extractedImages.length;
            }
          }
        } catch (imageError: any) {
          // Don't fail PDF processing if image extraction fails
          logger.warn('PDF image extraction/analysis failed, continuing with text only', {
            error: imageError.message,
          });
        }
      }
      
      return {
        text,
        metadata,
      };
    } catch (error: any) {
      logger.error('PDF parsing failed', { 
        error: error.message, 
        filePath,
        filename: file.originalname,
        bufferSize: file.buffer.length,
        stack: error.stack,
        errorName: error.name,
        errorType: error.constructor?.name,
        polyfillsLoaded: polyfillsLoaded,
        hasDOMMatrix: typeof globalThis.DOMMatrix !== 'undefined',
        hasDOMPoint: typeof globalThis.DOMPoint !== 'undefined',
        hasImageData: typeof globalThis.ImageData !== 'undefined',
        hasPath2D: typeof globalThis.Path2D !== 'undefined',
        doMMatrixType: typeof globalThis.DOMMatrix,
        // Check if it's a specific error type
        isDOMMatrixError: error.message.includes('DOMMatrix') || error.message.includes('DOMMatrix is not defined'),
        isImportError: error.message.includes('Cannot find module') || error.message.includes('import'),
        isBufferError: error.message.includes('buffer') || error.message.includes('Buffer')
      });
      
      // If it's a DOMMatrix error, try one more time with emergency polyfill
      if (error.message.includes('DOMMatrix') || error.message.includes('DOMMatrix is not defined')) {
        logger.warn('DOMMatrix error detected, installing emergency polyfill and retrying');
        (globalThis as any).DOMMatrix = class {
          constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
            this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; this.m41 = 0; this.m42 = 0;
          }
          a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
          m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
          multiply() { return this; }
          translate() { return this; }
          scale() { return this; }
          rotate() { return this; }
          toString() { return 'matrix(1,0,0,1,0,0)'; }
        };
        
        // Retry once with emergency polyfill
        try {
          logger.info('Retrying PDF parsing with emergency DOMMatrix polyfill');
          const pdfParseModule = await import('pdf-parse');
          const pdfParse = pdfParseModule.default || pdfParseModule;
          const pdfData = await pdfParse(file.buffer);
          const text = pdfData.text || '';
          metadata.pages = pdfData.numpages;
          logger.info('PDF parsing succeeded on retry with emergency polyfill', {
            pages: pdfData.numpages,
            textLength: text.length
          });
          return { text, metadata };
        } catch (retryError: any) {
          logger.error('PDF parsing failed on retry', { 
            error: retryError.message,
            stack: retryError.stack
          });
        }
      }
      
      // Don't throw - return undefined text so file upload can continue
      // This allows the file to be uploaded even if parsing fails
      logger.warn('PDF parsing failed, returning empty text', { 
        filePath,
        filename: file.originalname,
        bufferSize: file.buffer.length,
        errorSummary: error.message.substring(0, 200)
      });
      
      // Try OCR as fallback if native parsing failed
      // Use enableOCRFlag from outer scope
      if (enableOCRFlag && file.mimetype === 'application/pdf') {
        try {
          logger.info('Attempting OCR as fallback after native PDF parsing failed', {
            filename: file.originalname
          });
          
          const { performOCR } = await import('./ocr-service.js');
          const { convertPdfPagesToImages } = await import('./pdf-ocr-helper.js');
          
          // Convert first page to image for OCR
          const maxPagesForOCR = parseInt(process.env.MAX_PDF_PAGES_FOR_OCR || '10', 10);
          const pageImages = await convertPdfPagesToImages(file.buffer, {
            format: 'jpeg',
            density: 200,
            maxPages: Math.min(maxPagesForOCR, 3), // Try first 3 pages as fallback
          });
          
          if (pageImages.length > 0) {
            logger.info(`OCR fallback: Converted ${pageImages.length} pages, performing OCR...`);
            
            const ocrResults = await Promise.all(
              pageImages.map(async (pageImage) => {
                try {
                  const ocrResult = await performOCR(pageImage.imageBuffer, {
                    languageHints: [],
                    enableDocumentTextDetection: true,
                  });
                  return {
                    pageNumber: pageImage.pageNumber,
                    text: ocrResult.text || '',
                    confidence: ocrResult.confidence || 0,
                  };
                } catch (pageOcrError: any) {
                  logger.warn(`OCR failed for page ${pageImage.pageNumber}`, {
                    error: pageOcrError.message,
                  });
                  return { pageNumber: pageImage.pageNumber, text: '', confidence: 0 };
                }
              })
            );
            
            const ocrText = ocrResults
              .filter(r => r.text && r.text.length > 0)
              .map(r => `\n--- Page ${r.pageNumber} ---\n${r.text}`)
              .join('\n');
            
            if (ocrText) {
              logger.info('OCR fallback succeeded', {
                textLength: ocrText.length,
                pagesProcessed: ocrResults.length
              });
              metadata.pages = pageImages.length; // Estimate
              (metadata as any).ocrUsed = true;
              (metadata as any).extractionMethod = 'ocr-fallback';
              return {
                text: ocrText,
                metadata,
              };
            }
          }
        } catch (ocrFallbackError: any) {
          logger.error('OCR fallback also failed', {
            error: ocrFallbackError.message,
            filename: file.originalname,
            stack: ocrFallbackError.stack,
            errorType: ocrFallbackError.constructor?.name,
            // Check if it's a poppler issue
            isPopplerError: ocrFallbackError.message.includes('pdftoppm') || 
                           ocrFallbackError.message.includes('poppler') ||
                           ocrFallbackError.message.includes('spawn'),
            // Check if it's an API key issue
            isAPIKeyError: ocrFallbackError.message.includes('API key') ||
                          ocrFallbackError.message.includes('authentication') ||
                          ocrFallbackError.message.includes('403') ||
                          ocrFallbackError.message.includes('401')
          });
        }
      } else {
        logger.warn('OCR fallback not attempted', {
          filename: file.originalname,
          enableOCR: enableOCRFlag,
          hasGoogleKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
          reason: !enableOCRFlag ? 'OCR disabled' : 'Not a PDF'
        });
      }
      
      // Add error info to metadata so frontend knows why extraction failed
      (metadata as any).extractionError = error.message;
      (metadata as any).extractionFailed = true;
      (metadata as any).ocrAttempted = enableOCRFlag && file.mimetype === 'application/pdf';
      
      return {
        text: undefined,
        metadata,
      };
    }
  }

  // 3. Word documents (.docx)
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return {
        text: result.value,
        metadata,
      };
    } catch (error: any) {
      logger.error('Word document parsing failed', { error: error.message, filePath });
      throw new Error(`Failed to parse Word document: ${error.message}`);
    }
  }

  // 4. Excel/Spreadsheet files
  if (file.mimetype.includes('spreadsheet') || 
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      const sheets: string[] = [];
      
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Format as readable text
        const sheetText = `Sheet: ${sheetName}\n${jsonData.map((row: any) => 
          Array.isArray(row) ? row.join('\t') : JSON.stringify(row)
        ).join('\n')}\n\n`;
        sheets.push(sheetText);
      }
      
      const text = sheets.join('---\n');
      metadata.rowCount = sheets.reduce((sum, s) => sum + s.split('\n').length, 0);
      metadata.columnCount = sheetNames.length;
      
      return {
        text,
        metadata,
      };
    } catch (error: any) {
      logger.error('Excel parsing failed', { error: error.message, filePath });
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  // 5. CSV files
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    try {
      const text = file.buffer.toString('utf-8');
      const lines = text.split('\n');
      metadata.rowCount = lines.length;
      metadata.columnCount = lines[0]?.split(',').length || 0;
      return { text, metadata };
    } catch (error: any) {
      logger.error('CSV parsing failed', { error: error.message, filePath });
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }

  // 6. Images - Use OCR + Vision API for best results
  if (fileType === 'image') {
    try {
      // Try OCR first for better text extraction accuracy
      const enableOCR = process.env.ENABLE_OCR !== 'false';
      let extractedContent = '';
      
      if (enableOCR) {
        try {
          const { performOCR } = await import('./ocr-service.js');
          const ocrResult = await performOCR(file.buffer);
          
          if (ocrResult.text && ocrResult.text.length > 0) {
            extractedContent = ocrResult.text;
            logger.info('Image OCR completed', {
              textLength: extractedContent.length,
              confidence: ocrResult.confidence?.toFixed(2),
              language: ocrResult.language || 'auto',
            });
            (metadata as any).ocrUsed = true;
            (metadata as any).ocrConfidence = ocrResult.confidence;
          }
        } catch (ocrError: any) {
          // Log OCR failure with more detail
          logger.warn('OCR failed for image, falling back to Vision API', {
            error: ocrError.message,
            hasGoogleKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
            enableOCR,
          });
          // Continue to try OpenAI Vision API as fallback
        }
      }
      
      // Use OpenAI Vision API for complex analysis (charts, diagrams, context)
      // This complements OCR with understanding, or serves as fallback if OCR fails
      try {
        const visionAnalysis = await analyzeImageWithVisionAPI(
          file.buffer,
          file.mimetype,
          extractedContent 
            ? 'Analyze this image. Describe charts/graphs/diagrams, tables, and identify visual elements. Provide comprehensive analysis. (Text already extracted via OCR)'
            : 'Analyze this image. Extract all text (OCR), describe charts/graphs/diagrams, tables, and identify visual elements. Provide comprehensive analysis.',
          userId
        );
        
        // Combine OCR text with Vision API analysis
        if (extractedContent) {
          extractedContent = `${extractedContent}\n\n--- AI Vision Analysis ---\n${visionAnalysis}`;
        } else {
          extractedContent = visionAnalysis;
        }
      } catch (visionError: any) {
        // If Vision API fails but we have OCR text, use that
        if (extractedContent) {
          logger.warn('Vision API failed, using OCR text only', {
            error: visionError.message,
            ocrTextLength: extractedContent.length,
          });
          // Continue with OCR text
        } else {
          // No OCR text and Vision API failed - log detailed error
          logger.error('Both OCR and Vision API failed for image', {
            ocrError: 'OCR failed or not configured',
            visionError: visionError.message,
            hasGoogleKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            enableOCR,
          });
          throw new Error(`Image processing failed: ${visionError.message}. Please configure GOOGLE_CLOUD_VISION_API_KEY for OCR or ensure OPENAI_API_KEY is valid.`);
        }
      }

      // Try to get image dimensions if possible (basic check)
      // Note: This is a simplified check - for accurate dimensions, you'd need an image library
      metadata.dimensions = { width: 0, height: 0 }; // Placeholder

      return {
        text: extractedContent,
        metadata,
      };
    } catch (error: any) {
      logger.error('Image analysis failed', { error: error.message, filePath });
      // Don't throw - return undefined text but keep metadata
      return { text: undefined, metadata };
    }
  }

  // 7. XML files
  if (file.mimetype === 'application/xml' || file.mimetype === 'text/xml' || file.originalname.endsWith('.xml')) {
    try {
      const text = file.buffer.toString('utf-8');
      return { text, metadata };
    } catch (error: any) {
      logger.error('XML parsing failed', { error: error.message, filePath });
      return { text: undefined, metadata };
    }
  }

  // Unsupported file type
  return { text: undefined, metadata };
}

/**
 * Clean up old files (can be called by cron job)
 */
export async function cleanupOldFiles(maxAgeDays: number = 7): Promise<number> {
  const uploadsDir = path.join(__dirname, '../../../uploads');
  let deletedCount = 0;

  try {
    const users = await fs.readdir(uploadsDir);
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const user of users) {
      const userDir = path.join(uploadsDir, user);
      const files = await fs.readdir(userDir);

      for (const file of files) {
        const filePath = path.join(userDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
    }
  } catch (error: any) {
    logger.error('Cleanup error', error);
  }

  return deletedCount;
}

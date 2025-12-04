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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('file-processor');

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
  
  // Extract text and metadata
  let extractedText: string | undefined;
  let metadata: ProcessedFile['metadata'] = { type: fileType };
  
  try {
    const extractionResult = await extractTextAndMetadata(file, storedPath, fileType);
    extractedText = extractionResult.text;
    metadata = { ...metadata, ...extractionResult.metadata };
    
    if (extractedText) {
      logger.info('Text extracted successfully', { 
        fileId, 
        textLength: extractedText.length,
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
    }
  } catch (error: any) {
    logger.warn('Text extraction failed', { error: error.message, fileId });
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
  fileType: string
): Promise<{ text?: string; metadata: ProcessedFile['metadata'] }> {
  const metadata: ProcessedFile['metadata'] = { type: fileType as any };

  // 1. Plain text files
  if (file.mimetype.includes('text/') || file.mimetype === 'application/json') {
    const text = file.buffer.toString('utf-8');
    return { text, metadata };
  }

  // 2. PDF files
  if (file.mimetype === 'application/pdf') {
    try {
      // Dynamic import for CommonJS module (pdf-parse doesn't have default export)
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const pdfData = await pdfParse(file.buffer);
      metadata.pages = pdfData.numpages;
      return {
        text: pdfData.text,
        metadata,
      };
    } catch (error: any) {
      logger.error('PDF parsing failed', { error: error.message, filePath });
      throw new Error(`Failed to parse PDF: ${error.message}`);
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

  // 6. Images - Use OpenAI Vision API
  if (fileType === 'image') {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        logger.warn('OpenAI API key not set, skipping image analysis');
        return { text: undefined, metadata };
      }

      // Convert image to base64
      const base64Image = file.buffer.toString('base64');
      const dataUrl = `data:${file.mimetype};base64,${base64Image}`;

      // Call OpenAI Vision API
      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o', // or 'gpt-4-vision-preview'
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text from this image. If there are tables, format them clearly. Describe any charts, graphs, or visual elements. Provide a comprehensive analysis of the document content.',
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
        throw new Error(errorData.error?.message || 'OpenAI Vision API error');
      }

      const visionData = await visionResponse.json();
      const extractedContent = visionData.choices[0]?.message?.content || '';

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

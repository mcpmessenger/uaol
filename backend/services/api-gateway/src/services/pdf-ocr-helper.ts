/**
 * PDF OCR Helper - Converts PDF pages to images for OCR processing
 * 
 * This module handles the conversion of PDF pages to images, which is required
 * for OCR processing of scanned PDFs. The images can then be sent to OCR services
 * like Google Cloud Vision API or OpenAI Vision API.
 * 
 * Based on recommendations from Document Intelligence Upgrade.md
 */

import { createLogger } from '@uaol/shared/logger';
import { Buffer } from 'buffer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const logger = createLogger('pdf-ocr-helper');

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  format: 'jpeg' | 'png';
}

/**
 * Convert a PDF page to an image buffer
 * Uses pdf2pic library which wraps poppler-utils
 * 
 * @param pdfBuffer - The PDF file as a Buffer
 * @param pageNumber - Page number to convert (1-indexed)
 * @param options - Conversion options
 * @returns Image buffer or undefined if conversion fails
 */
export async function convertPdfPageToImage(
  pdfBuffer: Buffer,
  pageNumber: number,
  options: {
    format?: 'jpeg' | 'png';
    density?: number; // DPI for image quality (default: 200)
    quality?: number; // JPEG quality 1-100 (default: 90)
  } = {}
): Promise<Buffer | undefined> {
  const { format = 'jpeg', density = 200, quality = 90 } = options;
  
  let tempPdfPath: string | undefined;
  let tempImagePath: string | undefined;
  
  try {
    // Check if pdf2pic is available
    let pdf2pic: any;
    try {
      pdf2pic = await import('pdf2pic');
    } catch (importError: any) {
      logger.error('pdf2pic not installed. Install with: npm install pdf2pic', {
        error: importError.message,
      });
      throw new Error('PDF-to-image conversion requires pdf2pic package. Install with: npm install pdf2pic');
    }

    // Create temporary directory for processing
    const tempDir = path.join(os.tmpdir(), `pdf-ocr-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // 1. Write PDF buffer to temporary file
    tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    await fs.writeFile(tempPdfPath, pdfBuffer);
    
    logger.debug('Converting PDF page to image', {
      pageNumber,
      format,
      density,
      tempPdfPath,
    });

    // 2. Configure pdf2pic converter
    const converter = pdf2pic.fromPath(tempPdfPath, {
      density: density,
      saveFilename: `page_${pageNumber}`,
      savePath: tempDir,
      format: format,
      width: 2000, // Max width (maintains aspect ratio)
      height: 2000, // Max height (maintains aspect ratio)
    });

    // 3. Convert the specific page to an image
    const result = await converter(pageNumber, { responseType: 'buffer' });
    
    if (!result || !result.buffer) {
      logger.warn('PDF page conversion returned no image buffer', {
        pageNumber,
        result: result ? 'result exists but no buffer' : 'no result',
      });
      return undefined;
    }

    // 4. Return the image buffer
    const imageBuffer = Buffer.from(result.buffer);
    
    logger.info('PDF page converted to image successfully', {
      pageNumber,
      format,
      imageSize: imageBuffer.length,
      density,
    });

    return imageBuffer;

  } catch (error: any) {
    logger.error('PDF to image conversion failed', {
      error: error.message,
      stack: error.stack,
      pageNumber,
      format,
    });
    return undefined;
  } finally {
    // 5. Clean up temporary files
    try {
      if (tempPdfPath) {
        await fs.unlink(tempPdfPath).catch(() => {});
      }
      if (tempImagePath) {
        await fs.unlink(tempImagePath).catch(() => {});
      }
      // Clean up temp directory
      if (tempPdfPath) {
        const tempDir = path.dirname(tempPdfPath);
        await fs.rmdir(tempDir, { recursive: true }).catch(() => {});
      }
    } catch (cleanupError: any) {
      logger.warn('Failed to clean up temporary files', {
        error: cleanupError.message,
      });
    }
  }
}

/**
 * Convert all pages of a PDF to images
 * 
 * @param pdfBuffer - The PDF file as a Buffer
 * @param options - Conversion options
 * @returns Array of page images
 */
export async function convertPdfPagesToImages(
  pdfBuffer: Buffer,
  options: {
    format?: 'jpeg' | 'png';
    density?: number;
    quality?: number;
    maxPages?: number; // Limit number of pages to convert
  } = {}
): Promise<PDFPageImage[]> {
  const { maxPages = 50 } = options; // Default max 50 pages
  
  try {
    // First, get the page count using pdf-parse
    // pdf-parse exports PDFParse as a CLASS that requires 'new'
    // Error: "Class constructor PDFParse cannot be invoked without 'new'"
    await ensurePolyfillsLoaded();
    const pdfParseModule = await import('pdf-parse');
    
    // PDFParse is a class - we need to wrap it to use 'new'
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
      // If it's still not a function, log detailed info
      const moduleKeys = Object.keys(pdfParseModule);
      logger.error('pdf-parse import structure', {
        keys: moduleKeys,
        hasDefault: !!pdfParseModule.default,
        defaultType: typeof pdfParseModule.default,
        hasPDFParse: !!pdfParseModule.PDFParse,
        PDFParseType: typeof pdfParseModule.PDFParse,
        moduleType: typeof pdfParseModule
      });
      const moduleKeys = Object.keys(pdfParseModule);
      logger.error('pdf-parse import structure', {
        keys: moduleKeys,
        hasDefault: !!pdfParseModule.default,
        defaultType: typeof pdfParseModule.default,
        hasPDFParse: !!pdfParseModule.PDFParse,
        PDFParseType: typeof pdfParseModule.PDFParse,
        moduleType: typeof pdfParseModule,
        pdfParseType: typeof pdfParse
      });
      
      // Try using createRequire for CommonJS fallback in ESM context
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfParseRequire = require('pdf-parse');
        // CommonJS might export differently
        const pdfParseCJS = pdfParseRequire.PDFParse || pdfParseRequire.default || pdfParseRequire;
        if (typeof pdfParseCJS !== 'function') {
          throw new Error(`CommonJS pdf-parse also not a function: ${typeof pdfParseCJS}`);
        }
        const pdfData = await pdfParseCJS(pdfBuffer);
        const totalPages = pdfData.numpages || 1;
        
        const pagesToConvert = Math.min(totalPages, maxPages);
        
        logger.info('Converting PDF pages to images (using require fallback)', {
          totalPages,
          pagesToConvert,
          maxPages,
        });

        // Convert each page
        const pageImages: PDFPageImage[] = [];
        
        for (let pageNum = 1; pageNum <= pagesToConvert; pageNum++) {
          try {
            const imageBuffer = await convertPdfPageToImage(pdfBuffer, pageNum, options);
            
            if (imageBuffer) {
              pageImages.push({
                pageNumber: pageNum,
                imageBuffer,
                format: options.format || 'jpeg',
              });
            } else {
              logger.warn(`Failed to convert page ${pageNum} to image`);
            }
          } catch (pageError: any) {
            logger.warn(`Error converting page ${pageNum}`, {
              error: pageError.message,
              pageNum,
            });
          }
        }

        logger.info('PDF pages converted to images', {
          totalPages,
          convertedPages: pageImages.length,
          failedPages: pagesToConvert - pageImages.length,
        });

        return pageImages;
      } catch (requireError: any) {
        logger.error('Both import and require failed for pdf-parse', {
          importError: `expected function, got ${typeof pdfParse}`,
          requireError: requireError.message
        });
        throw new Error(`pdf-parse import failed: expected function, got ${typeof pdfParse}. Module keys: ${moduleKeys.join(', ')}`);
      }
    }
    
    const pdfData = await pdfParseFn(pdfBuffer);
    const totalPages = pdfData.numpages || 1;
    
    const pagesToConvert = Math.min(totalPages, maxPages);
    
    logger.info('Converting PDF pages to images', {
      totalPages,
      pagesToConvert,
      maxPages,
    });

    // Convert each page
    const pageImages: PDFPageImage[] = [];
    
    for (let pageNum = 1; pageNum <= pagesToConvert; pageNum++) {
      try {
        const imageBuffer = await convertPdfPageToImage(pdfBuffer, pageNum, options);
        
        if (imageBuffer) {
          pageImages.push({
            pageNumber: pageNum,
            imageBuffer,
            format: options.format || 'jpeg',
          });
        } else {
          logger.warn(`Failed to convert page ${pageNum} to image`);
        }
      } catch (pageError: any) {
        logger.warn(`Error converting page ${pageNum}`, {
          error: pageError.message,
          pageNum,
        });
        // Continue with next page
      }
    }

    logger.info('PDF pages converted to images', {
      totalPages,
      convertedPages: pageImages.length,
      failedPages: pagesToConvert - pageImages.length,
    });

    return pageImages;

  } catch (error: any) {
    logger.error('Failed to convert PDF pages to images', {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

/**
 * Ensure polyfills are loaded (for pdf-parse)
 */
let polyfillsLoaded = false;
async function ensurePolyfillsLoaded() {
  if (polyfillsLoaded) return;
  
  try {
    if (typeof globalThis.DOMMatrix === 'undefined') {
      const dommatrixModule = await import('@thednp/dommatrix');
      // Use default export (CSSMatrix) as DOMMatrix - they're compatible
      const DOMMatrixClass = dommatrixModule.DOMMatrix || 
                            dommatrixModule.default || 
                            dommatrixModule.CSSMatrix;
      const DOMPointClass = dommatrixModule.DOMPoint || 
                           (dommatrixModule.default as any)?.DOMPoint;
      
      if (DOMMatrixClass && typeof DOMMatrixClass === 'function') {
        globalThis.DOMMatrix = DOMMatrixClass;
        if (DOMPointClass && typeof DOMPointClass === 'function') {
          globalThis.DOMPoint = DOMPointClass;
        }
      }
    }
    
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
    
    if (typeof globalThis.Path2D === 'undefined') {
      globalThis.Path2D = class Path2D {} as any;
    }
    
    polyfillsLoaded = true;
  } catch (error: any) {
    logger.warn('Could not load polyfills', { error: error.message });
  }
}

/**
 * OCR Service - Google Cloud Vision API Integration
 * Provides high-accuracy OCR for scanned documents, images, and PDFs
 */

import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('ocr-service');

export interface OCRResult {
  text: string;
  confidence?: number;
  language?: string;
  fullTextAnnotation?: any;
}

export interface OCROptions {
  languageHints?: string[];
  enableTableDetection?: boolean;
  enableDocumentTextDetection?: boolean;
}

/**
 * Perform OCR on an image buffer using Google Cloud Vision API
 * Uses REST API for simplicity and API key authentication
 */
export async function performOCR(
  imageBuffer: Buffer,
  options: OCROptions = {}
): Promise<OCRResult> {
  const { languageHints = [], enableDocumentTextDetection = true } = options;

  try {
    // Get API key from environment
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_CLOUD_VISION_API_KEY not configured. Please set it in your .env file. Get your key from: https://console.cloud.google.com/apis/credentials');
    }

    // Prepare image as base64
    const base64Image = imageBuffer.toString('base64');

    // Build request body
    const requestBody: any = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: enableDocumentTextDetection ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };

    // Add language hints if provided
    if (languageHints.length > 0) {
      requestBody.requests[0].imageContext = {
        languageHints: languageHints,
      };
    }

    // Perform OCR via REST API
    logger.debug('Calling Google Cloud Vision API for OCR', {
      imageSize: imageBuffer.length,
      languageHints: languageHints.length > 0 ? languageHints : 'auto-detect',
      featureType: enableDocumentTextDetection ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION',
    });

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      if (errorMessage.includes('API key')) {
        throw new Error('Invalid Google Cloud Vision API key. Please verify GOOGLE_CLOUD_VISION_API_KEY in your .env file.');
      }
      if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
        throw new Error('Google Cloud Vision API quota exceeded or billing not enabled. Please check your Google Cloud account.');
      }
      
      throw new Error(`Google Cloud Vision API error: ${errorMessage}`);
    }

    const result = await response.json();
    const annotationResult = result.responses?.[0];
    
    if (!annotationResult) {
      logger.warn('No annotation result from Google Vision API');
      return {
        text: '',
        confidence: 0,
      };
    }
    
    // Check for errors in response
    if (annotationResult.error) {
      throw new Error(`Google Vision API error: ${annotationResult.error.message || 'Unknown error'}`);
    }
    
    // Extract text from response
    let extractedText = '';
    let confidence = 0;
    let detectedLanguage = '';

    // Prefer DOCUMENT_TEXT_DETECTION (better for documents)
    if (annotationResult.fullTextAnnotation) {
      extractedText = annotationResult.fullTextAnnotation.text || '';
      confidence = annotationResult.fullTextAnnotation.pages?.[0]?.confidence || 0;
      detectedLanguage = annotationResult.fullTextAnnotation.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || '';
      
      logger.info('OCR completed with DOCUMENT_TEXT_DETECTION', {
        textLength: extractedText.length,
        confidence: confidence.toFixed(2),
        language: detectedLanguage || 'auto-detected',
      });
    } 
    // Fallback to TEXT_DETECTION
    else if (annotationResult.textAnnotations && annotationResult.textAnnotations.length > 0) {
      // First annotation is the full text
      extractedText = annotationResult.textAnnotations[0].description || '';
      
      // Calculate average confidence from individual text annotations
      if (annotationResult.textAnnotations.length > 1) {
        const confidences = annotationResult.textAnnotations
          .slice(1)
          .map((ann: any) => ann.confidence || 0)
          .filter((c: number) => c > 0);
        confidence = confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0;
      }
      
      logger.info('OCR completed with TEXT_DETECTION', {
        textLength: extractedText.length,
        confidence: confidence.toFixed(2),
      });
    }

    if (!extractedText) {
      logger.warn('No text detected in image');
      return {
        text: '',
        confidence: 0,
      };
    }

    return {
      text: extractedText,
      confidence,
      language: detectedLanguage,
      fullTextAnnotation: annotationResult.fullTextAnnotation,
    };

  } catch (error: any) {
    logger.error('Google Cloud Vision API OCR failed', {
      error: error.message,
      stack: error.stack,
    });

    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      throw new Error('Google Cloud Vision API key is invalid or not configured. Please check GOOGLE_CLOUD_VISION_API_KEY in your .env file.');
    }

    if (error.message?.includes('quota') || error.message?.includes('billing')) {
      throw new Error('Google Cloud Vision API quota exceeded or billing not enabled. Please check your Google Cloud account.');
    }

    throw new Error(`OCR failed: ${error.message}`);
  }
}

// Note: PDF detection and page-to-image conversion are handled in file-processor.ts
// This service focuses on OCR functionality only

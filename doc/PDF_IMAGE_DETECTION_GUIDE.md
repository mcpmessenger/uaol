# PDF Image Detection & Extraction Guide

## How PDFs Store Images

PDFs store images in two main ways:

1. **Embedded Images**: Actual image files (JPEG, PNG) embedded in the PDF
2. **Rendered Content**: Vector graphics, charts drawn with PDF drawing commands

For our use case, we want to extract **embedded images** (charts, diagrams, photos) that are actual image files.

## Method 1: Using `pdfjs-dist` (Mozilla PDF.js) - Recommended ✅

**Why**: Most reliable, actively maintained, works in Node.js

### How It Works

1. **Parse PDF structure**: Load PDF and access its internal structure
2. **Iterate through pages**: Check each page for image objects
3. **Extract image streams**: Get raw image data from PDF's XObject resources
4. **Convert to Buffer**: Convert to a format Vision API can process

### Implementation

```typescript
import * as pdfjsLib from 'pdfjs-dist';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('pdf-image-extractor');

interface ExtractedImage {
  pageNumber: number;
  imageBuffer: Buffer;
  imageType: string; // 'jpeg', 'png', etc.
  width: number;
  height: number;
}

/**
 * Extract all embedded images from a PDF
 */
export async function extractImagesFromPDF(
  pdfBuffer: Buffer
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  
  try {
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      verbosity: 0, // Suppress console warnings
    });
    
    const pdfDocument = await loadingTask.promise;
    logger.info(`PDF loaded: ${pdfDocument.numPages} pages`);
    
    // Iterate through each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      
      // Get page's operator list (contains all drawing operations)
      const operatorList = await page.getOperatorList();
      
      // Extract images from this page
      const pageImages = await extractImagesFromPage(page, pageNum, operatorList);
      images.push(...pageImages);
      
      logger.info(`Page ${pageNum}: Found ${pageImages.length} images`);
    }
    
    logger.info(`Total images extracted: ${images.length}`);
    return images;
    
  } catch (error: any) {
    logger.error('Failed to extract images from PDF', { error: error.message });
    throw error;
  }
}

/**
 * Extract images from a single PDF page
 */
async function extractImagesFromPage(
  page: any,
  pageNumber: number,
  operatorList: any
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  const imageNames = new Set<string>();
  
  // Find all image references in the operator list
  // Images are referenced via 'Do' operator with XObject names
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const op = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];
    
    // 'Do' operator draws an XObject (which can be an image)
    if (op === pdfjsLib.OPS.paintXObject) {
      const xObjectName = args[0];
      imageNames.add(xObjectName);
    }
  }
  
  // Get the actual image data for each referenced image
  for (const imageName of imageNames) {
    try {
      const xObject = await page.objs.get(imageName);
      
      // Check if it's actually an image (not a form or other XObject)
      if (xObject && xObject.data) {
        const imageData = xObject.data;
        
        // Determine image type from the data
        const imageType = detectImageType(imageData);
        
        if (imageType) {
          // Convert to Buffer
          const imageBuffer = Buffer.from(imageData);
          
          images.push({
            pageNumber,
            imageBuffer,
            imageType,
            width: xObject.width || 0,
            height: xObject.height || 0,
          });
        }
      }
    } catch (error: any) {
      // Some XObjects might not be images, skip them
      logger.debug(`Skipping non-image XObject: ${imageName}`, { error: error.message });
    }
  }
  
  return images;
}

/**
 * Detect image type from raw data
 */
function detectImageType(data: Uint8Array): string | null {
  // Check for JPEG signature: FF D8 FF
  if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
    return 'jpeg';
  }
  
  // Check for PNG signature: 89 50 4E 47
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
    return 'png';
  }
  
  // Check for GIF signature: GIF
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return 'gif';
  }
  
  return null; // Unknown or not an image
}
```

## Method 2: Using `pdf-lib` - Alternative Approach

**Why**: Simpler API, but less control

```typescript
import { PDFDocument } from 'pdf-lib';

async function extractImagesWithPdfLib(pdfBuffer: Buffer): Promise<Buffer[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const images: Buffer[] = [];
  
  const pages = pdfDoc.getPages();
  
  for (const page of pages) {
    // Access page resources
    const resources = page.node.Resources();
    
    if (resources && resources.XObject) {
      const xObjects = resources.XObject();
      
      // Iterate through XObjects
      for (const [name, xObject] of Object.entries(xObjects)) {
        // Check if it's an image
        if (xObject && (xObject as any).Subtype?.name === 'Image') {
          // Get image data
          const imageBytes = await (xObject as any).getContents();
          images.push(Buffer.from(imageBytes));
        }
      }
    }
  }
  
  return images;
}
```

## Method 3: Convert Pages to Images (For Scanned PDFs)

**When to use**: For scanned PDFs or when you want to analyze entire pages

```typescript
import { fromBuffer } from 'pdf2pic';
import sharp from 'sharp';

async function convertPDFPagesToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  const options = {
    density: 200,        // DPI for conversion
    saveFilename: 'page',
    savePath: './temp',  // Temporary directory
    format: 'png',
    width: 2000,
    height: 2000,
  };
  
  const converter = fromBuffer(pdfBuffer, options);
  const pageImages: Buffer[] = [];
  
  // Convert each page (you'd need to know page count)
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const result = await converter(pageNum, { responseType: 'buffer' });
    pageImages.push(result.buffer);
  }
  
  return pageImages;
}
```

## Recommended Implementation for UAOL

### Step 1: Add Dependencies

```bash
cd backend/services/api-gateway
npm install pdfjs-dist
npm install --save-dev @types/pdfjs-dist
```

### Step 2: Create Image Extractor Module

Create `backend/services/api-gateway/src/services/pdf-image-extractor.ts`:

```typescript
import * as pdfjsLib from 'pdfjs-dist';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('pdf-image-extractor');

export interface ExtractedPDFImage {
  pageNumber: number;
  imageBuffer: Buffer;
  imageType: 'jpeg' | 'png' | 'gif' | 'unknown';
  width: number;
  height: number;
  hash?: string; // For duplicate detection
}

/**
 * Extract embedded images from PDF buffer
 */
export async function extractImagesFromPDF(
  pdfBuffer: Buffer,
  options?: {
    maxImages?: number;
    minSize?: number; // Minimum image size in bytes
    skipDuplicates?: boolean;
  }
): Promise<ExtractedPDFImage[]> {
  const {
    maxImages = 50,
    minSize = 1000, // Skip very small images (likely icons/logos)
    skipDuplicates = true,
  } = options || {};
  
  const images: ExtractedPDFImage[] = [];
  const seenHashes = new Set<string>();
  
  try {
    // Configure pdfjs worker (required for Node.js)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      verbosity: 0,
    });
    
    const pdfDocument = await loadingTask.promise;
    logger.info(`Extracting images from PDF with ${pdfDocument.numPages} pages`);
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages && images.length < maxImages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const operatorList = await page.getOperatorList();
      
      // Find image XObject names
      const imageNames = new Set<string>();
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        if (operatorList.fnArray[i] === pdfjsLib.OPS.paintXObject) {
          imageNames.add(operatorList.argsArray[i][0]);
        }
      }
      
      // Extract each image
      for (const imageName of imageNames) {
        if (images.length >= maxImages) break;
        
        try {
          const xObject = await page.objs.get(imageName);
          
          if (!xObject || !xObject.data) continue;
          
          const imageData = xObject.data;
          if (imageData.length < minSize) continue; // Skip small images
          
          const imageType = detectImageType(imageData);
          if (!imageType || imageType === 'unknown') continue;
          
          const imageBuffer = Buffer.from(imageData);
          
          // Check for duplicates (optional)
          if (skipDuplicates) {
            const hash = await hashBuffer(imageBuffer);
            if (seenHashes.has(hash)) {
              logger.debug(`Skipping duplicate image on page ${pageNum}`);
              continue;
            }
            seenHashes.add(hash);
          }
          
          images.push({
            pageNumber: pageNum,
            imageBuffer,
            imageType: imageType as 'jpeg' | 'png' | 'gif',
            width: xObject.width || 0,
            height: xObject.height || 0,
            hash: skipDuplicates ? await hashBuffer(imageBuffer) : undefined,
          });
          
          logger.debug(`Extracted ${imageType.toUpperCase()} image from page ${pageNum} (${imageBuffer.length} bytes)`);
        } catch (error: any) {
          logger.debug(`Failed to extract image ${imageName} from page ${pageNum}`, {
            error: error.message,
          });
        }
      }
    }
    
    logger.info(`Extracted ${images.length} images from PDF`);
    return images;
    
  } catch (error: any) {
    logger.error('Failed to extract images from PDF', { error: error.message });
    throw new Error(`PDF image extraction failed: ${error.message}`);
  }
}

function detectImageType(data: Uint8Array): 'jpeg' | 'png' | 'gif' | 'unknown' {
  // JPEG: FF D8 FF
  if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
    return 'jpeg';
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
    return 'png';
  }
  
  // GIF: GIF87a or GIF89a
  if (
    (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) &&
    (data[4] === 0x37 || data[4] === 0x39) && data[5] === 0x61
  ) {
    return 'gif';
  }
  
  return 'unknown';
}

/**
 * Simple hash for duplicate detection (using crypto)
 */
async function hashBuffer(buffer: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('md5').update(buffer).digest('hex');
}
```

### Step 3: Integrate with File Processor

Update `file-processor.ts`:

```typescript
import { extractImagesFromPDF } from './pdf-image-extractor';

// In extractTextAndMetadata function, for PDFs:
if (file.mimetype === 'application/pdf') {
  // 1. Extract text (existing)
  const pdfData = await pdfParse(file.buffer);
  const text = pdfData.text;
  
  // 2. Extract images (NEW)
  let imageAnalyses: string[] = [];
  try {
    const extractedImages = await extractImagesFromPDF(file.buffer, {
      maxImages: 20,
      minSize: 5000, // Only analyze images > 5KB (skip small icons)
      skipDuplicates: true,
    });
    
    if (extractedImages.length > 0) {
      logger.info(`Found ${extractedImages.length} images in PDF`);
      
      // Analyze each image with Vision API
      imageAnalyses = await Promise.all(
        extractedImages.map(async (img, index) => {
          const analysis = await analyzeImageWithVisionAPI(img.imageBuffer, {
            prompt: `Analyze this image from page ${img.pageNumber} of a PDF document. Extract any text (OCR), describe charts/graphs/diagrams, and identify visual elements.`,
          });
          return `--- Page ${img.pageNumber} Image ${index + 1} (${img.imageType.toUpperCase()}) ---\n${analysis}`;
        })
      );
    }
  } catch (imageError: any) {
    logger.warn('PDF image extraction failed, continuing with text only', {
      error: imageError.message,
    });
  }
  
  // 3. Combine text + image analyses
  const combinedText = imageAnalyses.length > 0
    ? `${text}\n\n--- VISUAL ELEMENTS ANALYSIS ---\n${imageAnalyses.join('\n\n')}`
    : text;
  
  return {
    text: combinedText,
    metadata: {
      ...metadata,
      pages: pdfData.numpages,
      imageCount: extractedImages?.length || 0,
    },
  };
}
```

## How Detection Works (Technical Details)

### PDF Internal Structure

PDFs store images as:
1. **XObject Resources**: Images are stored as "XObject" resources in the PDF's resource dictionary
2. **Page Content Stream**: Pages reference images via "Do" operators in their content stream
3. **Image Data**: Raw image bytes (JPEG, PNG) embedded in the PDF

### Detection Process

1. **Parse PDF**: Load PDF structure using pdfjs-dist
2. **Get Operator List**: Each page has an operator list (drawing commands)
3. **Find "Do" Operators**: These reference XObjects (including images)
4. **Resolve XObjects**: Get the actual image data from the resource dictionary
5. **Validate**: Check if it's actually image data (not a form or other object)
6. **Extract**: Convert to Buffer for processing

### Example PDF Structure

```
PDF Document
├── Page 1
│   ├── Content Stream: "Do /Im1" (draws image named Im1)
│   └── Resources
│       └── XObject
│           └── Im1 → [JPEG image data]
├── Page 2
│   ├── Content Stream: "Do /Im2" "Do /Im3"
│   └── Resources
│       └── XObject
│           ├── Im2 → [PNG image data]
│           └── Im3 → [JPEG image data]
```

## Challenges & Solutions

### Challenge 1: Small Images (Icons, Logos)
**Solution**: Filter by minimum size (e.g., skip images < 5KB)

### Challenge 2: Duplicate Images
**Solution**: Hash images and skip duplicates (same logo on every page)

### Challenge 3: Non-Image XObjects
**Solution**: Check image type signature (JPEG/PNG headers)

### Challenge 4: Performance
**Solution**: 
- Limit max images per PDF (e.g., 20)
- Process in parallel
- Cache results

## Testing

Test with PDFs containing:
- ✅ Charts and graphs
- ✅ Diagrams and flowcharts  
- ✅ Embedded photos
- ✅ Tables with visual formatting
- ✅ Mixed text + images

## Next Steps

1. Install `pdfjs-dist`
2. Create image extractor module
3. Integrate with file processor
4. Test with sample PDFs
5. Add configuration options

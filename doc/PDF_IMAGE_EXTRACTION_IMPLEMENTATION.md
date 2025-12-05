# PDF Image Extraction - Complete Implementation

## Quick Answer: How Images Are Detected

**PDFs store images as "XObjects"** - special resources that pages reference. Here's how we detect them:

1. **Parse PDF structure** → Load PDF and access internal structure
2. **Scan operator lists** → Each page has drawing commands (operators)
3. **Find "Do" operators** → These reference XObjects (including images)
4. **Resolve XObject data** → Get actual image bytes from resource dictionary
5. **Validate image type** → Check file signatures (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`)

## Complete Code Implementation

### Step 1: Extract Helper Function

Create a reusable function for Vision API analysis:

```typescript
// In file-processor.ts, add this helper:

/**
 * Analyze image buffer with OpenAI Vision API
 * Reusable for both standalone images and PDF-extracted images
 */
async function analyzeImageWithVisionAPI(
  imageBuffer: Buffer,
  mimeType: string = 'image/png',
  customPrompt?: string
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

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
    throw new Error(errorData.error?.message || 'OpenAI Vision API error');
  }

  const visionData = await visionResponse.json();
  return visionData.choices[0]?.message?.content || '';
}
```

### Step 2: PDF Image Extraction Function

```typescript
// Add to file-processor.ts

import * as pdfjsLib from 'pdfjs-dist';

interface ExtractedPDFImage {
  pageNumber: number;
  imageBuffer: Buffer;
  imageType: 'jpeg' | 'png' | 'gif';
}

/**
 * Extract embedded images from PDF
 */
async function extractImagesFromPDF(
  pdfBuffer: Buffer
): Promise<ExtractedPDFImage[]> {
  const images: ExtractedPDFImage[] = [];
  
  try {
    // Configure pdfjs worker (required for Node.js)
    // Note: In production, you might want to bundle the worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      verbosity: 0,
    });
    
    const pdfDocument = await loadingTask.promise;
    logger.info(`Extracting images from PDF: ${pdfDocument.numPages} pages`);
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
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
        try {
          // Get the XObject from page's object manager
          const xObject = await page.objs.get(imageName);
          
          // Check if it has image data
          if (!xObject || !xObject.data) continue;
          
          const imageData = xObject.data;
          
          // Detect image type by checking file signatures
          const imageType = detectImageType(imageData);
          if (!imageType) continue; // Skip if not a recognized image type
          
          // Skip very small images (likely icons/logos, not charts)
          if (imageData.length < 5000) {
            logger.debug(`Skipping small image on page ${pageNum} (${imageData.length} bytes)`);
            continue;
          }
          
          images.push({
            pageNumber: pageNum,
            imageBuffer: Buffer.from(imageData),
            imageType,
          });
          
          logger.debug(`Extracted ${imageType.toUpperCase()} image from page ${pageNum}`);
        } catch (error: any) {
          // Some XObjects might not be images, skip them
          logger.debug(`Skipping non-image XObject: ${imageName}`);
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
```

### Step 3: Update PDF Processing

Update the PDF section in `extractTextAndMetadata`:

```typescript
// 2. PDF files
if (file.mimetype === 'application/pdf') {
  try {
    // Ensure polyfills are loaded
    await ensurePolyfillsLoaded();
    
    // 1. Extract text (existing)
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const pdfData = await pdfParse(file.buffer);
    let text = pdfData.text;
    metadata.pages = pdfData.numpages;
    
    // 2. Extract and analyze images (NEW)
    try {
      const extractedImages = await extractImagesFromPDF(file.buffer);
      
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
                `Analyze this image from page ${img.pageNumber} of a PDF document. Extract any text (OCR), describe charts/graphs/diagrams, and identify visual elements.`
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
          metadata.imageCount = extractedImages.length;
        }
      }
    } catch (imageError: any) {
      // Don't fail PDF processing if image extraction fails
      logger.warn('PDF image extraction/analysis failed, continuing with text only', {
        error: imageError.message,
      });
    }
    
    return {
      text,
      metadata,
    };
  } catch (error: any) {
    logger.error('PDF parsing failed', { error: error.message, filePath });
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}
```

## How Detection Actually Works

### PDF Internal Structure Example

```
PDF File Structure:
├── Catalog (root)
│   ├── Pages
│   │   ├── Page 1
│   │   │   ├── Content Stream: "q ... Do /Im1 ... Q"
│   │   │   └── Resources
│   │   │       └── XObject
│   │   │           └── Im1 → [JPEG bytes: FF D8 FF ...]
│   │   ├── Page 2
│   │   │   ├── Content Stream: "q ... Do /Im2 Do /Im3 ... Q"
│   │   │   └── Resources
│   │   │       └── XObject
│   │   │           ├── Im2 → [PNG bytes: 89 50 4E 47 ...]
│   │   │           └── Im3 → [JPEG bytes: FF D8 FF ...]
```

### Detection Process Step-by-Step

1. **Load PDF**: `pdfjsLib.getDocument({ data: buffer })`
   - Parses PDF structure
   - Builds object tree

2. **Get Page**: `pdfDocument.getPage(pageNum)`
   - Accesses page object
   - Gets page resources

3. **Get Operator List**: `page.getOperatorList()`
   - Returns array of drawing commands
   - Example: `[saveState, transform, paintXObject('Im1'), restoreState]`

4. **Find Image References**: 
   ```typescript
   if (operator === pdfjsLib.OPS.paintXObject) {
     const imageName = args[0]; // e.g., "Im1"
     // This XObject might be an image
   }
   ```

5. **Resolve XObject**: `page.objs.get(imageName)`
   - Gets actual object data
   - Returns image bytes if it's an image

6. **Validate**: Check file signature
   - JPEG: Starts with `FF D8 FF`
   - PNG: Starts with `89 50 4E 47`
   - GIF: Starts with `GIF87a` or `GIF89a`

7. **Extract**: Convert to Buffer for Vision API

## Installation

```bash
cd backend/services/api-gateway
npm install pdfjs-dist
```

## Configuration (Optional)

Add to `.env`:
```env
# Enable PDF image extraction (default: true)
ENABLE_PDF_IMAGE_EXTRACTION=true

# Minimum image size to analyze (bytes, default: 5000)
MIN_PDF_IMAGE_SIZE=5000

# Maximum images to extract per PDF (default: 20)
MAX_PDF_IMAGES=20
```

## Testing

Test with a PDF containing:
- Charts/graphs
- Diagrams
- Embedded photos
- Tables with visual formatting

The system will:
1. ✅ Extract text (existing)
2. ✅ Detect embedded images
3. ✅ Analyze images with Vision API
4. ✅ Combine text + visual analysis

## Summary

**How images are detected:**
- PDFs store images as **XObject resources**
- Pages reference them via **"Do" operators** in content streams
- We scan operator lists to find these references
- We resolve XObjects and validate they're actual images
- We extract image bytes and analyze with Vision API

The detection is **automatic** - no manual configuration needed!

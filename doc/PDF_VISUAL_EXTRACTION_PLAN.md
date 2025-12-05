# PDF Visual Extraction Enhancement Plan

## Current State

### ✅ What Works
- **Standalone Images**: Full Vision API analysis (OCR, charts, diagrams)
- **PDF Text**: Text extraction via `pdf-parse`

### ❌ What's Missing
- **PDFs with embedded images/charts**: Visual elements are ignored
- **PDFs with diagrams**: Diagrams are not analyzed

## Proposed Solution

### Option 1: Extract Images from PDF + Vision API (Recommended)

**Approach**: Extract embedded images from PDF, then analyze each with Vision API

**Implementation Steps**:
1. Use `pdf2pic` or `pdf-lib` + `canvas` to extract images from PDF pages
2. Convert each extracted image to a format Vision API can process
3. Send each image to Vision API for analysis
4. Combine text + image analysis results

**Pros**:
- Leverages existing Vision API infrastructure
- Handles charts, diagrams, tables in PDFs
- Consistent with current image processing

**Cons**:
- Multiple API calls (one per image)
- Higher cost for PDFs with many images
- More complex processing

**Libraries Needed**:
- `pdf2pic` or `pdfjs-dist` (Mozilla's PDF.js) for image extraction
- `sharp` or `canvas` for image processing

### Option 2: Convert PDF Pages to Images + Vision API

**Approach**: Convert each PDF page to an image, then analyze with Vision API

**Implementation Steps**:
1. Convert PDF pages to images (PNG/JPEG)
2. Send each page image to Vision API
3. Combine text extraction + page analysis

**Pros**:
- Captures everything on each page (text + visuals)
- Simpler than extracting individual images
- Works for scanned PDFs

**Cons**:
- Very expensive (one API call per page)
- Duplicates text extraction (Vision API + pdf-parse)
- Slower processing

### Option 3: Hybrid Approach (Best Balance)

**Approach**: 
1. Extract text with `pdf-parse` (fast, cheap)
2. Extract embedded images from PDF
3. Analyze only images with Vision API
4. Combine results

**Implementation**:
```typescript
async function processPDFWithVisuals(file: Express.Multer.File) {
  // 1. Extract text (existing)
  const pdfData = await pdfParse(file.buffer);
  const text = pdfData.text;
  
  // 2. Extract embedded images
  const images = await extractImagesFromPDF(file.buffer);
  
  // 3. Analyze images with Vision API
  const imageAnalyses = await Promise.all(
    images.map(img => analyzeImageWithVisionAPI(img))
  );
  
  // 4. Combine results
  return {
    text: text,
    imageAnalyses: imageAnalyses,
    combined: formatCombinedResults(text, imageAnalyses)
  };
}
```

## Recommended Implementation: Option 3 (Hybrid)

### Phase 1: Extract Images from PDF

**Library**: Use `pdfjs-dist` (Mozilla PDF.js) - most reliable

```typescript
import * as pdfjsLib from 'pdfjs-dist';

async function extractImagesFromPDF(buffer: Buffer): Promise<Array<{page: number, image: Buffer}>> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const images: Array<{page: number, image: Buffer}> = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const ops = await page.getOperatorList();
    
    // Extract image objects from page operations
    const pageImages = extractImagesFromOps(ops);
    images.push(...pageImages.map(img => ({ page: pageNum, image: img })));
  }
  
  return images;
}
```

### Phase 2: Analyze Extracted Images

**Reuse existing Vision API code**:
```typescript
async function analyzePDFImages(images: Array<{page: number, image: Buffer}>): Promise<string[]> {
  const analyses = await Promise.all(
    images.map(async ({ page, image }) => {
      const analysis = await analyzeImageWithVisionAPI(image, {
        prompt: `Analyze this image from page ${page} of a PDF document. Extract text, describe charts/graphs, and identify visual elements.`
      });
      return `--- Page ${page} Image Analysis ---\n${analysis}`;
    })
  );
  
  return analyses;
}
```

### Phase 3: Combine Results

```typescript
function combinePDFResults(text: string, imageAnalyses: string[]): string {
  let combined = text;
  
  if (imageAnalyses.length > 0) {
    combined += '\n\n--- VISUAL ELEMENTS ANALYSIS ---\n';
    combined += imageAnalyses.join('\n\n');
  }
  
  return combined;
}
```

## Cost Considerations

### Current (Text Only)
- PDF text extraction: Free (local processing)
- Cost: $0

### With Visual Extraction
- PDF text extraction: Free
- Image extraction: Free (local processing)
- Vision API: ~$0.01 per image (GPT-4o)
- **Example**: PDF with 5 charts = ~$0.05 per document

### Optimization Strategies
1. **Skip duplicate images**: Detect and skip identical images across pages
2. **Image size limits**: Resize large images before sending to Vision API
3. **Batch processing**: Process multiple images in parallel
4. **Caching**: Cache analysis results for identical images

## Implementation Priority

### High Priority
- ✅ Extract images from PDFs
- ✅ Analyze extracted images with Vision API
- ✅ Combine text + visual analysis

### Medium Priority
- ⚠️ Detect and skip duplicate images
- ⚠️ Optimize image sizes before Vision API
- ⚠️ Add progress tracking for large PDFs

### Low Priority
- 📋 Cache image analysis results
- 📋 Support for scanned PDFs (OCR entire pages)
- 📋 Extract tables from PDFs as structured data

## Testing Strategy

1. **Test PDFs with**:
   - Embedded charts/graphs
   - Diagrams and flowcharts
   - Tables with visual formatting
   - Mixed text + images

2. **Verify**:
   - Images are extracted correctly
   - Vision API analyzes visuals accurately
   - Combined results include both text and visual analysis
   - Performance is acceptable

## Migration Path

1. **Phase 1**: Add image extraction (non-breaking)
2. **Phase 2**: Add Vision API analysis (optional, can be disabled)
3. **Phase 3**: Enable by default, add configuration option
4. **Phase 4**: Optimize and cache

## Configuration

Add to `.env`:
```env
# Enable PDF visual extraction (default: true)
ENABLE_PDF_VISUAL_EXTRACTION=true

# Max images to analyze per PDF (default: 20)
MAX_PDF_IMAGES_TO_ANALYZE=20

# Skip duplicate images (default: true)
SKIP_DUPLICATE_PDF_IMAGES=true
```

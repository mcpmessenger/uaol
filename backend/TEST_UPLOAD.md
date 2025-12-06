# Testing File Uploads

This guide shows you how to test PDF and document uploads to the UAOL API.

## Quick Test (Node.js)

Use the test script:

```bash
cd backend
node test-file-upload.js <file-path> [--api-url=http://localhost:3000] [--token=your-jwt-token]
```

### Examples

**Test a PDF file:**
```bash
node test-file-upload.js test.pdf
```

**Test with custom API URL:**
```bash
node test-file-upload.js document.docx --api-url=http://localhost:3000
```

**Test with authentication:**
```bash
node test-file-upload.js sample.txt --token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Quick Test (cURL)

Use the bash script or curl directly:

```bash
# Using the script
chmod +x test-file-upload.sh
./test-file-upload.sh test.pdf

# Or use curl directly
curl -X POST http://localhost:3000/chat/upload \
  -F "files=@test.pdf"
```

**With authentication:**
```bash
curl -X POST http://localhost:3000/chat/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@document.docx"
```

## Supported File Types

The upload endpoint supports:

- **PDFs**: `.pdf` - Full text extraction, OCR for scanned PDFs, image analysis
- **Word Documents**: `.docx`, `.doc` - Text extraction
- **Text Files**: `.txt`, `.md` - Direct text reading
- **Spreadsheets**: `.xlsx`, `.xls`, `.csv` - Data extraction
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif` - Vision API analysis

## Expected Response

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "fileId": "file_1234567890_abc123",
        "filename": "test.pdf",
        "size": 12345,
        "type": "application/pdf",
        "url": "/uploads/user123/file_1234567890_abc123.pdf",
        "extractedText": "Full extracted text content...",
        "metadata": {
          "type": "document",
          "pages": 5,
          "imageCount": 2,
          "ocrUsed": false
        }
      }
    ],
    "summary": {
      "total": 1,
      "withText": 1,
      "totalSize": 12345
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Testing Different Scenarios

### 1. Text-based PDF
```bash
node test-file-upload.js text-based.pdf
```
- Should extract text directly
- No OCR needed
- Fast processing

### 2. Scanned PDF (Image-based)
```bash
node test-file-upload.js scanned.pdf
```
- Should detect low text content
- Will use OCR (if `ENABLE_OCR=true`)
- May take longer

### 3. PDF with Charts/Images
```bash
node test-file-upload.js report-with-charts.pdf
```
- Should extract text
- Should extract embedded images
- Should analyze images with Vision API
- Check `metadata.imageCount` in response

### 4. Large PDF (>10MB)
```bash
node test-file-upload.js large-document.pdf
```
- Should validate file size
- May timeout if too large
- Check for size limit errors

### 5. Corrupted PDF
```bash
node test-file-upload.js corrupted.pdf
```
- Should detect invalid PDF
- Should return clear error message
- Should not crash the server

### 6. Multiple Files
```bash
# Create a test with multiple files (modify script or use curl)
curl -X POST http://localhost:3000/chat/upload \
  -F "files=@file1.pdf" \
  -F "files=@file2.docx" \
  -F "files=@file3.txt"
```

## Environment Variables

Make sure these are set in `backend/.env`:

```bash
# Required for PDF parsing
ENABLE_OCR=true                    # Enable OCR for scanned PDFs
MAX_PDF_PAGES_FOR_OCR=10          # Max pages to OCR

# Optional for image extraction
ENABLE_PDF_IMAGE_EXTRACTION=true   # Extract and analyze images
MAX_PDF_IMAGES=20                 # Max images to extract
MIN_PDF_IMAGE_SIZE=5000           # Min image size (bytes)

# Required for Vision API (image analysis)
OPENAI_API_KEY=sk-...             # OpenAI API key for Vision API
```

## Troubleshooting

### "PDF parsing timeout"
- PDF might be too large or complex
- Increase timeout in code (currently 60 seconds)
- Try smaller PDFs first

### "OpenAI API key not configured"
- Set `OPENAI_API_KEY` in `backend/.env`
- Required for OCR and image analysis

### "Invalid PDF file: missing PDF magic bytes"
- File is not a valid PDF
- File might be corrupted
- Check file with a PDF viewer

### "PDF file too large"
- Current limit is 50MB
- Reduce file size or increase limit in code

### "Network Error"
- API Gateway might not be running
- Check `http://localhost:3000` is accessible
- Verify API URL in test script

## Testing from Frontend

You can also test uploads from the frontend UI:

1. Start the frontend: `npm run dev`
2. Navigate to the chat interface
3. Click the file upload button
4. Select a PDF or document
5. Check the console for extracted text

The frontend uses the same `/chat/upload` endpoint.


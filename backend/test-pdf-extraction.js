// Quick test script to diagnose PDF parsing
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set DOMMatrix polyfill BEFORE importing pdf-parse
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
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

console.log('DOMMatrix polyfill set:', typeof globalThis.DOMMatrix !== 'undefined');

try {
  console.log('Importing pdf-parse...');
  const pdfParseModule = await import('pdf-parse');
  const pdfParse = pdfParseModule.default || pdfParseModule;
  console.log('pdf-parse imported successfully');
  
  // Try to find a test PDF
  const testPdfPath = process.argv[2] || path.join(__dirname, '../uploads/guest');
  
  console.log('Looking for PDF files in:', testPdfPath);
  
  // If a specific file was provided, test it
  if (process.argv[2] && process.argv[2].endsWith('.pdf')) {
    const pdfBuffer = fs.readFileSync(process.argv[2]);
    console.log('Reading PDF:', process.argv[2], 'Size:', pdfBuffer.length);
    
    const pdfData = await pdfParse(pdfBuffer);
    console.log('\n✅ PDF Parsed Successfully!');
    console.log('Pages:', pdfData.numpages);
    console.log('Text length:', pdfData.text?.length || 0);
    console.log('\nFirst 500 characters:');
    console.log(pdfData.text?.substring(0, 500) || '(no text)');
  } else {
    console.log('\nUsage: node test-pdf-extraction.js <path-to-pdf-file>');
    console.log('Example: node test-pdf-extraction.js "C:\\path\\to\\file.pdf"');
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

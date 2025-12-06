/**
 * Test script for improved PDF parsing
 * Tests various PDF types and error conditions
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up DOMMatrix polyfill before any PDF imports
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
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
    a; b; c; d; e; f;
    m11; m12; m21; m22; m41; m42;
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
  };
}

async function testPDFParsing(pdfPath) {
  console.log(`\n📄 Testing PDF: ${path.basename(pdfPath)}`);
  
  try {
    // Read PDF file
    const buffer = await fs.readFile(pdfPath);
    console.log(`   Size: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    // Validate magic bytes
    if (buffer.length < 4 || 
        buffer[0] !== 0x25 || 
        buffer[1] !== 0x50 || 
        buffer[2] !== 0x44 || 
        buffer[3] !== 0x46) {
      throw new Error('Invalid PDF: missing magic bytes (%PDF)');
    }
    console.log('   ✓ Valid PDF magic bytes');
    
    // Import pdf-parse using CommonJS require (most reliable)
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParseCJS = require('pdf-parse');
    
    const pdfParse = typeof pdfParseCJS === 'function' 
      ? pdfParseCJS 
      : (pdfParseCJS.default || pdfParseCJS);
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse did not resolve to a function');
    }
    console.log('   ✓ pdf-parse loaded successfully');
    
    // Parse with timeout
    const startTime = Date.now();
    const pdfData = await Promise.race([
      pdfParse(buffer),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
      )
    ]);
    
    const parseTime = Date.now() - startTime;
    console.log(`   ✓ Parsed in ${parseTime}ms`);
    
    // Validate result
    if (!pdfData || typeof pdfData !== 'object') {
      throw new Error('Invalid parsing result');
    }
    
    const numPages = pdfData.numpages || pdfData.numPages || 1;
    const text = pdfData.text || '';
    
    console.log(`   Pages: ${numPages}`);
    console.log(`   Text length: ${text.length} characters`);
    console.log(`   Has text: ${text.length > 0 ? 'Yes' : 'No'}`);
    
    if (text.length > 0) {
      const preview = text.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
    }
    
    return {
      success: true,
      pages: numPages,
      textLength: text.length,
      parseTime
    };
    
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🧪 PDF Parsing Test Suite\n');
  console.log('Testing improved PDF parsing with:');
  console.log('- Buffer validation');
  console.log('- Magic bytes check');
  console.log('- Simplified import strategy');
  console.log('- Timeout protection');
  console.log('- Result validation\n');
  
  // Test with sample PDFs if they exist
  const testFiles = [
    path.join(__dirname, 'test-pdf-sample.pdf'),
    path.join(__dirname, 'uploads', '**', '*.pdf'),
  ];
  
  let foundFiles = [];
  for (const pattern of testFiles) {
    try {
      const stats = await fs.stat(pattern);
      if (stats.isFile()) {
        foundFiles.push(pattern);
      }
    } catch {
      // File doesn't exist, skip
    }
  }
  
  if (foundFiles.length === 0) {
    console.log('⚠️  No test PDF files found.');
    console.log('   Place a PDF file at: backend/test-pdf-sample.pdf');
    console.log('   Or upload a PDF through the API to test.\n');
    return;
  }
  
  const results = [];
  for (const pdfPath of foundFiles) {
    const result = await testPDFParsing(pdfPath);
    results.push({ file: path.basename(pdfPath), ...result });
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  
  if (successful > 0) {
    const avgTime = results
      .filter(r => r.success && r.parseTime)
      .reduce((sum, r) => sum + r.parseTime, 0) / successful;
    console.log(`   Average parse time: ${avgTime.toFixed(0)}ms`);
  }
}

main().catch(console.error);


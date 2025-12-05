// Quick test script to diagnose PDF parsing issues
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPDFParsing() {
  console.log('🔍 Testing PDF parsing setup...\n');
  console.log('⚠️  NOTE: This script should be run from backend/services/api-gateway directory\n');
  
  // Test 1: Check if dommatrix is installed
  console.log('1. Checking dommatrix package...');
  try {
    const dommatrix = await import('dommatrix');
    console.log('   ✅ dommatrix imported successfully');
    console.log('   - DOMMatrix:', typeof dommatrix.DOMMatrix !== 'undefined' ? '✅' : '❌');
    console.log('   - DOMPoint:', typeof dommatrix.DOMPoint !== 'undefined' ? '✅' : '❌');
    
    // Set up polyfills
    if (typeof globalThis.DOMMatrix === 'undefined') {
      globalThis.DOMMatrix = dommatrix.DOMMatrix || dommatrix.default?.DOMMatrix;
      globalThis.DOMPoint = dommatrix.DOMPoint || dommatrix.default?.DOMPoint;
      console.log('   ✅ Polyfills set on globalThis');
    } else {
      console.log('   ✅ DOMMatrix already exists on globalThis');
    }
  } catch (error) {
    console.log('   ❌ Failed to import dommatrix:', error.message);
    console.log('   💡 Run: cd services/api-gateway && npm install dommatrix');
    return;
  }
  
  // Test 2: Check polyfill state
  console.log('\n2. Checking polyfill state...');
  console.log('   - globalThis.DOMMatrix:', typeof globalThis.DOMMatrix !== 'undefined' ? '✅' : '❌');
  console.log('   - globalThis.DOMPoint:', typeof globalThis.DOMPoint !== 'undefined' ? '✅' : '❌');
  console.log('   - globalThis.ImageData:', typeof globalThis.ImageData !== 'undefined' ? '✅' : '❌');
  console.log('   - globalThis.Path2D:', typeof globalThis.Path2D !== 'undefined' ? '✅' : '❌');
  
  // Test 3: Try importing pdf-parse
  console.log('\n3. Testing pdf-parse import...');
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    console.log('   ✅ pdf-parse imported successfully');
    console.log('   - Type:', typeof pdfParse);
    
    // Test 4: Try parsing a small test (if you have a test PDF)
    console.log('\n4. PDF parsing test...');
    console.log('   💡 To test with a real PDF, provide a file path');
    console.log('   Example: node test-pdf-parsing.js path/to/test.pdf');
    
    if (process.argv[2]) {
      const pdfPath = process.argv[2];
      console.log(`   📄 Testing with: ${pdfPath}`);
      try {
        const pdfBuffer = readFileSync(pdfPath);
        const pdfData = await pdfParse(pdfBuffer);
        console.log('   ✅ PDF parsed successfully!');
        console.log('   - Pages:', pdfData.numpages);
        console.log('   - Text length:', pdfData.text.length);
        console.log('   - First 100 chars:', pdfData.text.substring(0, 100));
      } catch (parseError) {
        console.log('   ❌ PDF parsing failed:', parseError.message);
        console.log('   Stack:', parseError.stack);
      }
    }
  } catch (error) {
    console.log('   ❌ Failed to import pdf-parse:', error.message);
    console.log('   💡 Run: cd services/api-gateway && npm install pdf-parse');
  }
  
  console.log('\n✅ Diagnostic complete!');
}

testPDFParsing().catch(console.error);

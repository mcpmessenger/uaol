/**
 * Diagnostic script to test PDF parsing and identify issues
 * Usage: node diagnose-pdf.js <pdf-file-path>
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up DOMMatrix polyfill
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

async function diagnosePDF(pdfPath) {
  console.log('🔍 PDF Diagnostic Tool\n');
  console.log(`File: ${pdfPath}\n`);

  try {
    // 1. Check if file exists - try multiple locations
    let fullPath = pdfPath;
    
    // If not absolute, try relative to current directory first
    if (!path.isAbsolute(pdfPath)) {
      // Try relative to script directory
      const scriptDirPath = path.join(__dirname, pdfPath);
      try {
        await fs.access(scriptDirPath);
        fullPath = scriptDirPath;
      } catch {
        // Try relative to current working directory
        const cwdPath = path.join(process.cwd(), pdfPath);
        try {
          await fs.access(cwdPath);
          fullPath = cwdPath;
        } catch {
          // Try parent directory
          const parentPath = path.join(process.cwd(), '..', pdfPath);
          try {
            await fs.access(parentPath);
            fullPath = parentPath;
          } catch {
            throw new Error(`File not found. Tried:\n  - ${scriptDirPath}\n  - ${cwdPath}\n  - ${parentPath}\n\nPlease provide the full path to the PDF file.`);
          }
        }
      }
    }
    
    const stats = await fs.stat(fullPath);
    console.log(`✅ File exists`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);

    // 2. Read file
    const buffer = await fs.readFile(fullPath);
    console.log(`✅ File read successfully`);
    console.log(`   Buffer size: ${buffer.length} bytes\n`);

    // 3. Check PDF magic bytes
    console.log('📄 Checking PDF structure...');
    if (buffer.length < 4) {
      console.error('❌ File too small to be a PDF');
      return;
    }

    const magicBytes = buffer.slice(0, 4);
    const isPDF = magicBytes[0] === 0x25 && 
                  magicBytes[1] === 0x50 && 
                  magicBytes[2] === 0x44 && 
                  magicBytes[3] === 0x46;
    
    if (isPDF) {
      console.log('✅ Valid PDF magic bytes (%PDF)');
    } else {
      console.error('❌ Invalid PDF: Missing magic bytes');
      console.log(`   First 4 bytes: ${Array.from(magicBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`);
      return;
    }

    // 4. Check PDF version
    const pdfStart = buffer.toString('utf-8', 0, Math.min(100, buffer.length));
    const versionMatch = pdfStart.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      console.log(`✅ PDF version: ${versionMatch[1]}`);
    } else {
      console.warn('⚠️  Could not determine PDF version');
    }

    // 5. Check for encryption
    const pdfText = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    const isEncrypted = pdfText.includes('/Encrypt') || pdfText.includes('/Filter/Standard');
    if (isEncrypted) {
      console.warn('⚠️  PDF appears to be encrypted/password-protected');
      console.warn('   This will prevent text extraction');
    } else {
      console.log('✅ PDF is not encrypted');
    }

    // 6. Try to import pdf-parse
    console.log('\n📦 Testing pdf-parse library...');
    let pdfParse;
    
    try {
      // Try to find pdf-parse in api-gateway node_modules first
      const apiGatewayPath = path.join(__dirname, 'services', 'api-gateway');
      const apiGatewayNodeModules = path.join(apiGatewayPath, 'node_modules', 'pdf-parse');
      
      let pdfParsePath = 'pdf-parse';
      try {
        await fs.access(apiGatewayNodeModules);
        pdfParsePath = apiGatewayNodeModules;
        console.log('   Found pdf-parse in api-gateway/node_modules');
      } catch {
        // Try current directory node_modules
        const currentNodeModules = path.join(__dirname, 'node_modules', 'pdf-parse');
        try {
          await fs.access(currentNodeModules);
          pdfParsePath = currentNodeModules;
          console.log('   Found pdf-parse in current node_modules');
        } catch {
          console.log('   Using default pdf-parse import');
        }
      }
      
      // Try ESM import first
      try {
        const pdfParseModule = await import(pdfParsePath);
        if (typeof pdfParseModule === 'function') {
          pdfParse = pdfParseModule;
        } else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
          pdfParse = pdfParseModule.default;
        } else if (pdfParseModule.pdfParse && typeof pdfParseModule.pdfParse === 'function') {
          pdfParse = pdfParseModule.pdfParse;
        } else if (pdfParseModule.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
          // pdf-parse v2.4.5 exports PDFParse class
          const PDFParseClass = pdfParseModule.PDFParse;
          pdfParse = async (buffer) => {
            const parser = new PDFParseClass({ data: buffer });
            const result = await parser.getText();
            return {
              text: result.text || '',
              numpages: result.total || 1,
              info: {},
              metadata: {}
            };
          };
        } else {
          // Try CommonJS require
          const { createRequire } = await import('module');
          const require = createRequire(import.meta.url);
          const pdfParseCJS = require(pdfParsePath);
          
          if (pdfParseCJS.PDFParse && typeof pdfParseCJS.PDFParse === 'function') {
            // Wrap PDFParse class
            const PDFParseClass = pdfParseCJS.PDFParse;
            pdfParse = async (buffer) => {
              const parser = new PDFParseClass({ data: buffer });
              const result = await parser.getText();
              return {
                text: result.text || '',
                numpages: result.total || 1,
                info: {},
                metadata: {}
              };
            };
          } else {
            pdfParse = typeof pdfParseCJS === 'function' 
              ? pdfParseCJS 
              : (pdfParseCJS.default || pdfParseCJS || pdfParseCJS.pdfParse);
          }
        }
        
        if (typeof pdfParse === 'function') {
          console.log('✅ pdf-parse loaded successfully');
        } else {
          // Debug: log what we got
          console.log('   Debug: pdf-parse type:', typeof pdfParse);
          console.log('   Debug: pdf-parse keys:', pdfParse ? Object.keys(pdfParse) : 'null');
          
          // pdf-parse v2.4.5 exports a PDFParse class, not a function
          // We need to wrap it to work like the old function API
          if (pdfParse && typeof pdfParse === 'object') {
            // Check for PDFParse class
            if (pdfParse.PDFParse && typeof pdfParse.PDFParse === 'function') {
              // Wrap PDFParse class to work like a function
              const PDFParseClass = pdfParse.PDFParse;
              pdfParse = async (buffer) => {
                const parser = new PDFParseClass({ data: buffer });
                const result = await parser.getText();
                return {
                  text: result.text || '',
                  numpages: result.total || 1,
                  info: {},
                  metadata: {}
                };
              };
              console.log('✅ pdf-parse loaded from PDFParse class');
            } else if (pdfParse.pdfParse && typeof pdfParse.pdfParse === 'function') {
              pdfParse = pdfParse.pdfParse;
              console.log('✅ pdf-parse loaded from .pdfParse property');
            } else if (pdfParse.default && typeof pdfParse.default === 'function') {
              pdfParse = pdfParse.default;
              console.log('✅ pdf-parse loaded from .default property');
            } else {
              // Last resort: check if it's a namespace with a function inside
              const possibleFunc = Object.values(pdfParse).find(v => typeof v === 'function');
              if (possibleFunc) {
                pdfParse = possibleFunc;
                console.log('✅ pdf-parse loaded from object values');
              } else {
                console.log('   Available keys:', Object.keys(pdfParse));
                throw new Error(`pdf-parse did not resolve to a function. Got type: ${typeof pdfParse}, keys: ${Object.keys(pdfParse || {}).join(', ')}`);
              }
            }
          } else {
            throw new Error('pdf-parse did not resolve to a function');
          }
        }
      } catch (importError) {
        // Final fallback: try CommonJS require
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfParseCJS = require(pdfParsePath);
        
        pdfParse = typeof pdfParseCJS === 'function' 
          ? pdfParseCJS 
          : (pdfParseCJS.default || pdfParseCJS || pdfParseCJS.pdfParse);
        
        if (typeof pdfParse === 'function') {
          console.log('✅ pdf-parse loaded via CommonJS require');
        } else {
          throw new Error(`pdf-parse did not resolve to a function. Got type: ${typeof pdfParse}`);
        }
      }

      // 7. Try to parse the PDF
      console.log('\n🔬 Attempting to parse PDF...');
      const startTime = Date.now();
      
      const pdfData = await Promise.race([
        pdfParse(buffer),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
        )
      ]);

      const parseTime = Date.now() - startTime;
      console.log(`✅ PDF parsed successfully in ${parseTime}ms`);

      // 8. Analyze results
      console.log('\n📊 Parsing Results:');
      const numPages = pdfData.numpages || pdfData.numPages || 1;
      const text = pdfData.text || '';
      
      console.log(`   Pages: ${numPages}`);
      console.log(`   Text length: ${text.length} characters`);
      console.log(`   Has text: ${text.length > 0 ? 'Yes' : 'No'}`);

      if (text.length > 0) {
        const preview = text.substring(0, 200).replace(/\n/g, ' ');
        console.log(`   Preview: ${preview}...`);
        
        // Check if it's mostly whitespace
        const nonWhitespace = text.replace(/\s/g, '').length;
        const whitespaceRatio = (text.length - nonWhitespace) / text.length;
        if (whitespaceRatio > 0.8) {
          console.warn('⚠️  Text appears to be mostly whitespace');
        }
      } else {
        console.warn('⚠️  No text extracted - PDF may be scanned/image-based');
        console.warn('   OCR may be required to extract text');
      }

      // 9. Check metadata
      if (pdfData.info) {
        console.log('\n📋 PDF Metadata:');
        console.log(`   Title: ${pdfData.info.Title || 'N/A'}`);
        console.log(`   Author: ${pdfData.info.Author || 'N/A'}`);
        console.log(`   Creator: ${pdfData.info.Creator || 'N/A'}`);
        console.log(`   Producer: ${pdfData.info.Producer || 'N/A'}`);
      }

      console.log('\n✅ Diagnostic complete - PDF parsing works!');
      
    } catch (parseError) {
      console.error('\n❌ PDF parsing failed!');
      console.error(`   Error: ${parseError.message}`);
      console.error(`   Type: ${parseError.constructor?.name}`);
      
      if (parseError.stack) {
        console.error('\n   Stack trace:');
        console.error(parseError.stack.split('\n').slice(0, 5).join('\n'));
      }

      // Provide suggestions
      console.log('\n💡 Suggestions:');
      if (parseError.message.includes('timeout')) {
        console.log('   - PDF may be too complex or large');
        console.log('   - Try a smaller PDF or increase timeout');
      } else if (parseError.message.includes('corrupt') || parseError.message.includes('invalid')) {
        console.log('   - PDF file may be corrupted');
        console.log('   - Try opening it in a PDF viewer to verify');
        console.log('   - Try re-saving the PDF');
      } else if (parseError.message.includes('encrypt') || parseError.message.includes('password')) {
        console.log('   - PDF is encrypted/password-protected');
        console.log('   - Remove password protection to extract text');
      } else if (parseError.message.includes('DOMMatrix')) {
        console.log('   - DOMMatrix polyfill issue');
        console.log('   - Check that polyfill is loaded correctly');
      } else {
        console.log('   - Check server logs for more details');
        console.log('   - Verify pdf-parse is installed: npm install pdf-parse');
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run diagnostic
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('❌ Error: PDF file path is required');
  console.log('\nUsage: node diagnose-pdf.js <pdf-file-path>');
  process.exit(1);
}

diagnosePDF(pdfPath).catch(console.error);


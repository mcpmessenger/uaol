/**
 * Test script for file upload functionality
 * Tests PDF, DOCX, TXT, and other document uploads
 * 
 * Usage:
 *   node test-file-upload.js <file-path> [--api-url=http://localhost:3000] [--token=your-jwt-token]
 * 
 * Examples:
 *   node test-file-upload.js test.pdf
 *   node test-file-upload.js document.docx --api-url=http://localhost:3000
 *   node test-file-upload.js sample.txt --token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FormData from 'form-data';

// Get fetch function (native in Node 18+, or from node-fetch)
async function getFetch() {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  try {
    const nodeFetch = await import('node-fetch');
    return nodeFetch.default;
  } catch (err) {
    throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch: npm install node-fetch');
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const filePath = args.find(arg => !arg.startsWith('--'));
const apiUrl = args.find(arg => arg.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:3000';
const token = args.find(arg => arg.startsWith('--token='))?.split('=')[1];

if (!filePath) {
  console.error('❌ Error: File path is required');
  console.log('\nUsage:');
  console.log('  node test-file-upload.js <file-path> [--api-url=http://localhost:3000] [--token=your-jwt-token]');
  console.log('\nExamples:');
  console.log('  node test-file-upload.js test.pdf');
  console.log('  node test-file-upload.js document.docx --api-url=http://localhost:3000');
  console.log('  node test-file-upload.js sample.txt --token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

async function testFileUpload(filePath, apiUrl, token, fetchFn) {
  console.log('📤 Testing File Upload\n');
  console.log(`   File: ${filePath}`);
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Auth: ${token ? 'Authenticated' : 'Guest mode'}\n`);

  try {
    // Check if file exists
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    const stats = await fs.stat(fullPath);
    
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    const fileSize = stats.size;
    const fileName = path.basename(fullPath);
    const fileExt = path.extname(fileName).toLowerCase();
    
    console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`   Extension: ${fileExt}\n`);

    // Read file
    const fileBuffer = await fs.readFile(fullPath);
    console.log('   ✓ File read successfully\n');

    // Create FormData
    const formData = new FormData();
    formData.append('files', fileBuffer, {
      filename: fileName,
      contentType: getContentType(fileExt),
    });

    console.log('   📡 Uploading to API...\n');

    // Prepare headers
    const headers = {
      ...formData.getHeaders(),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Upload file
    const startTime = Date.now();
    const response = await fetchFn(`${apiUrl}/chat/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const uploadTime = Date.now() - startTime;
    const responseData = await response.json();

    console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
    console.log(`   Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      console.error('   ❌ Upload failed!');
      console.error('   Error:', JSON.stringify(responseData, null, 2));
      return { success: false, error: responseData };
    }

    if (!responseData.success) {
      console.error('   ❌ Upload failed!');
      console.error('   Error:', responseData.error);
      return { success: false, error: responseData.error };
    }

    // Display results
    console.log('   ✅ Upload successful!\n');
    console.log('   📊 Results:\n');

    const { files, summary } = responseData.data;

    files.forEach((file, index) => {
      console.log(`   File ${index + 1}: ${file.filename}`);
      console.log(`      ID: ${file.fileId}`);
      console.log(`      Size: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`      Type: ${file.type}`);
      console.log(`      URL: ${file.url}`);
      
      if (file.metadata) {
        console.log(`      Metadata:`);
        if (file.metadata.pages) {
          console.log(`         Pages: ${file.metadata.pages}`);
        }
        if (file.metadata.type) {
          console.log(`         Type: ${file.metadata.type}`);
        }
        if (file.metadata.imageCount) {
          console.log(`         Images: ${file.metadata.imageCount}`);
        }
        if (file.metadata.ocrUsed) {
          console.log(`         OCR: Used (confidence: ${(file.metadata.ocrConfidence * 100).toFixed(1)}%)`);
        }
      }

      if (file.extractedText) {
        const textLength = file.extractedText.length;
        const preview = file.extractedText.substring(0, 200).replace(/\n/g, ' ');
        console.log(`      Extracted Text: ${textLength} characters`);
        console.log(`      Preview: ${preview}...`);
      } else {
        console.log(`      Extracted Text: None`);
      }
      console.log('');
    });

    console.log('   📈 Summary:');
    console.log(`      Total files: ${summary.total}`);
    console.log(`      Files with text: ${summary.withText}`);
    console.log(`      Total size: ${(summary.totalSize / 1024).toFixed(2)} KB\n`);

    console.log('✅ Test completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('   ❌ Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    console.log('❌ Test failed!\n');
    process.exit(1);
  }
}

function getContentType(ext) {
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Run test
(async () => {
  try {
    const fetchFn = await getFetch();
    await testFileUpload(filePath, apiUrl, token, fetchFn);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (error.message.includes('fetch is not available')) {
      console.error('\n💡 Tip: Use Node.js 18+ (which includes native fetch) or run:');
      console.error('   npm install node-fetch\n');
    }
    process.exit(1);
  }
})();
// Result handling is now inside the async IIFE above


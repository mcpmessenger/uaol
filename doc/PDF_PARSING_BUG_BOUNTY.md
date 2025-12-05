# 🐛 PDF Parsing Bug Bounty - Critical Blocker

## Status: 🔴 **CRITICAL - OPEN FOR CONTRIBUTION**

**Priority**: P0 - Blocks core functionality  
**Bounty**: Open to community contribution  
**Last Updated**: 2025-12-05  
**Repository**: [mcpmessenger/uaol](https://github.com/mcpmessenger/uaol)

---

## 🎯 Problem Summary

PDF text extraction is **completely failing** in the UAOL microservices architecture. All PDF uploads result in "content extraction not available" errors, preventing users from analyzing PDF documents through the chat interface. This blocks a core feature of the application.

## 💰 Bounty Details

We're offering:
- **Recognition**: Contributor credit in README and release notes
- **Community Impact**: Fix a critical blocker affecting all users
- **Technical Challenge**: Solve a complex ESM/TypeScript/Class instantiation issue
- **Future Collaboration**: Priority consideration for future contributions

## 🔍 Technical Details

### Error Messages

**Primary Error**:
```
TypeError: Class constructor PDFParse cannot be invoked without 'new'
    at extractTextAndMetadata (file-processor.ts:876:11)
```

**Secondary Error** (when attempting workarounds):
```
TypeError: pdfParse is not a function
```

### Module Structure Analysis

From server logs, the `pdf-parse` module exports:
```javascript
{
  "hasPDFParse": true,
  "PDFParseType": "function",  // Actually a class constructor
  "hasDefault": false,
  "defaultType": "undefined",
  "keys": [
    "AbortException", "FormatError", "InvalidPDFException", 
    "Line", "LineDirection", "LineStore", "PDFParse", 
    "PasswordException", "Point", "Rectangle", "ResponseException", 
    "Shape", "Table", "UnknownErrorException", "VerbosityLevel", "getException"
  ]
}
```

### Affected Files

- `backend/services/api-gateway/src/services/file-processor.ts` (lines ~850-880)
- `backend/services/api-gateway/src/services/pdf-ocr-helper.ts` (lines ~160-240)

### Environment

- **Node.js**: Latest LTS
- **TypeScript**: 5.3.2
- **Module System**: ESM (ES Modules) - `"type": "module"` in package.json
- **Build Tool**: esbuild (via tsx)
- **Package**: `pdf-parse@2.4.5`
- **Package Manager**: npm

### Current Code (Broken)

**file-processor.ts**:
```typescript
const pdfParseModule = await import('pdf-parse');
let pdfParseFn: any;

if (pdfParseModule.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
  if (pdfParseModule.PDFParse.parse && typeof pdfParseModule.PDFParse.parse === 'function') {
    pdfParseFn = pdfParseModule.PDFParse.parse; // ❌ Doesn't exist
  } else {
    pdfParseFn = (buffer: Buffer) => {
      return new pdfParseModule.PDFParse(buffer); // ❌ Returns instance, not promise
    };
  }
} else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
  pdfParseFn = pdfParseModule.default; // ❌ Doesn't exist
}

// This fails because new PDFParse(buffer) returns an instance, not a promise
pdfData = await Promise.race([
  pdfParseFn(file.buffer), // ❌ FAILS
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('PDF parsing timeout')), 30000)
  )
]);
```

## ❌ Attempted Solutions (All Failed)

1. ✅ **Fixed**: Variable hoisting issue (`enableOCR2` → `enableOCRFlag`)
2. ❌ **Failed**: Direct function call: `pdfParse(buffer)`
   - Error: "Class constructor PDFParse cannot be invoked without 'new'"
3. ❌ **Failed**: Class instantiation: `new PDFParse(buffer)`
   - Returns an instance object, not a promise
   - Instance doesn't have `.then()` method
4. ❌ **Failed**: Static method check: `PDFParse.parse()`
   - Method doesn't exist on the class
5. ❌ **Failed**: CommonJS fallback with `createRequire`
   - Same issue - class requires 'new'
6. ❌ **Failed**: Checking if instance is thenable
   - Instance is not a promise

## 📋 Expected vs Actual Behavior

### Expected
1. ✅ PDF file uploaded via frontend
2. ✅ Backend receives file buffer
3. ✅ Text extracted using `pdf-parse`
4. ✅ Text indexed in vector store (RAG)
5. ✅ User can query the document via chat

### Actual
1. ✅ PDF file uploaded
2. ✅ Backend receives file buffer
3. ❌ **Text extraction fails**: "Class constructor PDFParse cannot be invoked without 'new'"
4. ❌ OCR fallback also fails (same issue)
5. ❌ User sees: "content extraction not available"

## 🧪 Reproduction Steps

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Upload any PDF file through the frontend chat interface
5. Check server logs - see error: `"Class constructor PDFParse cannot be invoked without 'new'"`
6. Frontend displays: "content extraction not available"

### Test Files

You can use any PDF file. We've tested with:
- Text-based PDFs (should work)
- Scanned PDFs (should trigger OCR fallback)
- Multi-page PDFs

## 📊 Impact Assessment

- **User Experience**: 🔴 Critical - users cannot analyze PDF documents
- **Feature Completeness**: 🔴 Blocks core document analysis functionality
- **RAG Pipeline**: 🔴 Prevents document indexing for retrieval
- **Business Impact**: 🔴 Affects all users trying to upload PDFs

## 🔬 Research Needed

### 1. How does `pdf-parse` actually work?

**Questions to answer:**
- What is the correct usage pattern for `pdf-parse` in ESM?
- Does the class need to be instantiated differently?
- Is there a wrapper function we're missing?
- Does the instance have a method we should call (e.g., `.parse()`, `.execute()`, `.process()`)?

**Resources:**
- Package: https://www.npmjs.com/package/pdf-parse
- GitHub: https://github.com/mozilla/pdf.js (pdf-parse uses pdf.js internally)
- Documentation: Check package README for usage examples

### 2. ESM vs CommonJS Compatibility

**Questions:**
- Does `pdf-parse` work differently in ESM vs CommonJS?
- Are there known issues with esbuild/TypeScript compilation?
- Should we use a different import strategy?

### 3. Alternative Approaches

**Questions:**
- Should we use a different PDF parsing library?
- Is there a better library that works with ESM out of the box?
- Can we create a wrapper module that handles the complexity?

**Alternative Libraries to Consider:**
- `pdfjs-dist` (already in dependencies, but we use it for images)
- `pdf-lib`
- `pdf2json`
- `pdf-extraction`

## ✅ Success Criteria

A successful fix must:

1. ✅ **Extract text from PDFs** - Works for text-based PDFs
2. ✅ **OCR fallback works** - Scanned PDFs trigger OCR correctly
3. ✅ **No breaking changes** - Doesn't break existing code
4. ✅ **Works in dev and prod** - Works in both environments
5. ✅ **TypeScript compatible** - Properly typed
6. ✅ **Error handling** - Graceful error messages
7. ✅ **Performance** - Doesn't significantly slow down processing

## 📝 Logs Reference

```
[api-gateway] {"level":"info","message":"Starting PDF parsing","hasDOMMatrix":true,"bufferSize":86279}
[api-gateway] {"level":"error","message":"PDF parse failed during execution","error":{"error":"Class constructor PDFParse cannot be invoked without 'new'","errorType":"TypeError"}}
[api-gateway] {"level":"error","message":"PDF parsing failed","error":{"error":"Class constructor PDFParse cannot be invoked without 'new'"}}
[api-gateway] {"level":"error","message":"Failed to convert PDF pages to images","error":{"error":"Class constructor PDFParse cannot be invoked without 'new'"}}
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+
- TypeScript knowledge
- Understanding of ESM modules

### Setup Steps
```bash
# Clone repository
git clone https://github.com/mcpmessenger/uaol.git
cd uaol

# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp backend/.env.example backend/.env
# Add your API keys if testing OCR

# Start development server
npm run dev
```

### Key Files to Modify
- `backend/services/api-gateway/src/services/file-processor.ts`
- `backend/services/api-gateway/src/services/pdf-ocr-helper.ts`

## 🤝 How to Contribute

### Option 1: Pull Request (Preferred)

1. **Fork the repository**
2. **Create a branch**: `git checkout -b fix/pdf-parsing`
3. **Reproduce the issue locally** - Verify you can see the error
4. **Research the solution** - Check pdf-parse docs, test in isolation
5. **Implement a fix** - Make minimal, focused changes
6. **Test thoroughly**:
   - Text-based PDFs
   - Scanned PDFs (OCR fallback)
   - Multi-page PDFs
   - Error cases (encrypted, corrupted)
7. **Submit a pull request** with:
   - Clear description of the solution
   - Test results and screenshots
   - Any breaking changes documented
   - References to documentation/sources

### Option 2: Issue with Analysis

If you can't implement a fix but have insights:

1. **Create a GitHub issue** with label `bug` and `pdf-parsing`
2. **Provide detailed analysis**:
   - What you discovered about pdf-parse
   - Recommended approach
   - Code examples if possible
   - Links to relevant documentation

### Option 3: Alternative Library Proposal

If you recommend switching libraries:

1. **Create a GitHub issue** with label `enhancement` and `pdf-parsing`
2. **Provide migration plan**:
   - Library recommendation with justification
   - Migration steps
   - Breaking changes assessment
   - Performance comparison

## 📚 Resources

### Documentation
- **pdf-parse**: https://www.npmjs.com/package/pdf-parse
- **pdf.js**: https://github.com/mozilla/pdf.js
- **ESM in Node.js**: https://nodejs.org/api/esm.html
- **TypeScript ESM**: https://www.typescriptlang.org/docs/handbook/esm-node.html

### Related Issues
- Variable hoisting fix: `enableOCR2` → `enableOCRFlag` (✅ Resolved)
- PDF import structure investigation (🔴 In Progress)
- OCR fallback implementation (✅ Working, but blocked by this issue)

## 🔗 Contact & Collaboration

- **Repository**: https://github.com/mcpmessenger/uaol
- **Issues**: Create an issue with labels `bug` and `pdf-parsing`
- **Discussions**: Use GitHub Discussions for questions and brainstorming
- **Pull Requests**: Tag with `pdf-parsing` and `bug-fix`

## 📌 Notes

- The codebase uses **ESM (ES Modules)** throughout - `"type": "module"` in package.json
- We have **polyfills** for `DOMMatrix`, `ImageData`, `Path2D` loaded before PDF processing
- **OCR fallback** uses Google Cloud Vision API (configured and working)
- The issue is **specifically** with the `pdf-parse` import/usage pattern
- We're using **TypeScript 5.3.2** with strict mode
- Build tool is **esbuild** (via tsx for development)

## 🎁 Bonus: What We're Looking For

Beyond just fixing the issue, we'd love contributions that:

- ✅ Add comprehensive tests for PDF parsing
- ✅ Improve error messages for users
- ✅ Add support for more PDF types
- ✅ Optimize performance for large PDFs
- ✅ Document the solution clearly

---

**Last Updated**: 2025-12-05  
**Status**: 🔴 Open for contribution  
**Next Review**: After community input or solution found

**Thank you for your interest in helping solve this critical issue!** 🙏

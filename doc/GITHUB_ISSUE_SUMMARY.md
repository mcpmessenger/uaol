# GitHub Issue Summary: PDF Parsing Bug

## Quick Copy-Paste for GitHub Issue

Copy the following into a new GitHub issue:

---

**Title**: `[CRITICAL] PDF Parsing Fails - Class Constructor Issue`

**Labels**: `bug`, `pdf-parsing`, `critical`, `help-wanted`

**Body**:

```markdown
## 🐛 Critical Bug: PDF Text Extraction Failing

PDF text extraction is completely broken due to a class instantiation issue with the `pdf-parse` library in an ESM/TypeScript environment.

### Error
```
TypeError: Class constructor PDFParse cannot be invoked without 'new'
```

### Impact
- 🔴 **Critical**: Blocks all PDF document analysis
- Users cannot extract text from uploaded PDFs
- OCR fallback also fails (same root cause)
- RAG indexing pipeline blocked

### Technical Details
- **Package**: `pdf-parse@2.4.5`
- **Module System**: ESM (`"type": "module"`)
- **TypeScript**: 5.3.2
- **Build Tool**: esbuild (via tsx)

The `pdf-parse` module exports `PDFParse` as a class (not a function), and our current import/usage patterns fail.

### Affected Files
- `backend/services/api-gateway/src/services/file-processor.ts` (lines ~850-880)
- `backend/services/api-gateway/src/services/pdf-ocr-helper.ts` (lines ~160-240)

### What We've Tried
1. ✅ Fixed variable hoisting (`enableOCR2` → `enableOCRFlag`)
2. ❌ Direct function call: `pdfParse(buffer)` - fails
3. ❌ Class instantiation: `new PDFParse(buffer)` - returns instance, not promise
4. ❌ Static method: `PDFParse.parse()` - doesn't exist
5. ❌ CommonJS fallback - same issue

### Full Documentation
See [`doc/PDF_PARSING_BUG_BOUNTY.md`](doc/PDF_PARSING_BUG_BOUNTY.md) for complete details, reproduction steps, and research needed.

### How to Help
- **Option 1**: Implement a fix and submit a PR
- **Option 2**: Research `pdf-parse` usage in ESM and share findings
- **Option 3**: Recommend alternative library with migration plan

### Success Criteria
✅ PDF text extraction works  
✅ OCR fallback works  
✅ No breaking changes  
✅ Works in dev and prod

### Resources
- Package: https://www.npmjs.com/package/pdf-parse
- GitHub: https://github.com/mcpmessenger/uaol/blob/main/doc/PDF_PARSING_BUG_BOUNTY.md
- Full bug bounty doc: [`doc/PDF_PARSING_BUG_BOUNTY.md`](doc/PDF_PARSING_BUG_BOUNTY.md)

**Status**: 🔴 Open for contribution  
**Bounty**: Community recognition + future collaboration opportunities
```

---

## GitHub Actions to Take

### 1. Create the Issue

1. Go to: https://github.com/mcpmessenger/uaol/issues/new
2. Use the title and body above
3. Add labels: `bug`, `pdf-parsing`, `critical`, `help-wanted`
4. Submit

### 2. Pin the Issue

After creating, pin it to the repository:
- Go to Issues → Find your issue → Click "Pin issue"

### 3. Create a Discussion

Create a GitHub Discussion for brainstorming:
- Go to: https://github.com/mcpmessenger/uaol/discussions/new
- Category: "Q&A" or "Ideas"
- Title: "PDF Parsing Bug - Community Discussion"
- Link to the issue and bug bounty doc

### 4. Update Repository Description

Consider adding to repo description:
```
🔴 Help wanted: Critical PDF parsing bug - see doc/PDF_PARSING_BUG_BOUNTY.md
```

### 5. Share on Social Media

If you have a Twitter/X account or other channels:
```
🚨 Help needed! Critical PDF parsing bug in @uaol project. 
ESM/TypeScript class instantiation issue with pdf-parse.
Bounty open for contribution! 
Details: https://github.com/mcpmessenger/uaol/blob/main/doc/PDF_PARSING_BUG_BOUNTY.md
#OpenSource #TypeScript #NodeJS #HelpWanted
```

## Next Steps After Issue is Created

1. ✅ Monitor for responses
2. ✅ Engage with contributors
3. ✅ Review PRs carefully
4. ✅ Test solutions thoroughly
5. ✅ Update documentation when fixed

---

**Created**: 2025-12-05  
**Purpose**: Help get community assistance for critical PDF parsing bug

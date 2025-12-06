# Pre-Push Checklist

## 📋 Files to Review Before Pushing

### ✅ New Files Created
- `doc/BUG_BOUNTY_TOOL_NOT_FOUND.md` - Comprehensive bug bounty document
- `scripts/start-all-services.ps1` - PowerShell script to start all services
- `scripts/start-all-services.sh` - Bash script to start all services
- `scripts/start-all-services.bat` - Batch script to start all services
- `scripts/README-START-SERVICES.md` - Documentation for service startup
- `scripts/test-tool-query.js` - ES module test script for database queries
- `scripts/test-tool-query-simple.js` - CommonJS test script for database queries

### 🔧 Modified Files
- `backend/shared/database/models/mcp-tool.ts` - Added detailed logging to `findById()` method

### 📝 Documentation Files
- `doc/BUG_BOUNTY_TOOL_NOT_FOUND.md` - Bug bounty document (NEW)
- `doc/PRE_PUSH_CHECKLIST.md` - This file (NEW)

## 🚨 Important Notes

### 1. Debug Logging in Production Code
**File:** `backend/shared/database/models/mcp-tool.ts`

The `findById()` method now includes extensive `console.log()` statements for debugging. Consider:
- ✅ **Keep for now** - Helps diagnose the "Tool not found" issue
- ⚠️ **Remove later** - Replace with proper logger calls
- 🔄 **Action:** After bug is fixed, refactor to use `createLogger()` instead of `console.log()`

### 2. Test Scripts
The test scripts (`test-tool-query.js`, `test-tool-query-simple.js`) are diagnostic tools:
- ✅ Safe to commit
- 📝 Consider adding to `.gitignore` if they contain sensitive data (they don't)
- 🔧 May be useful for future debugging

### 3. Service Startup Scripts
All three platform-specific startup scripts are ready:
- ✅ PowerShell (`.ps1`) - Windows
- ✅ Bash (`.sh`) - Linux/Mac/Git Bash
- ✅ Batch (`.bat`) - Windows CMD

## 📦 What to Commit

### Recommended Commit Structure

```bash
# 1. Service startup scripts
git add scripts/start-all-services.*
git add scripts/README-START-SERVICES.md
git commit -m "feat: Add cross-platform scripts to start all backend services"

# 2. Bug bounty documentation
git add doc/BUG_BOUNTY_TOOL_NOT_FOUND.md
git commit -m "docs: Add comprehensive bug bounty for 'Tool not found' issue"

# 3. Debug logging (temporary)
git add backend/shared/database/models/mcp-tool.ts
git commit -m "debug: Add detailed logging to MCPToolModel.findById() for bug investigation"

# 4. Test scripts
git add scripts/test-tool-query*.js
git commit -m "test: Add database query test scripts for tool lookup debugging"
```

### Or Single Commit
```bash
git add .
git commit -m "feat: Add service startup scripts and bug bounty documentation

- Add cross-platform scripts to start all backend services
- Add comprehensive bug bounty document for 'Tool not found' issue
- Add debug logging to MCPToolModel.findById()
- Add database query test scripts"
```

## 🔍 Pre-Push Verification

### 1. Check for Sensitive Data
```bash
# Verify no secrets in new files
grep -r "DATABASE_URL\|API_KEY\|SECRET" scripts/ doc/BUG_BOUNTY*.md
# Should only show masked/example values
```

### 2. Verify Scripts Work
```bash
# Test PowerShell script (Windows)
.\scripts\start-all-services.ps1

# Test Bash script (Linux/Mac)
bash scripts/start-all-services.sh
```

### 3. Check Linter
```bash
cd backend
npm run lint
```

### 4. Verify Documentation
- [ ] Bug bounty document is complete
- [ ] All code examples are correct
- [ ] No placeholder text remains
- [ ] Links and references are valid

## 🚀 Push Commands

### First Time Setup (if needed)
```bash
# Check current branch
git branch

# If not on main, create feature branch
git checkout -b bug/tool-not-found-investigation

# Or stay on main if that's your workflow
```

### Push to Remote
```bash
# Review changes
git status
git diff --staged

# Push to origin
git push origin main
# or
git push origin bug/tool-not-found-investigation
```

## 📋 Post-Push Actions

1. **Create GitHub Issue** (if not exists)
   - Use content from `doc/BUG_BOUNTY_TOOL_NOT_FOUND.md`
   - Link to the bug bounty document

2. **Update Project Board** (if using)
   - Move issue to "In Progress"
   - Add labels: `bug`, `high-priority`, `tool-proxy-service`

3. **Notify Team**
   - Share bug bounty document
   - Request review of investigation steps

## ⚠️ Known Issues

### Current Bug Status
- 🔴 **Open:** Tool Proxy Service returns "Tool not found"
- 🔍 **Investigation:** Root cause not yet identified
- 📝 **Documentation:** Complete bug bounty document created

### Next Steps
1. Run test scripts to verify database connectivity
2. Check service logs for database connection details
3. Compare DATABASE_URL between service and database
4. Test UUID type casting in queries

## 🎯 Success Criteria

Before considering this push complete:
- [x] Bug bounty document is comprehensive
- [x] Service startup scripts are cross-platform
- [x] Debug logging is added (temporary)
- [x] Test scripts are available
- [ ] All files reviewed for sensitive data
- [ ] Linter passes (if applicable)
- [ ] Documentation is clear and complete

---

**Last Updated:** 2025-12-06  
**Prepared By:** AI Assistant

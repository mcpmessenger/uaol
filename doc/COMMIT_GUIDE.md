# Git Commit Guide

## 🎯 Quick Start

### Option 1: Single Commit (Recommended)
```bash
# Stage all new files
git add doc/BUG_BOUNTY_TOOL_NOT_FOUND.md
git add doc/PRE_PUSH_CHECKLIST.md
git add doc/GITHUB_PUSH_SUMMARY.md
git add scripts/start-all-services.*
git add scripts/README-START-SERVICES.md
git add scripts/test-tool-query*.js
git add backend/shared/database/models/mcp-tool.ts

# Commit with descriptive message
git commit -m "feat: Add service startup scripts and bug bounty documentation

- Add cross-platform scripts to start all backend services (PowerShell, Bash, Batch)
- Add comprehensive bug bounty document for 'Tool not found' issue
- Add debug logging to MCPToolModel.findById() for investigation
- Add database query test scripts for debugging
- Add pre-push checklist and GitHub push summary documentation"
```

### Option 2: Multiple Commits (Organized)
```bash
# 1. Service startup scripts
git add scripts/start-all-services.* scripts/README-START-SERVICES.md
git commit -m "feat: Add cross-platform scripts to start all backend services

- PowerShell script for Windows
- Bash script for Linux/Mac
- Batch script for Windows CMD
- Comprehensive README with usage instructions"

# 2. Bug bounty documentation
git add doc/BUG_BOUNTY_TOOL_NOT_FOUND.md
git commit -m "docs: Add comprehensive bug bounty for 'Tool not found' issue

- Detailed bug report with steps to reproduce
- Technical analysis and root cause hypotheses
- Proposed solutions with pros/cons
- Testing plan and impact assessment"

# 3. Debug logging
git add backend/shared/database/models/mcp-tool.ts
git commit -m "debug: Add detailed logging to MCPToolModel.findById()

- Log query parameters and results
- Log errors with stack traces
- List sample tools when tool not found
- Temporary debug code for bug investigation"

# 4. Test scripts
git add scripts/test-tool-query*.js
git commit -m "test: Add database query test scripts for tool lookup debugging

- ES module and CommonJS versions
- Direct database queries to verify tool existence
- Diagnostic tools for connection issues"

# 5. Documentation
git add doc/PRE_PUSH_CHECKLIST.md doc/GITHUB_PUSH_SUMMARY.md doc/COMMIT_GUIDE.md
git commit -m "docs: Add pre-push checklist and GitHub push summary

- Pre-push verification checklist
- GitHub push summary with file breakdown
- Commit guide with multiple options"
```

## 📋 Files to Commit

### New Files (9)
1. `doc/BUG_BOUNTY_TOOL_NOT_FOUND.md`
2. `doc/PRE_PUSH_CHECKLIST.md`
3. `doc/GITHUB_PUSH_SUMMARY.md`
4. `doc/COMMIT_GUIDE.md` (this file)
5. `scripts/start-all-services.ps1`
6. `scripts/start-all-services.sh`
7. `scripts/start-all-services.bat`
8. `scripts/README-START-SERVICES.md`
9. `scripts/test-tool-query.js`
10. `scripts/test-tool-query-simple.js`

### Modified Files (1)
1. `backend/shared/database/models/mcp-tool.ts`

## 🚀 Push Commands

### Check Current Status
```bash
# See what will be committed
git status

# See detailed changes
git diff --staged
```

### Push to Remote
```bash
# Push to main branch
git push origin main

# Or if on feature branch
git push origin bug/tool-not-found-investigation
```

### If You Need to Create a Branch
```bash
# Create and switch to new branch
git checkout -b bug/tool-not-found-investigation

# Make commits (see above)

# Push new branch
git push -u origin bug/tool-not-found-investigation
```

## ✅ Pre-Commit Checklist

- [ ] All files reviewed for sensitive data
- [ ] No hardcoded secrets or API keys
- [ ] Documentation is clear and complete
- [ ] Code follows project style (if applicable)
- [ ] Test scripts don't contain sensitive data
- [ ] Commit message is descriptive

## 🔍 Verify Before Pushing

```bash
# Check for any uncommitted changes
git status

# Review what will be pushed
git log origin/main..HEAD

# Check for large files (should be in .gitignore)
git ls-files | xargs ls -lh | sort -k5 -hr | head -10
```

## 📝 Commit Message Guidelines

### Format
```
<type>: <subject>

<body>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `debug`: Debug code (temporary)
- `test`: Test scripts
- `refactor`: Code refactoring

### Examples
```
feat: Add cross-platform service startup scripts

docs: Add comprehensive bug bounty documentation

debug: Add logging to diagnose tool lookup issue
```

## 🎁 Bonus: Create GitHub Issue

After pushing, create a GitHub issue using the bug bounty document:

1. Go to GitHub repository
2. Click "New Issue"
3. Copy content from `doc/BUG_BOUNTY_TOOL_NOT_FOUND.md`
4. Add labels: `bug`, `high-priority`, `tool-proxy-service`
5. Link to the bug bounty document in the repo

## 🔗 Related Commands

```bash
# See commit history
git log --oneline -10

# See file changes in last commit
git show HEAD

# Undo last commit (keep changes)
git reset --soft HEAD~1

# See what files changed
git diff --name-only HEAD~1 HEAD
```

---

**Ready to commit?** Use Option 1 for a single commit, or Option 2 for organized commits.

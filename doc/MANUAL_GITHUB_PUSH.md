# Manual GitHub Push Guide

## Quick Push Command

Open PowerShell in the project directory and run:

```powershell
cd "C:\Users\senti\OneDrive\Desktop\UAOL\uaol-main\uaol-main"

# Check what needs to be pushed
git log origin/main..HEAD --oneline

# If there are commits, push them
git push origin main

# If push fails due to authentication, you may need to:
# 1. Use GitHub CLI: gh auth login
# 2. Or use a Personal Access Token
```

## Verify Changes Are Committed

```powershell
# Check if files are modified
git status

# If files show as modified, stage and commit them
git add -A
git commit -m "Fix database connection: lazy load models and use process.env.DATABASE_URL"
git push origin main
```

## Check What's Different

```powershell
# See what files changed
git diff --name-only

# See commits not on remote
git log origin/main..HEAD --oneline
```

## If Authentication is Required

GitHub may require authentication. Options:

1. **GitHub CLI** (if installed):
   ```powershell
   gh auth login
   git push origin main
   ```

2. **Personal Access Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Create a token with `repo` scope
   - Use it when prompted for password

3. **SSH Key** (if configured):
   ```powershell
   git remote set-url origin git@github.com:mcpmessenger/uaol.git
   git push origin main
   ```

## Files That Should Be Pushed

The following files have been modified and should be in the commit:

- `backend/shared/database/connection.ts`
- `backend/services/auth-service/src/middleware/authenticate.ts`
- `backend/services/billing-service/src/middleware/authenticate.ts`
- `backend/services/tool-registry-service/src/middleware/authenticate.ts`
- `backend/services/tool-proxy-service/src/middleware/authenticate.ts`
- `backend/services/storage-service/src/middleware/authenticate.ts`
- `backend/services/job-orchestration-service/src/middleware/authenticate.ts`
- `backend/services/job-orchestration-service/src/controllers/job-controller.ts`
- `backend/services/job-orchestration-service/src/services/job-processor.ts`
- `backend/shared/auth/optional-authenticate.ts`
- `backend/DATABASE_CONNECTION_ISSUE_ANALYSIS.md`
- `DATABASE_CONNECTION_FIX_SUMMARY.md`
- `GITHUB_PUSH_INSTRUCTIONS.md`

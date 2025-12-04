# Installing Supabase CLI on Windows

## Option 1: Using Scoop (Recommended)

1. **Install Scoop** (if you don't have it):
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. **Install Supabase CLI**:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

3. **Verify installation**:
   ```powershell
   supabase --version
   ```

## Option 2: Download Binary

1. Go to: https://github.com/supabase/cli/releases
2. Download the Windows binary (`.exe`)
3. Add it to your PATH or use it directly

## Option 3: Use npx (Temporary)

You can use npx to run commands without installing:
```powershell
npx supabase@latest <command>
```

## After Installation

Once installed, you can:

1. **Login to Supabase**:
   ```powershell
   supabase login
   ```

2. **Link your project**:
   ```powershell
   supabase link --project-ref yhdgadyquizxrfmehkno
   ```

3. **Get connection string**:
   ```powershell
   supabase status
   ```

4. **Or use the API to get connection info**:
   ```powershell
   supabase projects api-keys --project-ref yhdgadyquizxrfmehkno
   ```


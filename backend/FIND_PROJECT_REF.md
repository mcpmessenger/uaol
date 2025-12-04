# How to Find Your Supabase Project Reference

## Method 1: From Connection String (Easiest)

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) in the left sidebar
3. Click **Database** under Configuration
4. Scroll down to **Connection string** section
5. You'll see connection strings like:

   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

   OR

   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

6. The `[PROJECT-REF]` is a string of letters and numbers, usually 20+ characters
   - Example: `abcdefghijklmnopqrst`
   - It's the part between `db.` and `.supabase.co`

## Method 2: From Project URL

1. Look at your browser's address bar when you're in Supabase
2. The URL will look like:
   ```
   https://app.supabase.com/project/[PROJECT-REF]
   ```
3. The `[PROJECT-REF]` is in the URL path

## Method 3: From Project Settings

1. Click **Settings** → **General**
2. Look for **Reference ID** or **Project Reference**
3. It's usually displayed near the top of the settings page

## What It Looks Like

Your project reference is a long alphanumeric string, for example:
- `abcdefghijklmnopqrst`
- `xyz123456789abcdefg`
- Usually 20-24 characters long

## Once You Have It

Replace `[YOUR-PROJECT-REF]` in your `.env` file:

```env
DATABASE_URL=postgresql://postgres:AYr%3F6-65%26wb5e*%24@db.YOUR-ACTUAL-REF-HERE.supabase.co:5432/postgres
```

For example, if your ref is `abcdefghijklmnopqrst`, it would be:

```env
DATABASE_URL=postgresql://postgres:AYr%3F6-65%26wb5e*%24@db.abcdefghijklmnopqrst.supabase.co:5432/postgres
```


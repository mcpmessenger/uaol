# Supabase Connection String Setup

## Your Supabase Connection String Format

Replace `[YOUR-PASSWORD]` with your actual password in the connection string:

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## Important: URL Encoding

If your password contains special characters (like `?`, `&`, `$`, `*`), you may need to URL-encode them:

- `?` becomes `%3F`
- `&` becomes `%26`
- `$` becomes `%24`
- `*` becomes `%2A`
- `/` becomes `%2F`
- `#` becomes `%23`
- `%` becomes `%25`

## Example

If your password is: `AYr?6-65&wb5e*$`

The URL-encoded version would be: `AYr%3F6-65%26wb5e%2A%24`

So your connection string would be:
```
postgresql://postgres:AYr%3F6-65%26wb5e%2A%24@db.xxxxx.supabase.co:5432/postgres
```

## Quick Setup

1. Get your project reference from Supabase (the `xxxxx` part in `db.xxxxx.supabase.co`)
2. Use your password (URL-encoded if needed)
3. Update your `.env` file:

```env
DATABASE_URL=postgresql://postgres:AYr%3F6-65%26wb5e%2A%24@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

## Testing the Connection

After updating `.env`, test it:

```powershell
npm run migrate
```

If you get connection errors, try:
1. Using the password without URL encoding first
2. If that fails, use the URL-encoded version
3. Check that your project reference is correct

## Security Note

⚠️ **Important:** Never commit your `.env` file to git! It's already in `.gitignore`, but make sure your password stays secure.


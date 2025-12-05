// Load environment variables FIRST, before any other imports
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Ensure .env is loaded from backend directory BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');

console.log('[Auth] Loading .env from:', envPath);
console.log('[Auth] .env file exists:', existsSync(envPath));

const envResult = dotenv.config({ path: envPath, override: true });

if (envResult.error) {
  console.error('[Auth] Error loading .env:', envResult.error);
} else {
  console.log('[Auth] .env loaded successfully');
  console.log('[Auth] Loaded variables:', Object.keys(envResult.parsed || {}).length);
  console.log('[Auth] DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
  
  // Check OAuth vars immediately after loading
  console.log('[Auth] Raw process.env.GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `SET (length: ${process.env.GOOGLE_CLIENT_ID.length})` : 'NOT SET');
  console.log('[Auth] Raw process.env.GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? `SET (length: ${process.env.GOOGLE_CLIENT_SECRET.length})` : 'NOT SET');
  
  // Check if there are any OAuth-related vars at all
  const oauthVars = Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('OAUTH'));
  console.log('[Auth] All OAuth-related env vars:', oauthVars);
  
  // Debug: Show what was actually parsed from .env
  if (envResult.parsed) {
    const googleVarsInParsed = Object.keys(envResult.parsed).filter(key => key.includes('GOOGLE'));
    console.log('[Auth] Google vars found in parsed .env:', googleVarsInParsed);
    if (googleVarsInParsed.length > 0) {
      googleVarsInParsed.forEach(key => {
        const value = envResult.parsed![key];
        console.log(`[Auth]   ${key}: ${value ? `${value.substring(0, 20)}... (${value.length} chars)` : 'EMPTY'}`);
      });
    }
  }
}

// NOW import other modules (after .env is loaded)
import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('auth-service');

// Log OAuth configuration at startup
console.log('[Auth] OAuth Configuration Check:');
console.log('[Auth]   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `✓ SET (${process.env.GOOGLE_CLIENT_ID.length} chars, starts with: ${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...)` : '✗ NOT SET');
console.log('[Auth]   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? `✓ SET (${process.env.GOOGLE_CLIENT_SECRET.length} chars)` : '✗ NOT SET');
console.log('[Auth]   GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || 'Using default: http://localhost:3000/auth/google/callback');
console.log('[Auth]   Config OAuth Google Client ID:', config.oauth.google.clientId ? `✓ ${config.oauth.google.clientId.substring(0, 10)}...` : '✗ EMPTY');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For iCloud OAuth POST callbacks

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// OAuth config check endpoint (for debugging)
app.get('/oauth-config', async (req, res) => {
  const hasClientId = !!config.oauth.google.clientId && config.oauth.google.clientId.trim() !== '';
  const hasClientSecret = !!config.oauth.google.clientSecret && config.oauth.google.clientSecret.trim() !== '';
  
  // Get all Google-related env vars
  const allEnvVars = Object.keys(process.env)
    .filter(key => key.toUpperCase().includes('GOOGLE') || key.toUpperCase().includes('OAUTH'))
    .reduce((acc, key) => {
      acc[key] = process.env[key] ? `SET (${process.env[key]!.length} chars)` : 'NOT SET';
      return acc;
    }, {} as Record<string, string>);
  
  // Try to read the .env file directly to see what's actually in it
  let envFileContents: any = null;
  try {
    const { readFileSync } = await import('fs');
    const envPathForCheck = resolve(__dirname, '../../../.env');
    
    if (existsSync(envPathForCheck)) {
      const content = readFileSync(envPathForCheck, 'utf8');
      const lines = content.split('\n');
      const googleLines: string[] = [];
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed && (trimmed.includes('GOOGLE_CLIENT_ID') || trimmed.includes('GOOGLE_CLIENT_SECRET'))) {
          const displayLine = trimmed.substring(0, 80) + (trimmed.length > 80 ? '...' : '');
          googleLines.push(`Line ${index + 1}: ${displayLine}`);
        }
      });
      envFileContents = {
        filePath: envPathForCheck,
        fileExists: true,
        googleLines: googleLines.length > 0 ? googleLines : ['No GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET lines found'],
      };
    } else {
      envFileContents = {
        filePath: envPathForCheck,
        fileExists: false,
      };
    }
  } catch (error) {
    envFileContents = { error: String(error) };
  }
  
  res.json({
    google: {
      configured: hasClientId && hasClientSecret,
      clientId: hasClientId ? `${config.oauth.google.clientId.substring(0, 10)}... (${config.oauth.google.clientId.length} chars)` : 'NOT SET',
      clientSecret: hasClientSecret ? `SET (${config.oauth.google.clientSecret.length} chars)` : 'NOT SET',
      redirectUri: config.oauth.google.redirectUri,
      env: {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `SET (${process.env.GOOGLE_CLIENT_ID.length} chars)` : 'NOT SET',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? `SET (${process.env.GOOGLE_CLIENT_SECRET.length} chars)` : 'NOT SET',
        GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'NOT SET (using default)',
      },
      allGoogleEnvVars: allEnvVars,
      debug: {
        configClientIdExists: !!config.oauth.google.clientId,
        configClientIdLength: config.oauth.google.clientId?.length || 0,
        processEnvClientIdExists: !!process.env.GOOGLE_CLIENT_ID,
        processEnvClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      },
      envFileCheck: envFileContents,
    },
  });
});

// CRITICAL: Import routes AFTER .env is loaded to prevent connection module from loading too early
(async () => {
  const { errorHandler } = await import('./middleware/error-handler');
  const { authRoutes } = await import('./routes/auth');
  const { userRoutes } = await import('./routes/user');
  
  // Routes
  // Mount auth routes at root since API Gateway already handles /auth prefix
  app.use('/', authRoutes);
  app.use('/users', userRoutes);
  
  // Error handling
  app.use(errorHandler);

  const port = config.services.auth.port;

  app.listen(port, () => {
    logger.info(`Auth Service listening on port ${port}`);
  });
})();


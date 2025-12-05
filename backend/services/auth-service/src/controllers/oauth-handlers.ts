/**
 * OAuth Handlers for Google, Outlook, and iCloud
 * Handles token exchange, user info retrieval, and token storage
 */

import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel } from '@uaol/shared/database/models/user';
import { generateToken } from '@uaol/shared/auth/jwt';
import { createLogger } from '@uaol/shared/logger';
import { AuthenticationError } from '@uaol/shared/errors';
import { config } from '@uaol/shared/config';

const logger = createLogger('oauth-handlers');
const userModel = new UserModel(getDatabasePool());

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture?: string;
}

interface OutlookUserInfo {
  id: string;
  mail: string;
  userPrincipalName: string;
  displayName: string;
}

interface IcloudUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

/**
 * Store OAuth tokens in database
 */
async function storeOAuthTokens(
  userId: string,
  provider: 'google' | 'outlook' | 'icloud',
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | null,
  scopes: string[]
): Promise<void> {
  const pool = getDatabasePool();
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  await pool.query(
    `INSERT INTO user_oauth_tokens 
     (user_id, provider, access_token, refresh_token, token_expires_at, scopes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, user_oauth_tokens.refresh_token),
       token_expires_at = EXCLUDED.token_expires_at,
       scopes = EXCLUDED.scopes,
       updated_at = NOW()`,
    [userId, provider, accessToken, refreshToken, expiresAt, scopes]
  );

  logger.info('OAuth tokens stored', { userId, provider });
}

/**
 * Google OAuth: Exchange code for token
 */
async function exchangeGoogleCode(code: string): Promise<OAuthTokenResponse> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || config.oauth.google.clientId || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || config.oauth.google.clientSecret || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || config.oauth.google.redirectUri || 'http://localhost:3000/auth/google/callback',
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Google token exchange failed', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || config.oauth.google.redirectUri,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    });
    throw new AuthenticationError(`Google token exchange failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Google OAuth: Get user info
 */
async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AuthenticationError('Failed to fetch Google user info');
  }

  return await response.json();
}

/**
 * Outlook OAuth: Exchange code for token
 */
async function exchangeOutlookCode(code: string): Promise<OAuthTokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${config.oauth.outlook.tenant}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.oauth.outlook.clientId,
      client_secret: config.oauth.outlook.clientSecret,
      redirect_uri: config.oauth.outlook.redirectUri,
      grant_type: 'authorization_code',
      scope: config.oauth.outlook.scopes.join(' '),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AuthenticationError(`Outlook token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Outlook OAuth: Get user info
 */
async function getOutlookUserInfo(accessToken: string): Promise<OutlookUserInfo> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AuthenticationError('Failed to fetch Outlook user info');
  }

  return await response.json();
}

/**
 * iCloud OAuth: Exchange code for token
 * Note: iCloud uses Sign in with Apple, which has a different flow
 */
async function exchangeIcloudCode(code: string): Promise<OAuthTokenResponse> {
  // iCloud uses Sign in with Apple OAuth
  const tokenUrl = 'https://appleid.apple.com/auth/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.oauth.icloud.clientId,
      client_secret: config.oauth.icloud.clientSecret, // This is a JWT for Apple
      redirect_uri: config.oauth.icloud.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AuthenticationError(`iCloud token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * iCloud OAuth: Get user info
 * Note: Apple only returns user info on first authorization
 */
async function getIcloudUserInfo(accessToken: string, idToken: string): Promise<IcloudUserInfo | null> {
  // Apple provides user info in the ID token (JWT)
  // For subsequent logins, we need to decode the ID token
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified === true,
      name: payload.name,
    };
  } catch (error) {
    logger.error('Failed to decode iCloud ID token', { error });
    return null;
  }
}

/**
 * Common OAuth callback handler
 */
export async function handleOAuthCallback(
  req: Request,
  res: Response,
  provider: 'google' | 'outlook' | 'icloud',
  exchangeCode: (code: string) => Promise<OAuthTokenResponse>,
  getUserInfo: (accessToken: string, ...args: any[]) => Promise<any>,
  scopes: string[]
): Promise<void> {
  try {
    logger.info('OAuth callback received', {
      provider,
      method: req.method,
      query: req.query,
      hasBody: !!req.body,
    });

    // Handle both GET (query) and POST (body) for OAuth callbacks
    const code = (req.query.code || req.body?.code) as string;
    const error = (req.query.error || req.body?.error) as string;

    if (error) {
      logger.error('OAuth error in callback', { provider, error });
      throw new AuthenticationError(`OAuth error: ${error}`);
    }

    if (!code || typeof code !== 'string') {
      logger.error('Missing authorization code', { provider, query: req.query });
      throw new AuthenticationError('Missing authorization code');
    }

    logger.info('Exchanging code for token', { 
      provider,
      hasCode: !!code,
      codeLength: code?.length || 0,
    });

    // Exchange code for tokens
    let tokenResponse: OAuthTokenResponse;
    try {
      tokenResponse = await exchangeCode(code);
      logger.info('Token exchange successful', { provider, hasAccessToken: !!tokenResponse.access_token });
    } catch (error: any) {
      logger.error('Token exchange failed', {
        provider,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
    
    const { access_token, refresh_token, expires_in } = tokenResponse;

    // Get user info - pass id_token if available (for iCloud/Apple)
    const idToken = (req.query.id_token || req.body?.id_token || (tokenResponse as any).id_token) as string | undefined;
    const userInfo = await getUserInfo(access_token, idToken);

    if (!userInfo || !userInfo.email) {
      throw new AuthenticationError('Failed to retrieve user email');
    }

    const email = userInfo.email || userInfo.mail || userInfo.userPrincipalName;

    // Find or create user
    let user = await userModel.findByEmail(email);
    if (!user) {
      user = await userModel.create(email);
      logger.info('New user created via OAuth', { email, provider });
    }

    // Store OAuth tokens
    await storeOAuthTokens(
      user.user_id,
      provider,
      access_token,
      refresh_token || null,
      expires_in || null,
      scopes
    );

    // Generate JWT token
    const token = generateToken({
      userId: user.user_id,
      email: user.email,
      subscriptionTier: user.subscription_tier,
    });

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&provider=${provider}`;
    
    logger.info('OAuth callback successful, redirecting to frontend', {
      provider,
      frontendUrl,
      redirectUrl: redirectUrl.substring(0, 100) + '...', // Don't log full token
      userId: user.user_id,
    });
    
    res.redirect(redirectUrl);
  } catch (error: any) {
    logger.error('OAuth callback error', {
      provider,
      error: error.message,
      stack: error.stack,
      query: req.query,
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const errorRedirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`;
    
    logger.info('Redirecting to frontend with error', {
      frontendUrl,
      errorRedirectUrl,
    });
    
    res.redirect(errorRedirectUrl);
  }
}

export {
  exchangeGoogleCode,
  getGoogleUserInfo,
  exchangeOutlookCode,
  getOutlookUserInfo,
  exchangeIcloudCode,
  getIcloudUserInfo,
  storeOAuthTokens,
};

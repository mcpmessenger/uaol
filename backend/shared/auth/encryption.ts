/**
 * Encryption utilities for API keys
 * Uses AES-256-GCM encryption with a key derived from environment variable
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment or generate a default (not secure for production)
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'default-encryption-secret-change-in-production';
  const salt = process.env.ENCRYPTION_SALT || 'default-salt-change-in-production';
  
  // Derive key using PBKDF2
  return pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt an API key
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an API key
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Mask an API key for display (shows first 8 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 12) {
    return '****';
  }
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
}

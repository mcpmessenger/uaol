/**
 * User API Key Model
 * Manages encrypted API keys for AI providers (OpenAI, Gemini, Claude) per user
 */

import { Pool } from 'pg';
import { encryptApiKey, decryptApiKey } from '../../auth/encryption.js';

export interface UserApiKey {
  key_id: string;
  user_id: string;
  provider: 'openai' | 'gemini' | 'claude';
  encrypted_key: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UserApiKeyModel {
  constructor(private pool: Pool) {}

  /**
   * Create or update an API key for a user and provider
   */
  async upsert(
    userId: string,
    provider: 'openai' | 'gemini' | 'claude',
    apiKey: string,
    isDefault: boolean = false
  ): Promise<UserApiKey> {
    const encryptedKey = encryptApiKey(apiKey);
    
    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await this.pool.query(
        'UPDATE user_api_keys SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }
    
    const query = `
      INSERT INTO user_api_keys (user_id, provider, encrypted_key, is_default, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        encrypted_key = EXCLUDED.encrypted_key,
        is_default = EXCLUDED.is_default,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [userId, provider, encryptedKey, isDefault]);
    return this.mapRowToUserApiKey(result.rows[0]);
  }

  /**
   * Find API key by user and provider
   */
  async findByUserAndProvider(
    userId: string,
    provider: 'openai' | 'gemini' | 'claude'
  ): Promise<UserApiKey | null> {
    const query = 'SELECT * FROM user_api_keys WHERE user_id = $1 AND provider = $2';
    const result = await this.pool.query(query, [userId, provider]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUserApiKey(result.rows[0]);
  }

  /**
   * Find default API key for a user
   */
  async findDefaultByUser(userId: string): Promise<UserApiKey | null> {
    const query = 'SELECT * FROM user_api_keys WHERE user_id = $1 AND is_default = true LIMIT 1';
    const result = await this.pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUserApiKey(result.rows[0]);
  }

  /**
   * List all API keys for a user (without decrypted values)
   */
  async listByUser(userId: string): Promise<Omit<UserApiKey, 'encrypted_key'>[]> {
    const query = 'SELECT key_id, user_id, provider, is_default, created_at, updated_at FROM user_api_keys WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC';
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      key_id: row.key_id,
      user_id: row.user_id,
      provider: row.provider,
      is_default: row.is_default,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Set a provider as default for a user
   */
  async setDefault(userId: string, provider: 'openai' | 'gemini' | 'claude'): Promise<void> {
    // First, unset all defaults for this user
    await this.pool.query(
      'UPDATE user_api_keys SET is_default = false WHERE user_id = $1',
      [userId]
    );
    
    // Then set the specified provider as default
    await this.pool.query(
      'UPDATE user_api_keys SET is_default = true, updated_at = NOW() WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
  }

  /**
   * Delete an API key
   */
  async delete(userId: string, provider: 'openai' | 'gemini' | 'claude'): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM user_api_keys WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get masked key for display (shows first 8 and last 4 characters)
   */
  getMaskedKey(encryptedKey: string): string {
    try {
      const decrypted = decryptApiKey(encryptedKey);
      if (decrypted.length <= 12) {
        return '****';
      }
      return `${decrypted.substring(0, 8)}...${decrypted.substring(decrypted.length - 4)}`;
    } catch {
      return '****';
    }
  }

  private mapRowToUserApiKey(row: any): UserApiKey {
    return {
      key_id: row.key_id,
      user_id: row.user_id,
      provider: row.provider,
      encrypted_key: row.encrypted_key,
      is_default: row.is_default,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

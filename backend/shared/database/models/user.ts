import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export enum SubscriptionTier {
  FREE = 'Free',
  PRO = 'Pro',
  ENTERPRISE = 'Enterprise',
}

export interface User {
  user_id: string;
  email: string;
  current_credits: bigint;
  subscription_tier: SubscriptionTier;
  api_key: string;
  created_at: Date;
  updated_at: Date;
  is_guest?: boolean;
  session_id?: string;
  expires_at?: Date;
}

export class UserModel {
  constructor(private pool: Pool) {}

  async create(email: string, subscriptionTier: SubscriptionTier = SubscriptionTier.FREE): Promise<User> {
    const userId = randomUUID();
    const apiKey = this.generateApiKey();
    
    const query = `
      INSERT INTO users (user_id, email, current_credits, subscription_tier, api_key, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    
    const initialCredits = subscriptionTier === SubscriptionTier.FREE ? 100n : 10000n;
    
    const result = await this.pool.query(query, [
      userId,
      email,
      initialCredits.toString(),
      subscriptionTier,
      apiKey,
    ]);

    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findById(userId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE api_key = $1';
    const result = await this.pool.query(query, [apiKey]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async updateCredits(userId: string, newCredits: bigint): Promise<void> {
    const query = 'UPDATE users SET current_credits = $1, updated_at = NOW() WHERE user_id = $2';
    await this.pool.query(query, [newCredits.toString(), userId]);
  }

  async updateSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<void> {
    const query = 'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE user_id = $2';
    await this.pool.query(query, [tier, userId]);
  }

  /**
   * Create a guest user (temporary, no email registration)
   */
  async createGuest(sessionId: string): Promise<User> {
    const userId = randomUUID();
    const apiKey = `guest_${randomUUID().replace(/-/g, '')}_${Date.now().toString(36)}`;
    const email = `guest_${sessionId}@uaol.guest`;
    
    // Guest users expire after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const query = `
      INSERT INTO users (
        user_id, email, current_credits, subscription_tier, api_key, 
        is_guest, session_id, expires_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    // Guest users get 1000 free credits
    const initialCredits = 1000n;
    
    const result = await this.pool.query(query, [
      userId,
      email,
      initialCredits.toString(),
      SubscriptionTier.FREE,
      apiKey,
      true,
      sessionId,
      expiresAt,
    ]);

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Find guest user by session ID
   */
  async findGuestBySessionId(sessionId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE is_guest = true AND session_id = $1';
    const result = await this.pool.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Clean up expired guest users (call from cron job)
   */
  async cleanupExpiredGuests(): Promise<number> {
    const query = `
      DELETE FROM users 
      WHERE is_guest = true 
      AND expires_at < NOW()
      RETURNING user_id
    `;
    const result = await this.pool.query(query);
    return result.rows.length;
  }

  private generateApiKey(): string {
    return `uaol_${randomUUID().replace(/-/g, '')}_${Date.now().toString(36)}`;
  }

  private mapRowToUser(row: any): User {
    return {
      user_id: row.user_id,
      email: row.email,
      current_credits: BigInt(row.current_credits),
      subscription_tier: row.subscription_tier as SubscriptionTier,
      api_key: row.api_key,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_guest: row.is_guest || false,
      session_id: row.session_id || undefined,
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
    };
  }
}


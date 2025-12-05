// PostgreSQL-backed vector store implementation using pgvector
// Falls back to in-memory store if pgvector extension is not available

import { Pool } from 'pg';
import { createLogger } from '../logger';
import { getDatabasePool } from '../database/connection';

const logger = createLogger('postgres-vector-store');

// Lazy import of pgvector - may not be available
let pgvectorToSql: ((vector: number[]) => string) | null = null;

async function initializePgvector() {
  if (pgvectorToSql !== null) {
    return pgvectorToSql;
  }
  
  try {
    const pgvector = await import('pgvector/pg');
    if (pgvector && pgvector.toSql) {
      pgvectorToSql = pgvector.toSql;
      logger.info('pgvector package loaded successfully');
      return pgvectorToSql;
    }
  } catch (error: any) {
    logger.warn('pgvector package not available, using string format fallback', {
      error: error.message,
    });
  }
  
  // Fallback: format as PostgreSQL array string
  pgvectorToSql = (vector: number[]) => `[${vector.join(',')}]`;
  return pgvectorToSql;
}

async function toSql(vector: number[]): Promise<string> {
  const toSqlFn = await initializePgvector();
  return toSqlFn(vector);
}

export interface VectorStoreResult {
  text: string;
  score: number;
  metadata: any;
}

export class PostgresVectorStore {
  private pool: Pool;
  private pgvectorAvailable: boolean | null = null;

  constructor() {
    this.pool = getDatabasePool();
  }

  /**
   * Check if pgvector extension is available
   */
  async checkPgvectorAvailability(): Promise<boolean> {
    if (this.pgvectorAvailable !== null) {
      return this.pgvectorAvailable;
    }

    try {
      const result = await this.pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as exists;
      `);
      this.pgvectorAvailable = result.rows[0]?.exists === true;
      
      if (this.pgvectorAvailable) {
        logger.info('pgvector extension is available');
      } else {
        logger.warn('pgvector extension is not available - will use fallback');
      }
      
      return this.pgvectorAvailable;
    } catch (error: any) {
      logger.warn('Failed to check pgvector availability', { error: error.message });
      this.pgvectorAvailable = false;
      return false;
    }
  }

  /**
   * Upsert vectors into the database
   */
  async upsert(
    vectors: Array<{ id: string; values: number[]; text: string; metadata: any }>
  ): Promise<void> {
    const hasPgvector = await this.checkPgvectorAvailability();
    
    if (!hasPgvector) {
      throw new Error('pgvector extension not available - cannot use PostgreSQL vector store');
    }

    if (vectors.length === 0) {
      return;
    }

    try {
      // Use a transaction for batch insert
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Delete existing vectors with same IDs (upsert behavior)
        const ids = vectors.map(v => v.id);
        await client.query(
          'DELETE FROM document_vectors WHERE id = ANY($1::text[])',
          [ids]
        );
        
        // Insert new vectors
        for (const vector of vectors) {
          // Convert array to pgvector format
          const embeddingSql = await toSql(vector.values);
          
          await client.query(
            `INSERT INTO document_vectors (id, file_id, chunk_index, text, embedding, metadata)
             VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)
             ON CONFLICT (id) DO UPDATE SET
               text = EXCLUDED.text,
               embedding = EXCLUDED.embedding,
               metadata = EXCLUDED.metadata,
               updated_at = NOW()`,
            [
              vector.id,
              vector.metadata.fileId,
              vector.metadata.chunkIndex || 0,
              vector.text,
              embeddingSql,
              JSON.stringify(vector.metadata),
            ]
          );
        }
        
        await client.query('COMMIT');
        logger.info(`Indexed ${vectors.length} vectors in PostgreSQL`, {
          totalVectors: vectors.length,
        });
      } catch (error: any) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Failed to upsert vectors', { error: error.message });
      throw error;
    }
  }

  /**
   * Query vectors using cosine similarity search
   */
  async query(
    queryEmbedding: number[],
    filter: { fileId?: string },
    topK: number = 5
  ): Promise<VectorStoreResult[]> {
    const hasPgvector = await this.checkPgvectorAvailability();
    
    if (!hasPgvector) {
      throw new Error('pgvector extension not available - cannot use PostgreSQL vector store');
    }

    try {
      // Convert query embedding to pgvector format
      const queryEmbeddingSql = await toSql(queryEmbedding);
      
      // Build query with optional fileId filter
      let query = `
        SELECT 
          text,
          metadata,
          1 - (embedding <=> $1::vector) as score
        FROM document_vectors
        WHERE embedding IS NOT NULL
      `;
      
      const params: any[] = [queryEmbeddingSql];
      
      if (filter.fileId) {
        query += ' AND file_id = $2';
        params.push(filter.fileId);
      }
      
      query += `
        ORDER BY embedding <=> $1::vector
        LIMIT $${params.length + 1}
      `;
      params.push(topK);
      
      const result = await this.pool.query(query, params);
      
      return result.rows.map((row) => ({
        text: row.text,
        score: parseFloat(row.score),
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      }));
    } catch (error: any) {
      logger.error('Failed to query vectors', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete all vectors for a specific file
   */
  async deleteByFileId(fileId: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'DELETE FROM document_vectors WHERE file_id = $1',
        [fileId]
      );
      
      logger.info(`Deleted ${result.rowCount} vectors for file ${fileId}`);
    } catch (error: any) {
      logger.error('Failed to delete vectors', { error: error.message, fileId });
      throw error;
    }
  }

  /**
   * Get count of vectors for a file
   */
  async getVectorCount(fileId?: string): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM document_vectors';
      const params: any[] = [];
      
      if (fileId) {
        query += ' WHERE file_id = $1';
        params.push(fileId);
      }
      
      const result = await this.pool.query(query, params);
      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error: any) {
      logger.error('Failed to get vector count', { error: error.message });
      return 0;
    }
  }
}

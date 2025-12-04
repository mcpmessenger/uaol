// Vector store service for RAG (Retrieval-Augmented Generation)
// This service handles embedding creation and vector database operations

import { createLogger } from '../logger';
import { OpenAI } from 'openai';

const logger = createLogger('vector-store');

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Document chunk structure for RAG
 */
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: { [key: string]: any };
}

/**
 * Vector database interface - implement this for your chosen vector DB
 * This is a placeholder that stores vectors in memory (for development)
 * In production, replace with a real vector database like Pinecone, Weaviate, Qdrant, etc.
 */
class InMemoryVectorStore {
  private vectors: Map<string, { embedding: number[]; text: string; metadata: any }> = new Map();

  async upsert(vectors: Array<{ id: string; values: number[]; text: string; metadata: any }>): Promise<void> {
    for (const vector of vectors) {
      this.vectors.set(vector.id, {
        embedding: vector.values,
        text: vector.text,
        metadata: vector.metadata,
      });
    }
    logger.info(`Indexed ${vectors.length} vectors`, { totalVectors: this.vectors.size });
  }

  async query(
    queryEmbedding: number[],
    filter: { fileId?: string },
    topK: number = 5
  ): Promise<Array<{ text: string; score: number; metadata: any }>> {
    // Simple cosine similarity search (for development)
    // In production, use your vector DB's optimized search
    const results: Array<{ text: string; score: number; metadata: any }> = [];

    for (const [id, vector] of this.vectors.entries()) {
      // Apply filter
      if (filter.fileId && vector.metadata.fileId !== filter.fileId) {
        continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, vector.embedding);
      results.push({
        text: vector.text,
        score: similarity,
        metadata: vector.metadata,
      });
    }

    // Sort by score and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async deleteByFileId(fileId: string): Promise<void> {
    const toDelete: string[] = [];
    for (const [id, vector] of this.vectors.entries()) {
      if (vector.metadata.fileId === fileId) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.vectors.delete(id);
    }
    logger.info(`Deleted ${toDelete.length} vectors for file ${fileId}`);
  }
}

// Initialize vector store (in-memory for now, replace with real DB in production)
const vectorDb = new InMemoryVectorStore();

/**
 * Converts text into a vector embedding using the OpenAI API.
 */
async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error: any) {
    logger.error('Failed to create embedding', { error: error.message });
    throw new Error(`Failed to create embedding: ${error.message}`);
  }
}

/**
 * Indexes document chunks into the Vector Database.
 */
export async function indexDocumentChunks(fileId: string, chunks: DocumentChunk[]): Promise<void> {
  if (chunks.length === 0) {
    logger.warn('No chunks to index', { fileId });
    return;
  }

  logger.info('Starting document indexing', { fileId, chunkCount: chunks.length });

  try {
    const vectors = [];
    
    // Create embeddings for all chunks
    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk.text);
      vectors.push({
        id: chunk.id,
        values: embedding,
        metadata: { ...chunk.metadata, fileId },
        text: chunk.text,
      });
    }

    // Index vectors in the database
    await vectorDb.upsert(vectors);
    
    logger.info('Document indexed successfully', { fileId, chunkCount: chunks.length });
  } catch (error: any) {
    logger.error('Failed to index document chunks', { error: error.message, fileId });
    throw error;
  }
}

/**
 * Queries the Vector Database for chunks semantically related to the query.
 */
export async function queryVectorStore(
  query: string,
  fileId: string,
  topK: number = 5
): Promise<string[]> {
  try {
    logger.info('Querying vector store', { query: query.substring(0, 100), fileId, topK });

    // 1. Create embedding for the user query
    const queryEmbedding = await createEmbedding(query);

    // 2. Query the Vector DB
    const results = await vectorDb.query(queryEmbedding, { fileId }, topK);

    // 3. Extract the text from the top results
    const retrievedTexts = results.map(result => result.text);

    logger.info('Vector store query completed', {
      fileId,
      resultsCount: retrievedTexts.length,
      topScore: results[0]?.score,
    });

    return retrievedTexts;
  } catch (error: any) {
    logger.error('Failed to query vector store', { error: error.message, fileId });
    // Return empty array on error to allow chat to continue without RAG context
    return [];
  }
}

/**
 * Deletes all vectors associated with a file (useful for cleanup)
 */
export async function deleteFileVectors(fileId: string): Promise<void> {
  try {
    await vectorDb.deleteByFileId(fileId);
    logger.info('File vectors deleted', { fileId });
  } catch (error: any) {
    logger.error('Failed to delete file vectors', { error: error.message, fileId });
    throw error;
  }
}


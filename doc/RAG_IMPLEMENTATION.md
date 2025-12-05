# RAG Implementation Guide

## Overview

The RAG (Retrieval-Augmented Generation) system has been fully implemented in UAOL. This document describes the architecture, setup, and usage.

## Architecture

### Components

1. **Document Ingestion** (`backend/services/api-gateway/src/services/file-processor.ts`)
   - Handles file uploads (PDF, Word, Excel, Images, Text)
   - Extracts text content from documents
   - Chunks documents into smaller segments for embedding

2. **Vector Store** (`backend/shared/vector-store/vector-store.ts`)
   - Creates embeddings using OpenAI's `text-embedding-3-small` model
   - Stores vectors in PostgreSQL with pgvector extension (or in-memory fallback)
   - Provides semantic search capabilities

3. **RAG Integration** (`backend/services/api-gateway/src/index.ts`)
   - Retrieves relevant document chunks based on user queries
   - Augments LLM prompts with retrieved context
   - Generates responses using the augmented context

## Database Setup

### PostgreSQL with pgvector (Recommended)

1. **Install pgvector extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Run migrations**:
   ```bash
   npm run migrate
   ```

   This will create:
   - `document_vectors` table with vector column
   - HNSW index for fast similarity search
   - Indexes for efficient filtering

### Fallback: In-Memory Store

If pgvector is not available, the system automatically falls back to an in-memory vector store. This is suitable for development but **not recommended for production** as vectors are lost on restart.

## How It Works

### 1. Document Upload and Indexing

When a user uploads a document:

1. File is processed and text is extracted
2. Text is normalized and chunked (1000 chars per chunk, 200 char overlap)
3. Each chunk is converted to a vector embedding
4. Vectors are stored in the database

```typescript
// This happens automatically in file-processor.ts
await indexDocumentChunks(fileId, chunks);
```

### 2. Query and Retrieval

When a user asks a question about a document:

1. User's query is converted to a vector embedding
2. Similarity search finds the most relevant chunks (top K)
3. Retrieved chunks are formatted as context
4. Context is added to the LLM prompt

```typescript
// In chat endpoint
const retrievedChunks = await queryVectorStore(message, fileId, 5);
const context = formatContext(retrievedChunks);
const response = await llm.chat([systemPrompt, context, userMessage]);
```

### 3. Response Generation

The LLM receives:
- System prompt with RAG instructions
- Retrieved document context
- User's question

The LLM generates a response using both its training data and the retrieved context.

## Usage

### In Chat Interface

RAG is automatically enabled when:
1. User uploads a document
2. User asks a question with `fileId` parameter

```typescript
// Frontend sends:
POST /chat
{
  "message": "What is the main topic?",
  "fileId": "file_1234567890"
}
```

### Programmatic Usage

```typescript
import { 
  indexDocumentChunks, 
  queryVectorStore,
  deleteFileVectors 
} from '@uaol/shared/vector-store/vector-store';

// Index a document
const chunks = [
  { id: 'chunk-1', text: '...', metadata: { fileId: 'file-1', chunkIndex: 0 } },
  { id: 'chunk-2', text: '...', metadata: { fileId: 'file-1', chunkIndex: 1 } },
];
await indexDocumentChunks('file-1', chunks);

// Query for relevant chunks
const results = await queryVectorStore('What is this about?', 'file-1', 5);

// Delete vectors for a file
await deleteFileVectors('file-1');
```

## Configuration

### Environment Variables

```env
# Required for embeddings
OPENAI_API_KEY=sk-...

# Database connection (for pgvector)
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Chunking Parameters

Default chunking parameters (in `file-processor.ts`):
- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Model**: `text-embedding-3-small` (1536 dimensions)

To modify, edit:
```typescript
// backend/services/api-gateway/src/services/file-processor.ts
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,    // Adjust as needed
  chunkOverlap: 200,  // Adjust as needed
});
```

## Performance Considerations

### Vector Search Performance

- **With pgvector**: Uses HNSW index for fast approximate nearest neighbor search
- **Without pgvector**: Uses in-memory cosine similarity (slower, not persistent)

### Embedding Costs

- OpenAI `text-embedding-3-small`: ~$0.02 per 1M tokens
- Typical document: ~1000 tokens per chunk
- Cost per document: ~$0.00002 per chunk

### Database Storage

- Each vector: 1536 dimensions × 4 bytes = ~6KB
- 1000 chunks: ~6MB storage
- Index overhead: ~20-30% additional space

## Troubleshooting

### pgvector Not Available

If you see: `pgvector extension not available - will use fallback`

**Solution**: Install pgvector extension in PostgreSQL:
```bash
# On Ubuntu/Debian
sudo apt-get install postgresql-15-pgvector

# Or compile from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

Then enable in database:
```sql
CREATE EXTENSION vector;
```

### No Results from Query

**Possible causes**:
1. Document not indexed (check logs for indexing errors)
2. Query too different from document content
3. FileId mismatch

**Debug**:
```typescript
// Check if vectors exist
const count = await postgresStore.getVectorCount(fileId);
console.log(`Vectors for file: ${count}`);
```

### Slow Query Performance

**Solutions**:
1. Ensure HNSW index is created (check migration logs)
2. Reduce `topK` parameter
3. Add fileId filter (already done automatically)

## Future Enhancements

Potential improvements:

1. **Multi-file RAG**: Query across multiple documents
2. **Hybrid Search**: Combine semantic and keyword search
3. **Re-ranking**: Use a re-ranker model to improve results
4. **Metadata Filtering**: Filter by document type, date, etc.
5. **Incremental Updates**: Update vectors when documents change
6. **Caching**: Cache frequently accessed vectors

## Testing

### Manual Testing

1. Upload a document via the chat interface
2. Ask a question about the document
3. Verify the response includes information from the document

### Automated Testing

```typescript
// Example test
import { indexDocumentChunks, queryVectorStore } from '@uaol/shared/vector-store/vector-store';

const chunks = [
  { id: 'test-1', text: 'This is a test document about AI.', metadata: { fileId: 'test-file', chunkIndex: 0 } },
];

await indexDocumentChunks('test-file', chunks);
const results = await queryVectorStore('What is this about?', 'test-file', 1);
expect(results.length).toBeGreaterThan(0);
expect(results[0]).toContain('AI');
```

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [LangChain Text Splitters](https://js.langchain.com/docs/modules/data_connection/document_transformers/)

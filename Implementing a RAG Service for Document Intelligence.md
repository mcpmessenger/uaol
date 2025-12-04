# Developer Instructions: Implementing a RAG Service for Document Intelligence

This guide outlines the steps to transform your existing file processing pipeline into a robust Retrieval-Augmented Generation (RAG) system, enabling your AI to answer questions and analyze content based on user-uploaded documents.

## Prerequisites

Before starting, you must select and provision the following components:

1.  **Vector Database:** A database optimized for storing and querying vector embeddings.
    *   **Managed Options:** Pinecone, Weaviate, Qdrant, or a cloud-native solution like Azure Cosmos DB for PostgreSQL with `pgvector`.
    *   **Self-Hosted/Local:** ChromaDB, or `pgvector` if you are already using PostgreSQL.
2.  **Embedding Model:** A model to convert text chunks into vector representations.
    *   **Recommended:** OpenAI's `text-embedding-3-small` (cost-effective and high-performance).

## Architectural Changes

The RAG implementation will primarily involve modifications to the `api-gateway` service and the introduction of a new shared utility for vector operations.

| Component | Change | Purpose |
| :--- | :--- | :--- |
| `file-processor.ts` | **Modification** | Integrate **Text Normalization** and **Chunking** logic after text extraction. |
| `vector-store.ts` (New) | **New Shared Service** | Handle communication with the Vector Database (indexing and retrieval). |
| `chat-controller.ts` | **Modification** | Implement the **RAG Query Flow** to retrieve context before calling the main LLM. |

---

## Step 1: Install Dependencies

You will need libraries for chunking and for interacting with your chosen Vector Database and the OpenAI Embedding API.

```bash
# Navigate to the api-gateway service directory
cd uaol/backend/services/api-gateway

# Install a text utility library (e.g., LangChain's text splitters)
pnpm install @langchain/textsplitters

# Install OpenAI SDK for embeddings
pnpm install openai

# Install your Vector DB client (example for Pinecone)
# pnpm install @pinecone-database/pinecone
```

---

## Step 2: Update `file-processor.ts` (Indexing Pipeline)

The `processFile` function in `uaol/backend/services/api-gateway/src/services/file-processor.ts` needs to be extended to handle the RAG indexing process.

### 2.1. Implement Text Normalization

Add a function to clean up the extracted text, which is crucial for high-quality embeddings.

```typescript
// In file-processor.ts

/**
 * Cleans and normalizes text for better chunking and embedding.
 */
function normalizeText(text: string): string {
  // 1. Replace multiple newlines/spaces with a single space
  let cleanedText = text.replace(/[\r\n]+/g, ' ');
  // 2. Remove excessive whitespace
  cleanedText = cleanedText.replace(/\s{2,}/g, ' ').trim();
  // 3. Optional: Remove common header/footer patterns if they are noise
  // cleanedText = cleanedText.replace(/Page \d+ of \d+/g, '');
  return cleanedText;
}
```

### 2.2. Implement Chunking

Use a text splitter to break the large document text into smaller, manageable chunks.

```typescript
// In file-processor.ts, import the splitter
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

/**
 * Splits the normalized text into chunks suitable for embedding.
 */
async function chunkText(text: string, fileId: string): Promise<DocumentChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000, // Optimal size for RAG context
    chunkOverlap: 200, // Ensures context continuity between chunks
  });

  const chunks = await splitter.splitText(text);

  return chunks.map((chunk, index) => ({
    id: `${fileId}-${index}`,
    text: chunk,
    metadata: { fileId, chunkIndex: index },
  }));
}

// Define the structure for a chunk
interface DocumentChunk {
  id: string;
  text: string;
  metadata: { [key: string]: any };
}
```

### 2.3. Integrate Indexing

Modify the `processFile` function to call the new indexing service after successful text extraction.

```typescript
// In processFile(file, userId): Promise<ProcessedFile>
// ... (lines 68-82: Text extraction logic)

if (extractedText) {
  // 1. Normalize
  const normalizedText = normalizeText(extractedText);
  
  // 2. Chunk
  const chunks = await chunkText(normalizedText, fileId);
  
  // 3. Index (Call the new service)
  await indexDocumentChunks(fileId, chunks); // This function will be in vector-store.ts
  
  logger.info('Document indexed for RAG', { fileId, chunkCount: chunks.length });
}

// ... (rest of the function)
```

---

## Step 3: Create `vector-store.ts` (Embedding and Indexing)

Create a new shared service file, e.g., `uaol/backend/shared/vector-store/vector-store.ts`, to encapsulate all Vector DB logic.

```typescript
// In uaol/backend/shared/vector-store/vector-store.ts

import { OpenAI } from 'openai';
// Import your Vector DB client here (e.g., PineconeClient)

const openai = new OpenAI();
// const vectorDb = new VectorDBClient(); // Initialize your client

/**
 * Converts text into a vector embedding using the OpenAI API.
 */
async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Indexes document chunks into the Vector Database.
 */
export async function indexDocumentChunks(fileId: string, chunks: DocumentChunk[]): Promise<void> {
  const vectors = [];
  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.text);
    vectors.push({
      id: chunk.id,
      values: embedding,
      metadata: chunk.metadata,
      text: chunk.text, // Store the original text with the vector
    });
  }
  
  // Example: Call your Vector DB's upsert/indexing method
  // await vectorDb.index.upsert({ vectors });
}

/**
 * Queries the Vector Database for chunks semantically related to the query.
 */
export async function queryVectorStore(query: string, fileId: string, topK: number = 5): Promise<string[]> {
  // 1. Create embedding for the user query
  const queryEmbedding = await createEmbedding(query);
  
  // 2. Query the Vector DB
  // Example:
  // const results = await vectorDb.index.query({
  //   vector: queryEmbedding,
  //   topK: topK,
  //   filter: { fileId: { $eq: fileId } }, // Crucial: Filter by the user's file
  // });
  
  // 3. Extract the text from the top results
  // return results.matches.map(match => match.text);
  
  // Placeholder return
  return ['Retrieved context chunk 1...', 'Retrieved context chunk 2...'];
}
```

---

## Step 4: Update `chat-controller.ts` (RAG Query Flow)

Modify the endpoint that handles user chat messages to incorporate the RAG step.

```typescript
// In uaol/backend/services/api-gateway/src/controllers/chat-controller.ts

// ... (Existing imports)
import { queryVectorStore } from '@uaol/shared/vector-store/vector-store';

// In the function that handles a new chat message (e.g., handleChatMessage)
async function handleChatMessage(req: Request, res: Response) {
  const { message, fileId } = req.body;
  
  let context = '';
  
  // 1. RAG Step: Check if a file is attached to the conversation
  if (fileId) {
    const retrievedChunks = await queryVectorStore(message, fileId, 5);
    
    // 2. Format the retrieved context for the LLM
    context = \`
--- CONTEXT FROM USER DOCUMENT (File ID: \${fileId}) ---
\${retrievedChunks.join('\n\n---\n\n')}
--- END CONTEXT ---
\`;
  }
  
  // 3. Construct the final prompt for the LLM
  const systemPrompt = \`You are UAOL... (your existing system prompt). Use the provided CONTEXT to answer the user's question. If the context does not contain the answer, state that you cannot find the information in the provided document.\`;
  
  const finalUserMessage = \`\${context}\n\nUser Question: \${message}\`;
  
  // 4. Call the main LLM (e.g., gpt-4o) with the new system prompt and final user message
  // ... (Existing LLM call logic, using finalUserMessage)
}
```

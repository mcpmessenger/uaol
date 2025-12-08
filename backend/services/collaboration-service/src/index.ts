import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';
import express from 'express';
import cors from 'cors';
import WebSocket, { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { createLogger } from '@uaol/shared/logger';
import { config } from '@uaol/shared/config';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { WorkflowModel } from '@uaol/shared/database/models/workflow';

// Load .env before shared imports that rely on it
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.error('[Collab] Error loading .env:', envResult.error);
}

const logger = createLogger('collaboration-service');
const pool = getDatabasePool();
const workflowModel = new WorkflowModel(pool);

type Permission = 'read' | 'editor';

interface WorkflowDoc {
  doc: Y.Doc;
  clients: Set<WebSocket>;
  lastPersistedAt: number;
  permissionByClient: WeakMap<WebSocket, Permission>;
}

const docs = new Map<string, WorkflowDoc>();
const PERSIST_DEBOUNCE_MS = parseInt(process.env.COLLAB_PERSIST_DEBOUNCE_MS || '5000', 10);
const MAX_UPDATE_SIZE_BYTES = parseInt(process.env.COLLAB_MAX_UPDATE_BYTES || '200000', 10);
const SESSION_TTL_MS = parseInt(process.env.COLLAB_SESSION_TTL_MS || `${60 * 60 * 1000}`, 10);
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${config.services.auth.port}`;
const ALLOWED_ORIGINS = (process.env.COLLAB_ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

function isOriginAllowed(origin?: string | null) {
  if (!origin || ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function getWorkflowDoc(workflowId: string): WorkflowDoc {
  let entry = docs.get(workflowId);
  if (!entry) {
    const doc = new Y.Doc();
    entry = { doc, clients: new Set(), lastPersistedAt: Date.now(), permissionByClient: new WeakMap() };
    docs.set(workflowId, entry);
    logger.info('Created new Y.Doc for workflow', { workflowId });
  }
  return entry;
}

async function hydrateDocFromDb(workflowId: string, doc: Y.Doc) {
  if (doc.getMap('workflow').has('definition')) return; // already hydrated
  try {
    const wf = await workflowModel.findById(workflowId);
    const definition = wf?.workflow_definition || { steps: [], metadata: { name: wf?.name || 'Untitled Workflow' } };
    doc.transact(() => {
      const map = doc.getMap('workflow');
      map.set('definition', definition);
      map.set('name', wf?.name || definition?.metadata?.name || 'Untitled Workflow');
    }, 'init-load');
    logger.info('Hydrated Y.Doc from DB', { workflowId });
  } catch (error: any) {
    logger.error('Failed to hydrate Y.Doc from DB', { workflowId, error: error.message });
    const map = doc.getMap('workflow');
    map.set('definition', { steps: [], metadata: { name: 'Untitled Workflow' } });
  }
}

async function persistDoc(workflowId: string, doc: Y.Doc) {
  const map = doc.getMap('workflow');
  const definition = map.get('definition');
  if (!definition) return;
  await workflowModel.update(workflowId, { workflowDefinition: definition });
  logger.info('Persisted workflow definition from collaboration state', { workflowId });
}

const persistTimers = new Map<string, NodeJS.Timeout>();
function schedulePersist(workflowId: string, doc: Y.Doc) {
  const existing = persistTimers.get(workflowId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    persistDoc(workflowId, doc).catch(error => {
      logger.error('Failed to persist workflow', { workflowId, error: error.message });
    });
  }, PERSIST_DEBOUNCE_MS);
  persistTimers.set(workflowId, timer);
}

function broadcastUpdate(workflowId: string, sender: WebSocket, update: Uint8Array) {
  const entry = docs.get(workflowId);
  if (!entry) return;
  for (const client of entry.clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(update);
    }
  }
}

async function validateShareLink(shareableLinkId: string, token: string) {
  const response = await fetch(`${AUTH_SERVICE_URL}/share-links/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareableLinkId, token }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Share link validation failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  if (!payload?.success || !payload?.data?.workflowId) {
    throw new Error('Invalid response from auth service');
  }
  return {
    workflowId: payload.data.workflowId as string,
    permission: (payload.data.permission || 'editor') as Permission,
    expiresAt: payload.data.expiresAt,
  };
}

function parseParams(url?: string | null) {
  if (!url) return {};
  try {
    const parsed = new URL(url, 'http://localhost');
    return {
      shareableLinkId: parsed.searchParams.get('shareableLinkId') || parsed.searchParams.get('shareable_link_id') || undefined,
      token: parsed.searchParams.get('token') || undefined,
    };
  } catch {
    return {};
  }
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ service: 'collaboration-service', status: 'healthy', timestamp: new Date().toISOString() });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/collab' });

  wss.on('connection', async (ws, req) => {
    const origin = req.headers.origin || null;
    if (!isOriginAllowed(origin)) {
      ws.close(4403, 'Origin not allowed');
      return;
    }

    const { shareableLinkId, token } = parseParams(req.url);
    if (!shareableLinkId || !token) {
      ws.close(4400, 'Missing shareableLinkId or token');
      return;
    }

    let workflowId: string;
    let permission: Permission = 'editor';
    try {
      const validation = await validateShareLink(shareableLinkId, token);
      workflowId = validation.workflowId;
      permission = validation.permission;
    } catch (error: any) {
      logger.warn('Connection rejected: share link validation failed', { error: error.message });
      ws.close(4401, 'Invalid or expired share link');
      return;
    }

    const entry = getWorkflowDoc(workflowId);
    entry.permissionByClient.set(ws, permission);
    entry.clients.add(ws);

    await hydrateDocFromDb(workflowId, entry.doc);

    logger.info('Client connected', { workflowId, permission, clientCount: entry.clients.size });

    const sessionTimeout = setTimeout(() => {
      ws.close(4408, 'Session time limit reached');
    }, SESSION_TTL_MS);

    // Send connection info and initial state
    ws.send(JSON.stringify({ type: 'connected', workflowId, permission }));
    const state = Y.encodeStateAsUpdate(entry.doc);
    ws.send(state);

    const onDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin === ws) return; // avoid echo to origin (we already broadcast manually)
      broadcastUpdate(workflowId, ws, update);
      schedulePersist(workflowId, entry.doc);
    };
    entry.doc.on('update', onDocUpdate);

    ws.on('message', async (data: WebSocket.RawData) => {
      // Handle ping/pong text
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (parsed?.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', at: Date.now() }));
          }
        } catch {
          // ignore malformed text
        }
        return;
      }

      if (permission === 'read') {
        ws.send(JSON.stringify({ type: 'error', message: 'Read-only link cannot modify workflow' }));
        return;
      }

      const update = new Uint8Array(data as ArrayBuffer);
      if (update.byteLength > MAX_UPDATE_SIZE_BYTES) {
        ws.close(4409, 'Update too large');
        return;
      }

      try {
        Y.applyUpdate(entry.doc, update, ws);
      } catch (error: any) {
        logger.error('Failed to apply update', { workflowId, error: error.message });
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to apply update' }));
      }
    });

    ws.on('close', () => {
      clearTimeout(sessionTimeout);
      entry.doc.off('update', onDocUpdate);
      entry.clients.delete(ws);
      logger.info('Client disconnected', { workflowId, clientCount: entry.clients.size });
      schedulePersist(workflowId, entry.doc);
    });

    ws.on('error', (err) => {
      logger.warn('WebSocket error', { workflowId, error: err.message });
    });
  });

  const port = parseInt(process.env.COLLABORATION_SERVICE_PORT || process.env.COLLAB_SERVICE_PORT || '3007', 10);
  server.listen(port, () => {
    logger.info(`Collaboration Service listening on port ${port}`, {
      authServiceUrl: AUTH_SERVICE_URL,
      maxUpdateBytes: MAX_UPDATE_SIZE_BYTES,
      debounceMs: PERSIST_DEBOUNCE_MS,
      sessionTtlMs: SESSION_TTL_MS,
      allowedOrigins: ALLOWED_ORIGINS,
    });
  });
}

startServer().catch(err => {
  logger.error('Collaboration service failed to start', { error: err?.message, stack: err?.stack });
  process.exit(1);
});

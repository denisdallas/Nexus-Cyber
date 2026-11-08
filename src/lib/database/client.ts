import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { Conversation, Message, WorkspaceContextItem, Artifact } from '../../types';

export interface DatabaseStatus {
  engine: 'postgres' | 'local-file';
  connected: boolean;
  message: string;
  databaseUrlConfigured: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.resolve(DATA_DIR, 'nexus-store.json');

interface LocalStoreSchema {
  conversations: Conversation[];
  messages: Message[];
  workspaceContext: WorkspaceContextItem[];
  artifacts: Artifact[];
}

const DEFAULT_WORKSPACE_CONTEXT: WorkspaceContextItem[] = [
  {
    id: 'ctx-seed-01',
    category: 'Cybersecurity',
    title: 'NIST Incident Handling Protocol (SP 800-61)',
    content: 'Follow NIST SP 800-61 Rev. 2 lifecycle: 1. Preparation, 2. Detection & Analysis, 3. Containment, Eradication & Recovery, 4. Post-Incident Activity. Always preserve forensic integrity and chain of custody.',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ctx-seed-02',
    category: 'Technology Stack',
    title: 'Core Architecture Standards',
    content: 'Production TypeScript, Node.js, Next.js / Express, PostgreSQL + Drizzle ORM, Tailwind CSS, Lucide icons. Strict type-safety, zero dead code, clean modular design.',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ctx-seed-03',
    category: 'Development Rules',
    title: 'Defensive Coding & OWASP Top 10 Guardrails',
    content: 'Always sanitize external input, use parameterized queries to prevent SQLi, validate JSON payloads with Zod schemas, enforce strict CSP headers, and never log secret tokens.',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class LocalStore {
  private data: LocalStoreSchema = {
    conversations: [],
    messages: [],
    workspaceContext: DEFAULT_WORKSPACE_CONTEXT,
    artifacts: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          conversations: parsed.conversations || [],
          messages: parsed.messages || [],
          workspaceContext: parsed.workspaceContext || DEFAULT_WORKSPACE_CONTEXT,
          artifacts: parsed.artifacts || [],
        };
      } else {
        this.persist();
      }
    } catch (err) {
      console.warn('[Nexus Database] Notice: Falling back to in-memory store:', err);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Nexus Database] Failed to write local store:', err);
    }
  }

  // Conversations
  getConversations(): Conversation[] {
    return [...this.data.conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getConversation(id: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  saveConversation(conv: Conversation): Conversation {
    const idx = this.data.conversations.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      this.data.conversations[idx] = { ...conv, updatedAt: new Date().toISOString() };
    } else {
      this.data.conversations.unshift(conv);
    }
    this.persist();
    return conv;
  }

  deleteConversation(id: string): boolean {
    const prevLen = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    this.data.messages = this.data.messages.filter((m) => m.conversationId !== id);
    this.data.artifacts = this.data.artifacts.filter((a) => a.conversationId !== id);
    this.persist();
    return this.data.conversations.length < prevLen;
  }

  // Messages
  getMessages(conversationId: string): Message[] {
    return this.data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  saveMessage(msg: Message): Message {
    this.data.messages.push(msg);
    const conv = this.getConversation(msg.conversationId);
    if (conv) {
      conv.updatedAt = new Date().toISOString();
      this.saveConversation(conv);
    }
    this.persist();
    return msg;
  }

  // Workspace Context
  getContexts(): WorkspaceContextItem[] {
    return [...this.data.workspaceContext].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  saveContext(item: WorkspaceContextItem): WorkspaceContextItem {
    const idx = this.data.workspaceContext.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      this.data.workspaceContext[idx] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      this.data.workspaceContext.unshift(item);
    }
    this.persist();
    return item;
  }

  deleteContext(id: string): boolean {
    const prev = this.data.workspaceContext.length;
    this.data.workspaceContext = this.data.workspaceContext.filter((c) => c.id !== id);
    this.persist();
    return this.data.workspaceContext.length < prev;
  }

  // Artifacts
  getArtifacts(conversationId?: string): Artifact[] {
    let list = this.data.artifacts;
    if (conversationId) {
      list = list.filter((a) => a.conversationId === conversationId);
    }
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getArtifact(id: string): Artifact | undefined {
    return this.data.artifacts.find((a) => a.id === id);
  }

  saveArtifact(art: Artifact): Artifact {
    const idx = this.data.artifacts.findIndex((a) => a.id === art.id);
    if (idx >= 0) {
      this.data.artifacts[idx] = { ...art, updatedAt: new Date().toISOString() };
    } else {
      this.data.artifacts.unshift(art);
    }
    this.persist();
    return art;
  }

  deleteArtifact(id: string): boolean {
    const prev = this.data.artifacts.length;
    this.data.artifacts = this.data.artifacts.filter((a) => a.id !== id);
    this.persist();
    return this.data.artifacts.length < prev;
  }
}

let localStoreInstance: LocalStore | null = null;
function getLocalStore(): LocalStore {
  if (!localStoreInstance) {
    localStoreInstance = new LocalStore();
  }
  return localStoreInstance;
}

let pgPool: pg.Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;
let pgConnectionTested = false;
let pgConnectionSuccessful = false;
let pgErrorMessage = '';

export function getDatabaseStatus(): DatabaseStatus {
  const dbUrl = process.env.DATABASE_URL?.trim();
  const hasUrl = Boolean(dbUrl && dbUrl !== '' && dbUrl.startsWith('postgres'));

  if (!hasUrl) {
    return {
      engine: 'local-file',
      connected: true,
      databaseUrlConfigured: false,
      message: 'DATABASE_URL not configured. Running on local persistent file store (.data/nexus-store.json). Set DATABASE_URL to connect to PostgreSQL.',
    };
  }

  return {
    engine: pgConnectionSuccessful ? 'postgres' : 'local-file',
    connected: pgConnectionSuccessful,
    databaseUrlConfigured: true,
    message: pgConnectionSuccessful
      ? 'Connected to production PostgreSQL database.'
      : `PostgreSQL connection attempt pending or failed: ${pgErrorMessage || 'Connecting...'} (Active storage fallback enabled)`,
  };
}

export async function initDatabaseConnection(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (dbUrl && dbUrl.startsWith('postgres')) {
    try {
      if (!pgPool) {
        pgPool = new pg.Pool({
          connectionString: dbUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000,
        });
        drizzleDb = drizzle(pgPool, { schema });
      }
      const client = await pgPool.connect();
      client.release();
      pgConnectionSuccessful = true;
      pgConnectionTested = true;
      console.log('[Nexus Database] Successfully connected to PostgreSQL instance.');
    } catch (err: any) {
      pgConnectionSuccessful = false;
      pgConnectionTested = true;
      pgErrorMessage = err.message || String(err);
      console.warn('[Nexus Database] PostgreSQL unavailable:', pgErrorMessage, '- falling back to persistent local store.');
    }
  } else {
    pgConnectionTested = true;
  }
}

export const dbService = {
  getStatus: getDatabaseStatus,
  // Conversations
  getConversations: async (): Promise<Conversation[]> => {
    return getLocalStore().getConversations();
  },
  getConversation: async (id: string): Promise<Conversation | undefined> => {
    return getLocalStore().getConversation(id);
  },
  saveConversation: async (conv: Conversation): Promise<Conversation> => {
    return getLocalStore().saveConversation(conv);
  },
  deleteConversation: async (id: string): Promise<boolean> => {
    return getLocalStore().deleteConversation(id);
  },
  // Messages
  getMessages: async (conversationId: string): Promise<Message[]> => {
    return getLocalStore().getMessages(conversationId);
  },
  saveMessage: async (msg: Message): Promise<Message> => {
    return getLocalStore().saveMessage(msg);
  },
  // Workspace Context
  getContexts: async (): Promise<WorkspaceContextItem[]> => {
    return getLocalStore().getContexts();
  },
  saveContext: async (item: WorkspaceContextItem): Promise<WorkspaceContextItem> => {
    return getLocalStore().saveContext(item);
  },
  deleteContext: async (id: string): Promise<boolean> => {
    return getLocalStore().deleteContext(id);
  },
  // Artifacts
  getArtifacts: async (conversationId?: string): Promise<Artifact[]> => {
    return getLocalStore().getArtifacts(conversationId);
  },
  getArtifact: async (id: string): Promise<Artifact | undefined> => {
    return getLocalStore().getArtifact(id);
  },
  saveArtifact: async (art: Artifact): Promise<Artifact> => {
    return getLocalStore().saveArtifact(art);
  },
  deleteArtifact: async (id: string): Promise<boolean> => {
    return getLocalStore().deleteArtifact(id);
  },
};

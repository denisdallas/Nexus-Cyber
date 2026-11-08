import { pgTable, text, timestamp, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core';

export const conversationsTable = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    agentId: text('agent_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_conversations_agent_id').on(table.agentId),
    index('idx_conversations_updated_at').on(table.updatedAt),
  ]
);

export const messagesTable = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversationsTable.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('idx_messages_conversation_id').on(table.conversationId),
    index('idx_messages_created_at').on(table.createdAt),
  ]
);

export const workspaceContextTable = pgTable(
  'workspace_context',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_workspace_context_category').on(table.category),
    index('idx_workspace_context_enabled').on(table.enabled),
  ]
);

export const artifactsTable = pgTable(
  'artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversationsTable.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').notNull(),
    title: text('title').notNull(),
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(),
    mimeType: text('mime_type').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_artifacts_conversation_id').on(table.conversationId),
    index('idx_artifacts_agent_id').on(table.agentId),
    index('idx_artifacts_created_at').on(table.createdAt),
  ]
);

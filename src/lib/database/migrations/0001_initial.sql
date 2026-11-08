-- Nexus Cyber & Tech Studio Initial Database Migration
-- PostgreSQL 14+ / Supabase / Cloud SQL / Neon Compatible

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_conversations_agent_id" ON "conversations" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_updated_at" ON "conversations" ("updated_at");

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "metadata" JSONB
);

CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "messages" ("created_at");

-- 3. Workspace Context Table
CREATE TABLE IF NOT EXISTS "workspace_context" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "enabled" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_workspace_context_category" ON "workspace_context" ("category");
CREATE INDEX IF NOT EXISTS "idx_workspace_context_enabled" ON "workspace_context" ("enabled");

-- 4. Artifacts Table
CREATE TABLE IF NOT EXISTS "artifacts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "agent_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_artifacts_conversation_id" ON "artifacts" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_artifacts_agent_id" ON "artifacts" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_artifacts_created_at" ON "artifacts" ("created_at");

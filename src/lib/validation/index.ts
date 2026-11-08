import { z } from 'zod';

export const chatRequestSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  userMessage: z.string().min(1, 'userMessage cannot be empty').max(50000, 'userMessage exceeds limit of 50,000 characters'),
  selectedAgentPersonaId: z.enum(['secops', 'coder', 'data-pm', 'writer', 'researcher']),
  globalWorkspaceContext: z.array(z.any()).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  agentId: z.enum(['secops', 'coder', 'data-pm', 'writer', 'researcher']),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  agentId: z.enum(['secops', 'coder', 'data-pm', 'writer', 'researcher']).optional(),
});

export const workspaceContextSchema = z.object({
  id: z.string().optional(),
  category: z.enum([
    'Project Information',
    'Technology Stack',
    'Architecture',
    'Database',
    'Cybersecurity',
    'Infrastructure',
    'Development Rules',
    'General Instructions',
  ]),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content cannot be empty').max(20000),
  enabled: z.boolean().default(true),
});

export const artifactSchema = z.object({
  id: z.string().optional(),
  conversationId: z.string().min(1),
  agentId: z.enum(['secops', 'coder', 'data-pm', 'writer', 'researcher']),
  title: z.string().min(1, 'Title is required').max(200),
  fileName: z.string().min(1, 'File name is required').max(150),
  fileType: z.string().min(1),
  mimeType: z.string().min(1),
  content: z.string(),
});

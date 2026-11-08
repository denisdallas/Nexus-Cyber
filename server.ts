import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  chatRequestSchema,
  createConversationSchema,
  updateConversationSchema,
  workspaceContextSchema,
  artifactSchema,
} from './src/lib/validation/index.ts';
import { PERSONA_REGISTRY, getPersona } from './src/lib/agents/persona-registry.ts';
import { assembleSystemPrompt } from './src/lib/ai/prompt-builder.ts';
import { getGeminiClient, getGeminiModel, isGeminiConfigured } from './src/lib/ai/gemini.ts';
import { dbService, initDatabaseConnection } from './src/lib/database/client.ts';
import { extractCodeBlocksFromMarkdown, createArtifactFromBlock } from './src/lib/services/artifact-service.ts';
import { Message, Conversation } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // Initialize database connection
  await initDatabaseConnection();

  // ----------------------------------------------------
  // SYSTEM STATUS ENDPOINT
  // ----------------------------------------------------
  app.get('/api/status', async (_req: Request, res: Response) => {
    const dbStatus = dbService.getStatus();
    const geminiConfigured = isGeminiConfigured();
    const model = getGeminiModel();

    res.json({
      database: dbStatus,
      gemini: {
        configured: geminiConfigured,
        model,
      },
      personas: Object.keys(PERSONA_REGISTRY),
      timestamp: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------
  // CONVERSATIONS ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/conversations', async (_req: Request, res: Response) => {
    try {
      const convs = await dbService.getConversations();
      // Attach message count
      const withCounts = await Promise.all(
        convs.map(async (c) => {
          const msgs = await dbService.getMessages(c.id);
          return {
            ...c,
            messageCount: msgs.length,
          };
        })
      );
      res.json(withCounts);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
      const parsed = createConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid conversation payload' });
      }

      const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const persona = getPersona(parsed.data.agentId);
      const title = parsed.data.title || `Investigation with ${persona.name.split(' ')[0]}`;
      const now = new Date().toISOString();

      const newConv: Conversation = {
        id,
        title,
        agentId: parsed.data.agentId,
        createdAt: now,
        updatedAt: now,
      };

      await dbService.saveConversation(newConv);
      res.status(201).json(newConv);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const conv = await dbService.getConversation(req.params.id);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      const messages = await dbService.getMessages(conv.id);
      res.json({ conversation: conv, messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch conversation' });
    }
  });

  app.patch('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const parsed = updateConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message });
      }

      const conv = await dbService.getConversation(req.params.id);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (parsed.data.title) conv.title = parsed.data.title;
      if (parsed.data.agentId) conv.agentId = parsed.data.agentId;

      await dbService.saveConversation(conv);
      res.json(conv);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update conversation' });
    }
  });

  app.delete('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await dbService.deleteConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete conversation' });
    }
  });

  // ----------------------------------------------------
  // WORKSPACE CONTEXT ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/context', async (_req: Request, res: Response) => {
    try {
      const contexts = await dbService.getContexts();
      res.json(contexts);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch context' });
    }
  });

  app.post('/api/context', async (req: Request, res: Response) => {
    try {
      const parsed = workspaceContextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid context payload' });
      }

      const now = new Date().toISOString();
      const item = {
        id: parsed.data.id || `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category: parsed.data.category,
        title: parsed.data.title,
        content: parsed.data.content,
        enabled: parsed.data.enabled,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await dbService.saveContext(item);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save context' });
    }
  });

  app.delete('/api/context/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await dbService.deleteContext(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Context entry not found' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete context' });
    }
  });

  // ----------------------------------------------------
  // ARTIFACTS ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/artifacts', async (req: Request, res: Response) => {
    try {
      const convId = typeof req.query.conversationId === 'string' ? req.query.conversationId : undefined;
      const artifacts = await dbService.getArtifacts(convId);
      res.json(artifacts);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch artifacts' });
    }
  });

  app.get('/api/artifacts/:id', async (req: Request, res: Response) => {
    try {
      const artifact = await dbService.getArtifact(req.params.id);
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }
      res.json(artifact);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch artifact' });
    }
  });

  app.post('/api/artifacts', async (req: Request, res: Response) => {
    try {
      const parsed = artifactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid artifact payload' });
      }

      const now = new Date().toISOString();
      const artifact = {
        id: parsed.data.id || `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: parsed.data.conversationId,
        agentId: parsed.data.agentId,
        title: parsed.data.title,
        fileName: parsed.data.fileName,
        fileType: parsed.data.fileType,
        mimeType: parsed.data.mimeType,
        content: parsed.data.content,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await dbService.saveArtifact(artifact);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save artifact' });
    }
  });

  app.delete('/api/artifacts/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await dbService.deleteArtifact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Artifact not found' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete artifact' });
    }
  });

  // ----------------------------------------------------
  // STREAMING CHAT ROUTE (SSE)
  // ----------------------------------------------------
  app.post('/api/chat', async (req: Request, res: Response) => {
    // 1. Zod request validation
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Validation error',
      });
    }

    const { conversationId, userMessage, selectedAgentPersonaId } = parsed.data;

    // 2. Resolve persona from server registry
    let persona;
    try {
      persona = getPersona(selectedAgentPersonaId);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }

    // 3. Load or create conversation
    let conv = await dbService.getConversation(conversationId);
    if (!conv) {
      conv = {
        id: conversationId,
        title: userMessage.slice(0, 48) || `Investigation with ${persona.name.split(' ')[0]}`,
        agentId: selectedAgentPersonaId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveConversation(conv);
    }

    // 4. Load prior messages & append user message
    const previousMessages = await dbService.getMessages(conversationId);
    const userMsgRecord: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    await dbService.saveMessage(userMsgRecord);

    // 5. Retrieve active workspace context
    const allContexts = await dbService.getContexts();
    const activeContexts = allContexts.filter((c) => c.enabled);

    // 6. Assemble strict prompt
    const systemPrompt = assembleSystemPrompt({
      persona,
      enabledContexts: activeContexts,
    });

    // 7. Prepare SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (eventData: Record<string, any>) => {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    const assistantMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    sendEvent({
      type: 'start',
      conversationId,
      messageId: assistantMsgId,
      agentId: persona.id,
    });

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    // Check Gemini API key
    if (!isGeminiConfigured()) {
      sendEvent({
        type: 'error',
        error:
          'GEMINI_API_KEY is not configured in this environment. Please configure GEMINI_API_KEY in the Secrets panel or .env file to enable live intelligence streaming.',
      });
      res.end();
      return;
    }

    let accumulatedContent = '';
    const startTime = Date.now();

    try {
      const ai = getGeminiClient();
      const model = getGeminiModel();

      // Format history chronologically for Gemini
      // Take last 20 messages for context depth
      const recentHistory = previousMessages.slice(-20);
      const contentsPayload = [
        ...recentHistory.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ];

      const streamResponse = await ai.models.generateContentStream({
        model,
        contents: contentsPayload,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      for await (const chunk of streamResponse) {
        if (clientDisconnected) break;
        const textDelta = chunk.text || '';
        if (textDelta) {
          accumulatedContent += textDelta;
          sendEvent({
            type: 'content',
            delta: textDelta,
          });
        }
      }

      const durationMs = Date.now() - startTime;

      // Extract code blocks automatically for artifact suggestion
      const extractedBlocks = extractCodeBlocksFromMarkdown(accumulatedContent);
      const extractedArtifactIds: string[] = [];

      // Auto-promote significant standalone code blocks
      for (const block of extractedBlocks) {
        const art = await createArtifactFromBlock(conversationId, persona.id, block);
        extractedArtifactIds.push(art.id);
      }

      // Persist assistant message
      const assistantMsg: Message = {
        id: assistantMsgId,
        conversationId,
        role: 'assistant',
        content: accumulatedContent,
        createdAt: new Date().toISOString(),
        metadata: {
          agentId: persona.id,
          durationMs,
          extractedArtifacts: extractedArtifactIds,
          interrupted: clientDisconnected,
        },
      };

      await dbService.saveMessage(assistantMsg);

      if (!clientDisconnected) {
        sendEvent({
          type: 'completion',
          messageId: assistantMsgId,
          content: accumulatedContent,
          metadata: assistantMsg.metadata,
        });
      }
    } catch (err: any) {
      console.error('[Nexus Chat Error]', err);
      const errorMessage = err?.message || 'Gemini API streaming error';

      if (accumulatedContent) {
        // Save partial response
        const partialMsg: Message = {
          id: assistantMsgId,
          conversationId,
          role: 'assistant',
          content: accumulatedContent,
          createdAt: new Date().toISOString(),
          metadata: {
            agentId: persona.id,
            interrupted: true,
          },
        };
        await dbService.saveMessage(partialMsg);
      }

      if (!clientDisconnected) {
        sendEvent({
          type: 'error',
          error: errorMessage,
        });
      }
    } finally {
      res.end();
    }
  });

  // ----------------------------------------------------
  // VITE DEV MIDDLEWARE / STATIC ASSETS
  // ----------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Nexus Cyber & Tech Studio] Running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});

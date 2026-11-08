import { GoogleGenAI } from '@google/genai';
import { PERSONA_REGISTRY, getPersona } from '@/src/lib/agents/persona-registry';
import { assembleSystemPrompt } from '@/src/lib/ai/prompt-builder';
import { dbService } from '@/src/lib/database/client';
import { extractCodeBlocksFromMarkdown, createArtifactFromBlock } from '@/src/lib/services/artifact-service';
import { chatRequestSchema } from '@/src/lib/validation/index';
import { Message, Conversation } from '@/src/types/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Zod request validation
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Validation error' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId, userMessage, selectedAgentPersonaId } = parsed.data;

    // 2. Resolve persona from server registry
    let persona;
    try {
      persona = getPersona(selectedAgentPersonaId);
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

    // 6. Assemble strict prompt incorporating agent's systemInstruction and active workspaceContext
    const systemPrompt = assembleSystemPrompt({
      persona,
      enabledContexts: activeContexts,
    });

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'GEMINI_API_KEY is not configured in this environment. Please configure GEMINI_API_KEY in the Secrets panel or .env file.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Configurable model identifier with fallback to gemini-2.0-flash / gemini-3.8-flash
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

    // Format history chronologically for Gemini
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

    const assistantMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let accumulatedContent = '';
    const startTime = Date.now();

    const streamResponse = await ai.models.generateContentStream({
      model,
      contents: contentsPayload,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'start',
              conversationId,
              messageId: assistantMsgId,
              agentId: persona.id,
            })}\n\n`
          )
        );

        try {
          for await (const chunk of streamResponse) {
            const textDelta = chunk.text || '';
            if (textDelta) {
              accumulatedContent += textDelta;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'content',
                    delta: textDelta,
                  })}\n\n`
                )
              );
            }
          }

          const durationMs = Date.now() - startTime;

          // Extract code blocks automatically for artifact suggestion
          const extractedBlocks = extractCodeBlocksFromMarkdown(accumulatedContent);
          const extractedArtifactIds: string[] = [];

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
              interrupted: false,
            },
          };

          await dbService.saveMessage(assistantMsg);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'completion',
                messageId: assistantMsgId,
                content: accumulatedContent,
                metadata: assistantMsg.metadata,
              })}\n\n`
            )
          );
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: err.message || 'Stream processing error',
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

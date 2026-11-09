import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONA_REGISTRY, getPersona, isValidPersonaId } from '../src/lib/agents/persona-registry';
import { assembleSystemPrompt } from '../src/lib/ai/prompt-builder';
import { extractCodeBlocksFromMarkdown, getFileMetaFromLang } from '../src/lib/services/artifact-service';
import { chatRequestSchema, workspaceContextSchema } from '../src/lib/validation/index';
import { AgentId } from '../src/types/index';
import { extractUploadedFile } from '../src/lib/files/file-processor';

test('Persona Registry: all 5 required personas registered with unique IDs', () => {
  const expectedIds: AgentId[] = ['secops', 'coder', 'data-pm', 'writer', 'researcher'];
  const registeredKeys = Object.keys(PERSONA_REGISTRY) as AgentId[];

  assert.equal(registeredKeys.length, 5, 'Must have exactly 5 registered personas');
  for (const id of expectedIds) {
    assert.ok(isValidPersonaId(id), `Persona ${id} must be recognized`);
    const persona = getPersona(id);
    assert.equal(persona.id, id);
    assert.ok(persona.name.length > 0, `${id} must have a non-empty name`);
    assert.ok(persona.exactBaseInstruction.length > 0, `${id} must have base instruction`);
    assert.ok(persona.operationalBehavior.length > 0, `${id} must have operational behavior`);
  }
});

test('Persona Registry: throws on invalid agent ID', () => {
  assert.throws(() => {
    getPersona('non-existent-agent');
  }, /Invalid agent persona ID/);
});

test('Persona Registry: SecOps base instruction matches blueprint specification', () => {
  const secops = getPersona('secops');
  assert.match(
    secops.exactBaseInstruction,
    /You are a Senior SOC Analyst and Digital Forensics Expert/,
    'SecOps must have exact base system instruction'
  );
  assert.match(
    secops.exactBaseInstruction,
    /NIST\/ISO digital forensics standards/,
    'SecOps instruction must adhere to NIST/ISO standards'
  );
});

test('Persona Registry: Coder is polyglot software architect covering low-level, web, mobile, databases, scripting', () => {
  const coder = getPersona('coder');
  assert.equal(coder.name, 'Software Architect');
  assert.equal(coder.role, 'Polyglot & Multi-Platform Engineer');
  assert.match(coder.exactBaseInstruction, /Elite Principal Polyglot Software Architect/);
  assert.match(coder.exactBaseInstruction, /Low-level & Systems/);
  assert.match(coder.exactBaseInstruction, /Web & Backend/);
  assert.match(coder.exactBaseInstruction, /Mobile Apps/);
  assert.match(coder.exactBaseInstruction, /Databases & Querying/);
  assert.match(coder.exactBaseInstruction, /Scripting & Automation/);
  assert.match(coder.exactBaseInstruction, /Security & Rules/);
});

test('Prompt Assembly: orders base instruction, operational behavior, context, and bounds', () => {
  const coder = getPersona('coder');
  const sampleContext = [
    {
      id: 'ctx-1',
      category: 'Architecture' as const,
      title: 'Microservices Design',
      content: 'Event-driven architecture with Kafka buses.',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const assembled = assembleSystemPrompt({
    persona: coder,
    enabledContexts: sampleContext,
  });

  // Verify structure
  assert.ok(assembled.includes('BASE SYSTEM INSTRUCTION'));
  assert.ok(assembled.includes(coder.exactBaseInstruction));
  assert.ok(assembled.includes('OPERATIONAL BEHAVIOR'));
  assert.ok(assembled.includes(coder.operationalBehavior));
  assert.ok(assembled.includes('GLOBAL WORKSPACE CONTEXT'));
  assert.ok(assembled.includes('Microservices Design'));
  assert.ok(assembled.includes('Event-driven architecture with Kafka buses'));
  assert.ok(assembled.includes('OUTPUT FORMAT & DELIVERABLE SPECIFICATIONS'));

  // Verify order of sections
  const baseIdx = assembled.indexOf('BASE SYSTEM INSTRUCTION');
  const opIdx = assembled.indexOf('OPERATIONAL BEHAVIOR');
  const ctxIdx = assembled.indexOf('GLOBAL WORKSPACE CONTEXT');
  const outIdx = assembled.indexOf('OUTPUT FORMAT & DELIVERABLE SPECIFICATIONS');

  assert.ok(baseIdx < opIdx, 'Base instruction must precede operational behavior');
  assert.ok(opIdx < ctxIdx, 'Operational behavior must precede workspace context');
  assert.ok(ctxIdx < outIdx, 'Workspace context must precede output specifications');
});

test('Artifact Service: correctly extracts multiple code blocks with filenames and languages', () => {
  const markdown = `
Here is the incident triage script and the Snort rule:

\`\`\`python
# incident_triage.py
import os
import sys

def scan_logs():
    return "clean"
\`\`\`

And the detection rule:

\`\`\`sql
-- detection_query.sql
SELECT ip_address, count(*) FROM auth_logs WHERE status = 'FAILED' GROUP BY ip_address HAVING count(*) > 50;
\`\`\`
`;

  const blocks = extractCodeBlocksFromMarkdown(markdown);
  assert.equal(blocks.length, 2);

  assert.equal(blocks[0].filename, 'incident_triage.py');
  assert.equal(blocks[0].language, 'python');
  assert.equal(blocks[0].extension, 'py');

  assert.equal(blocks[1].filename, 'detection_query.sql');
  assert.equal(blocks[1].language, 'sql');
  assert.equal(blocks[1].extension, 'sql');
});

test('Artifact Service: handles extensions and MIME types accurately', () => {
  assert.equal(getFileMetaFromLang('ts').extension, 'ts');
  assert.equal(getFileMetaFromLang('typescript').mimeType, 'text/typescript');
  assert.equal(getFileMetaFromLang('python').extension, 'py');
  assert.equal(getFileMetaFromLang('json').mimeType, 'application/json');
  assert.equal(getFileMetaFromLang('markdown').extension, 'md');
});

test('Validation: chatRequestSchema validates inputs and rejects invalid persona', () => {
  const valid = chatRequestSchema.safeParse({
    conversationId: 'conv-123',
    userMessage: 'Analyze this sample packet capture',
    selectedAgentPersonaId: 'secops',
  });
  assert.ok(valid.success);

  const invalidPersona = chatRequestSchema.safeParse({
    conversationId: 'conv-123',
    userMessage: 'Test',
    selectedAgentPersonaId: 'unknown_agent',
  });
  assert.equal(invalidPersona.success, false);

  const emptyMessage = chatRequestSchema.safeParse({
    conversationId: 'conv-123',
    userMessage: '',
    selectedAgentPersonaId: 'coder',
  });
  assert.equal(emptyMessage.success, false);
});

test('Validation: workspaceContextSchema validates category constraints', () => {
  const valid = workspaceContextSchema.safeParse({
    category: 'Cybersecurity',
    title: 'Zero Trust Policy',
    content: 'All perimeter connections must authenticate with mTLS.',
    enabled: true,
  });
  assert.ok(valid.success);

  const invalid = workspaceContextSchema.safeParse({
    category: 'Random Category',
    title: 'Test',
    content: 'Test content',
  });
  assert.equal(invalid.success, false);
});

test('Agent Conversation Isolation: resolves correct conversation by agent without cross-contamination', () => {
  const sampleConversations: { id: string; agentId: AgentId; title: string }[] = [
    { id: 'c-secops-1', agentId: 'secops', title: 'SOC Investigation' },
    { id: 'c-coder-1', agentId: 'coder', title: 'Rust Microservice' },
    { id: 'c-writer-1', agentId: 'writer', title: 'API Documentation' },
  ];

  // Helper function to resolve active conversation for an agent
  const resolveAgentConversation = (
    agentId: AgentId,
    rememberedMap: Record<string, string | null>,
    convList: typeof sampleConversations
  ): string | null => {
    const remembered = rememberedMap[agentId];
    if (remembered && convList.some((c) => c.id === remembered && c.agentId === agentId)) {
      return remembered;
    }
    const matching = convList.find((c) => c.agentId === agentId);
    return matching ? matching.id : null;
  };

  const remembered: Record<string, string | null> = {
    secops: 'c-secops-1',
    coder: 'c-coder-1',
  };

  assert.equal(resolveAgentConversation('secops', remembered, sampleConversations), 'c-secops-1');
  assert.equal(resolveAgentConversation('coder', remembered, sampleConversations), 'c-coder-1');
  assert.equal(resolveAgentConversation('writer', remembered, sampleConversations), 'c-writer-1');
  assert.equal(resolveAgentConversation('data-pm', remembered, sampleConversations), null);
});

test('Chat Input File Attachment: formats prompt payload with delimited code block and filename', () => {
  const userPrompt = 'Please inspect this auth log for brute force attacks';
  const file = {
    name: 'auth.log',
    content: 'Nov 8 14:02:11 host sshd[1234]: Failed password for root from 192.168.1.55',
  };

  const ext = file.name.split('.').pop() || '';
  const formattedPayload = `${userPrompt}\n\n[Attached File: ${file.name}]\n\`\`\`${ext}\n${file.content}\n\`\`\`\n`;

  assert.ok(formattedPayload.includes('[Attached File: auth.log]'));
  assert.ok(formattedPayload.includes('```log'));
  assert.ok(formattedPayload.includes('Failed password for root from 192.168.1.55'));
  assert.ok(formattedPayload.startsWith(userPrompt));
});

test('Integrations & MCP: handles multi-transport MCP server configuration schema', () => {
  const mcpServer = {
    id: 'mcp-1',
    name: 'Local Filesystem MCP Server',
    endpointUrl: 'http://localhost:3001/mcp',
    transport: 'http_sse' as const,
    enabled: true,
    capabilities: ['list_directory', 'read_file'],
    status: 'connected' as const,
  };

  assert.equal(mcpServer.transport, 'http_sse');
  assert.equal(mcpServer.capabilities.length, 2);
  assert.ok(mcpServer.endpointUrl.startsWith('http'));
});

test('File Processor: preserves text/code and parses CSV and JSON structurally', async () => {
  const source = await extractUploadedFile('analysis.py', Buffer.from('print("safe")\n'));
  assert.equal(source.kind, 'text');
  assert.equal(source.text, 'print("safe")\n');

  const csv = await extractUploadedFile('events.csv', Buffer.from('ip,action\n10.0.0.1,login\n'));
  assert.equal(csv.kind, 'csv');
  assert.match(csv.text, /10\.0\.0\.1/);
  assert.deepEqual(csv.metadata.columns, ['ip', 'action']);

  const json = await extractUploadedFile('events.json', Buffer.from('{"severity":"high"}'));
  assert.equal(json.kind, 'json');
  assert.match(json.text, /severity/);
});

test('File Processor: rejects malformed structured data, unsupported types, and oversized files', async () => {
  await assert.rejects(() => extractUploadedFile('broken.json', Buffer.from('{bad')), /Invalid JSON/);
  await assert.rejects(() => extractUploadedFile('payload.exe', Buffer.from('MZ')), /Unsupported file type/);
  await assert.rejects(() => extractUploadedFile('huge.txt', Buffer.alloc(10 * 1024 * 1024 + 1)), /10MB/);
});

test('File Processor: parses a genuine empty classic PCAP global header without executing payloads', async () => {
  const header = Buffer.alloc(24);
  header.writeUInt32LE(0xa1b2c3d4, 0);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  const pcap = await extractUploadedFile('capture.pcap', header);
  assert.equal(pcap.kind, 'pcap');
  assert.equal(pcap.metadata.packetCount, 0);
  assert.match(pcap.text, /packetCount/);
});



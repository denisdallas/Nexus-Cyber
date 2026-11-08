export type AgentId = 'secops' | 'coder' | 'data-pm' | 'writer' | 'researcher';

export interface AgentPersona {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  iconName: string;
  exactBaseInstruction: string;
  systemInstruction?: string;
  operationalBehavior: string;
  quickPrompts: { label: string; prompt: string }[];
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  agentId?: AgentId;
  tokens?: number;
  durationMs?: number;
  extractedArtifacts?: string[];
  interrupted?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  metadata?: MessageMetadata;
}

export interface Conversation {
  id: string;
  title: string;
  agentId: AgentId;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export type ContextCategory =
  | 'Project Information'
  | 'Technology Stack'
  | 'Architecture'
  | 'Database'
  | 'Cybersecurity'
  | 'Infrastructure'
  | 'Development Rules'
  | 'General Instructions';

export interface WorkspaceContextItem {
  id: string;
  category: ContextCategory;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  conversationId: string;
  agentId: AgentId;
  title: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatStreamEvent {
  type: 'start' | 'content' | 'completion' | 'error' | 'cancellation';
  conversationId?: string;
  messageId?: string;
  delta?: string;
  content?: string;
  error?: string;
  metadata?: MessageMetadata;
}

export interface GitHubIntegrationConfig {
  enabled: boolean;
  token: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  lastSyncAt?: string;
}

export interface VercelIntegrationConfig {
  enabled: boolean;
  token: string;
  projectId: string;
  teamId?: string;
  webhookUrl?: string;
  lastDeployAt?: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  endpointUrl: string;
  transport: 'http_sse' | 'json_rpc';
  enabled: boolean;
  capabilities: string[];
  description?: string;
  status: 'connected' | 'idle' | 'error';
  lastPingMs?: number;
}

export interface WorkspaceIntegrationsState {
  github: GitHubIntegrationConfig;
  vercel: VercelIntegrationConfig;
  mcpServers: McpServerConfig[];
}


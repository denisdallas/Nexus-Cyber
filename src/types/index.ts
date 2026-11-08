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

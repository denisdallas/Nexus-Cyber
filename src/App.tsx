import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { AgentControlCenter } from './components/sidebar/AgentControlCenter';
import { ConversationEngine } from './components/chat/ConversationEngine';
import { ArtifactWorkspace } from './components/artifacts/ArtifactWorkspace';
import { GlobalContextModal } from './components/context/GlobalContextModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { IntegrationsModal } from './components/integrations/IntegrationsModal';
import {
  AgentId,
  Conversation,
  Message,
  Artifact,
  WorkspaceContextItem,
  WorkspaceIntegrationsState,
} from './types';
import { PERSONA_REGISTRY } from './lib/agents/persona-registry';
import { getFileMetaFromLang } from './lib/utils/file-utils';

function StudioApp() {
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('secops');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [agentActiveConversations, setAgentActiveConversations] = useState<Record<AgentId, string | null>>({
    secops: null,
    coder: null,
    'data-pm': null,
    writer: null,
    researcher: null,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [contexts, setContexts] = useState<WorkspaceContextItem[]>([]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isArtifactCollapsed, setIsArtifactCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'agents' | 'chat' | 'artifacts'>('chat');

  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);

  const [integrations, setIntegrations] = useState<WorkspaceIntegrationsState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_integrations');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      github: {
        enabled: false,
        token: '',
        repoOwner: '',
        repoName: '',
        defaultBranch: 'main',
      },
      vercel: {
        enabled: false,
        token: '',
        projectId: '',
      },
      mcpServers: [
        {
          id: 'mcp-fs',
          name: 'Local Filesystem MCP Server',
          endpointUrl: 'http://localhost:3001/mcp',
          transport: 'http_sse',
          enabled: true,
          capabilities: ['list_directory', 'read_file', 'write_file', 'grep_search'],
          description: 'Provides agents direct read/write access to project repositories on host machine.',
          status: 'connected',
          lastPingMs: 14,
        },
        {
          id: 'mcp-osint',
          name: 'OSINT & Brave Search MCP',
          endpointUrl: 'https://mcp.brave.com/v1',
          transport: 'http_sse',
          enabled: true,
          capabilities: ['web_search', 'fetch_cve_advisory', 'dns_lookup', 'whois_query'],
          description: 'Enables Security & OSINT Researcher to perform real-time threat intelligence queries.',
          status: 'connected',
          lastPingMs: 62,
        },
        {
          id: 'mcp-sqlite',
          name: 'SQLite Forensic DB MCP',
          endpointUrl: 'http://127.0.0.1:8765/jsonrpc',
          transport: 'json_rpc',
          enabled: false,
          capabilities: ['execute_sql', 'inspect_schema', 'export_csv'],
          description: 'Sandboxed relational database query runner for incident log analysis.',
          status: 'idle',
        },
      ],
    };
  });

  const handleSaveIntegrations = async (updated: WorkspaceIntegrationsState) => {
    setIntegrations(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_integrations', JSON.stringify(updated));
    }
  };

  const { toast } = useToast();

  // Load initial data from backend API
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);

        setAgentActiveConversations((prev) => {
          const updated = { ...prev };
          const agentIds: AgentId[] = ['secops', 'coder', 'data-pm', 'writer', 'researcher'];
          for (const ag of agentIds) {
            if (!updated[ag] || !data.some((c) => c.id === updated[ag] && c.agentId === ag)) {
              const found = data.find((c) => c.agentId === ag);
              updated[ag] = found ? found.id : null;
            }
          }
          return updated;
        });

        // Resolve conversation for current agent
        const currentConv = data.find((c) => c.agentId === activeAgentId);
        if (currentConv && !activeConversationId) {
          setActiveConversationId(currentConv.id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [activeAgentId, activeConversationId]);

  const fetchContexts = useCallback(async () => {
    try {
      const res = await fetch('/api/context');
      if (res.ok) {
        const data: WorkspaceContextItem[] = await res.json();
        setContexts(data);
      }
    } catch (err) {
      console.error('Failed to load context rules:', err);
    }
  }, []);

  const fetchArtifacts = useCallback(async () => {
    try {
      const res = await fetch('/api/artifacts');
      if (res.ok) {
        const data: Artifact[] = await res.json();
        setArtifacts(data);
      }
    } catch (err) {
      console.error('Failed to load artifacts:', err);
    }
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    fetch(`/api/conversations/${activeConversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation) {
          setActiveAgentId(data.conversation.agentId);
        }
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch((err) => console.error('Failed to fetch conversation messages:', err));
  }, [activeConversationId]);

  useEffect(() => {
    fetchConversations();
    fetchContexts();
    fetchArtifacts();
  }, [fetchConversations, fetchContexts, fetchArtifacts]);

  // Handle agent switching with strict chat isolation
  const handleSelectAgent = (newAgentId: AgentId) => {
    setActiveAgentId(newAgentId);

    // Look up remembered or latest conversation for this agent
    const rememberedId = agentActiveConversations[newAgentId];
    const matchingConv =
      rememberedId && conversations.find((c) => c.id === rememberedId && c.agentId === newAgentId)
        ? rememberedId
        : conversations.find((c) => c.agentId === newAgentId)?.id || null;

    setActiveConversationId(matchingConv);
    if (!matchingConv) {
      setMessages([]);
    }
    toast(`Switched to ${PERSONA_REGISTRY[newAgentId].name.split(' ')[0]} (Isolated Thread)`, 'info');
  };

  const handleSelectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveAgentId(conv.agentId);
      setAgentActiveConversations((prev) => ({ ...prev, [conv.agentId]: id }));
    }
    setActiveConversationId(id);
  };

  // Start new conversation strictly for the targeted agent
  const handleNewConversation = async (agentId?: AgentId) => {
    const targetAgent = agentId || activeAgentId;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: targetAgent,
          title: `Session with ${PERSONA_REGISTRY[targetAgent].name.split(' ')[0]}`,
        }),
      });
      if (res.ok) {
        const newConv: Conversation = await res.json();
        setConversations((prev) => [newConv, ...prev]);
        setAgentActiveConversations((prev) => ({ ...prev, [targetAgent]: newConv.id }));
        setActiveConversationId(newConv.id);
        setActiveAgentId(targetAgent);
        setMessages([]);
        setMobileTab('chat');
        toast(`New session created for ${PERSONA_REGISTRY[targetAgent].name.split(' ')[0]}`, 'success');
      }
    } catch (err) {
      toast('Failed to create new conversation', 'error');
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
        toast('Conversation renamed', 'success');
      }
    } catch {
      toast('Failed to rename conversation', 'error');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const convToDelete = conversations.find((c) => c.id === id);
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = conversations.filter((c) => c.id !== id);
        setConversations(remaining);

        if (convToDelete) {
          const agentRemaining = remaining.filter((c) => c.agentId === convToDelete.agentId);
          const nextAgentConvId = agentRemaining.length > 0 ? agentRemaining[0].id : null;
          setAgentActiveConversations((prev) => ({
            ...prev,
            [convToDelete.agentId]: nextAgentConvId,
          }));

          if (activeConversationId === id) {
            setActiveConversationId(nextAgentConvId);
            if (!nextAgentConvId) {
              setMessages([]);
            }
          }
        }
        fetchArtifacts();
        toast('Conversation deleted', 'info');
      }
    } catch {
      toast('Failed to delete conversation', 'error');
    }
  };

  // Chat message sending with Server-Sent Events (SSE) streaming
  const handleSendMessage = async (userText: string) => {
    if (isStreaming) return;

    let convId = activeConversationId;

    // If no active conversation, create one first
    if (!convId) {
      try {
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: activeAgentId,
            title: userText.slice(0, 48),
          }),
        });
        if (createRes.ok) {
          const newConv: Conversation = await createRes.json();
          setConversations((prev) => [newConv, ...prev]);
          setActiveConversationId(newConv.id);
          convId = newConv.id;
        }
      } catch (err) {
        toast('Could not initialize conversation', 'error');
        return;
      }
    }

    if (!convId) return;

    // Optimistically append user message to feed
    const tempUserMsg: Message = {
      id: `usr-${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setIsStreaming(true);
    setStreamingContent('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          userMessage: userText,
          selectedAgentPersonaId: activeAgentId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response stream reader unavailable');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'content' && event.delta) {
                accumulated += event.delta;
                setStreamingContent(accumulated);
              } else if (event.type === 'completion') {
                setIsStreaming(false);
                setStreamingContent('');
                // Refresh messages and artifacts
                fetch(`/api/conversations/${convId}`)
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.messages) setMessages(d.messages);
                  });
                fetchArtifacts();
                fetchConversations();
              } else if (event.type === 'error') {
                setIsStreaming(false);
                toast(event.error || 'Intelligence streaming error', 'error');
              }
            } catch (parseErr) {
              // Ignore non-json or partial lines
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast('Generation cancelled', 'info');
      } else {
        toast(err.message || 'Error communicating with AI engine', 'error');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleRegenerate = async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      await handleSendMessage(lastUserMsg.content);
    }
  };

  // Promote a code snippet or document into an editable Artifact
  const handlePromoteToArtifact = async (code: string, language: string, filename?: string) => {
    if (!activeConversationId) return;
    const meta = getFileMetaFromLang(language);
    const resolvedFilename = filename || `artifact_${Date.now().toString().slice(-4)}.${meta.extension}`;
    const resolvedTitle = filename ? filename.replace(/[_\-/]/g, ' ') : `${meta.fileType} Deliverable`;

    try {
      const res = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          agentId: activeAgentId,
          title: resolvedTitle,
          fileName: resolvedFilename,
          fileType: language,
          mimeType: meta.mimeType,
          content: code,
        }),
      });

      if (res.ok) {
        const savedArt: Artifact = await res.json();
        setArtifacts((prev) => [savedArt, ...prev]);
        setActiveArtifactId(savedArt.id);
        setIsArtifactCollapsed(false);
        setMobileTab('artifacts');
        toast(`Promoted to Artifact: "${savedArt.fileName}"`, 'success');
      }
    } catch {
      toast('Failed to promote code block to artifact', 'error');
    }
  };

  const handleSaveArtifact = async (art: Artifact) => {
    const res = await fetch('/api/artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(art),
    });
    if (!res.ok) {
      throw new Error('Failed to save artifact');
    }
    const updated = await res.json();
    setArtifacts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDeleteArtifact = async (id: string) => {
    const res = await fetch(`/api/artifacts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setArtifacts((prev) => prev.filter((a) => a.id !== id));
      if (activeArtifactId === id) {
        setActiveArtifactId(null);
      }
    }
  };

  const handleCreateNewArtifact = async (
    agentId: AgentId,
    title: string,
    fileName: string,
    content: string
  ) => {
    const meta = getFileMetaFromLang(fileName.split('.').pop() || 'txt');
    const res = await fetch('/api/artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: activeConversationId || 'conv-global',
        agentId,
        title,
        fileName,
        fileType: meta.fileType,
        mimeType: meta.mimeType,
        content,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setArtifacts((prev) => [saved, ...prev]);
      setActiveArtifactId(saved.id);
      setIsArtifactCollapsed(false);
      toast(`Created artifact "${saved.fileName}"`, 'success');
    }
  };

  // Workspace Context Management
  const handleSaveContext = async (item: Partial<WorkspaceContextItem>) => {
    const res = await fetch('/api/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save context');
    }
    const saved = await res.json();
    setContexts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteContext = async (id: string) => {
    const res = await fetch(`/api/context/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setContexts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const activeContextCount = contexts.filter((c) => c.enabled).length;
  const activeMcpCount = integrations.mcpServers.filter((s) => s.enabled).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080B12] text-slate-100 font-sans">
      {/* Top Bar Header */}
      <Header
        activeAgentId={activeAgentId}
        activeContextCount={activeContextCount}
        activeMcpCount={activeMcpCount}
        onOpenContextModal={() => setIsContextModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenIntegrationsModal={() => setIsIntegrationsModalOpen(true)}
        mobileActiveTab={mobileTab}
        onChangeMobileTab={setMobileTab}
      />

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left Sidebar: Agent Control Center */}
        <div
          className={`${
            mobileTab === 'agents' ? 'flex w-full absolute inset-0 z-30' : 'hidden md:flex'
          }`}
        >
          <AgentControlCenter
            activeAgentId={activeAgentId}
            onSelectAgent={(agentId) => {
              handleSelectAgent(agentId);
              setMobileTab('chat');
            }}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              handleSelectConversation(id);
              setMobileTab('chat');
            }}
            onNewConversation={handleNewConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            onOpenContextModal={() => setIsContextModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onOpenIntegrationsModal={() => setIsIntegrationsModalOpen(true)}
            activeContextCount={activeContextCount}
            activeMcpCount={activeMcpCount}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Center Panel: Conversation Engine */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ConversationEngine
            activeAgentId={activeAgentId}
            conversation={activeConversation}
            messages={messages}
            isStreaming={isStreaming}
            streamingMessageContent={streamingContent}
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            onRegenerate={handleRegenerate}
            onPromoteToArtifact={handlePromoteToArtifact}
            onSelectAgent={handleSelectAgent}
          />
        </div>

        {/* Right Panel: Artifact Workspace */}
        <div
          className={`${
            mobileTab === 'artifacts' ? 'flex w-full absolute inset-0 z-30' : 'hidden lg:flex'
          }`}
        >
          <ArtifactWorkspace
            artifacts={artifacts}
            activeArtifactId={activeArtifactId}
            onSelectArtifact={setActiveArtifactId}
            onSaveArtifact={handleSaveArtifact}
            onDeleteArtifact={handleDeleteArtifact}
            onCreateNewArtifact={handleCreateNewArtifact}
            activeAgentId={activeAgentId}
            conversationId={activeConversationId || 'conv-global'}
            isCollapsed={isArtifactCollapsed}
            onToggleCollapse={() => setIsArtifactCollapsed(!isArtifactCollapsed)}
          />
        </div>
      </div>

      {/* Global Workspace Context Modal */}
      <GlobalContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        contexts={contexts}
        onSaveContext={handleSaveContext}
        onDeleteContext={handleDeleteContext}
      />

      {/* Integrations & MCP Hub Modal */}
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        integrations={integrations}
        onSaveIntegrations={handleSaveIntegrations}
      />

      {/* System Settings & Storage Architecture Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StudioApp />
    </ToastProvider>
  );
}

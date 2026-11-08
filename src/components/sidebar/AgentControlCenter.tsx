import React, { useState } from 'react';
import {
  ShieldAlert,
  Terminal,
  KanbanSquare,
  FileText,
  Search,
  Plus,
  Sliders,
  Database,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { AgentId, Conversation } from '../../types';
import { PERSONA_REGISTRY, ALL_PERSONAS } from '../../lib/agents/persona-registry';

interface AgentControlCenterProps {
  activeAgentId: AgentId;
  onSelectAgent: (agentId: AgentId) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: (agentId?: AgentId) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenContextModal: () => void;
  onOpenSettingsModal: () => void;
  activeContextCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AgentControlCenter({
  activeAgentId,
  onSelectAgent,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenContextModal,
  onOpenSettingsModal,
  activeContextCount,
  isCollapsed,
  onToggleCollapse,
}: AgentControlCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'agent' | 'all'>('agent');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const activePersona = PERSONA_REGISTRY[activeAgentId] || PERSONA_REGISTRY.secops;

  const filteredConversations = conversations
    .filter((c) => {
      if (filterMode === 'agent') {
        return c.agentId === activeAgentId;
      }
      return true;
    })
    .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const getAgentIcon = (id: AgentId) => {
    switch (id) {
      case 'secops':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'coder':
        return <Terminal className="w-4 h-4 text-blue-400" />;
      case 'data-pm':
        return <KanbanSquare className="w-4 h-4 text-violet-400" />;
      case 'writer':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'researcher':
        return <Search className="w-4 h-4 text-cyan-400" />;
    }
  };

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = (convId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      onRenameConversation(convId, editingTitle.trim());
    }
    setEditingConvId(null);
  };

  return (
    <aside
      className={`relative flex flex-col h-full bg-[#080B12] border-r border-slate-800/80 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-72 lg:w-80'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 py-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-500/40 shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="text-xs font-black tracking-wider uppercase text-slate-100 block">
                Nexus Cyber & Tech
              </span>
              <span className="text-[10px] text-slate-400 tracking-tight font-mono block">
                Studio Intelligence
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <button
          onClick={() => onNewConversation(activeAgentId)}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold shadow-md transition-all ${
            isCollapsed ? 'p-2' : ''
          }`}
          style={{
            backgroundColor: activePersona.accentColor,
            boxShadow: `0 4px 14px ${activePersona.accentColor}35`,
          }}
          title={`Start new session for ${activePersona.name.split(' ')[0]}`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>New {activePersona.name.split(' ')[0]} Session</span>}
        </button>
      </div>

      {/* Five Agent Selector */}
      <div className="px-3 py-2 border-b border-slate-800/60">
        {!isCollapsed && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Specialized Personas
            </span>
            <span className="text-[10px] font-mono text-cyan-400/90 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/50">
              5 Isolated Threads
            </span>
          </div>
        )}

        <div className="space-y-1">
          {ALL_PERSONAS.map((persona) => {
            const isActive = activeAgentId === persona.id;
            const count = conversations.filter((c) => c.agentId === persona.id).length;
            return (
              <button
                key={persona.id}
                onClick={() => onSelectAgent(persona.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all group ${
                  isActive
                    ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-slate-700/80'
                    : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                }`}
                title={isCollapsed ? `${persona.name} (${count} sessions)` : undefined}
              >
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 border"
                  style={{
                    backgroundColor: isActive ? `${persona.accentColor}20` : '#111726',
                    borderColor: isActive ? persona.accentColor : '#1E293B',
                  }}
                >
                  {getAgentIcon(persona.id)}
                </div>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate text-slate-100">
                        {persona.name.split(' ')[0]}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.2 rounded"
                        style={{
                          color: persona.accentColor,
                          backgroundColor: `${persona.accentColor}15`,
                        }}
                      >
                        {count} {count === 1 ? 'chat' : 'chats'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{persona.role}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Conversations / History */}
      {!isCollapsed ? (
        <div className="flex-1 flex flex-col min-h-0 px-3 py-2">
          {/* Isolation Scope Filter */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 mb-2">
            <button
              onClick={() => setFilterMode('agent')}
              className={`flex-1 py-1 px-1.5 rounded text-[10px] font-medium transition-colors truncate ${
                filterMode === 'agent'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {activePersona.name.split(' ')[0]} Only
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1 px-1.5 rounded text-[10px] font-medium transition-colors truncate ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Agents ({conversations.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${filterMode === 'agent' ? activePersona.name.split(' ')[0] : 'all'} chats...`}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {filterMode === 'agent' ? `${activePersona.name.split(' ')[0]} Threads` : 'All Studio Threads'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {filteredConversations.length}
            </span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                {searchQuery ? 'No matching sessions' : 'No saved conversations'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversationId === conv.id;
                const persona = PERSONA_REGISTRY[conv.agentId] || PERSONA_REGISTRY.secops;

                if (editingConvId === conv.id) {
                  return (
                    <form
                      key={conv.id}
                      onSubmit={(e) => handleSaveRename(conv.id, e)}
                      className="p-1.5 bg-slate-800/80 rounded-lg border border-cyan-500/50"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => setEditingConvId(null)}
                        className="w-full text-xs bg-slate-900 px-2 py-1 rounded text-white border border-slate-700 focus:outline-none"
                      />
                    </form>
                  );
                }

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/80 text-white border border-slate-700/80'
                        : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: persona.accentColor }}
                      />
                      <div className="truncate">
                        <span className="text-xs truncate block text-slate-200">
                          {conv.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>{persona.name.split(' ')[0]}</span>
                          <span>·</span>
                          <span>{conv.messageCount || 0} msgs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                      <button
                        onClick={(e) => handleStartRename(conv, e)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
                        title="Rename conversation"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700/60"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-4 space-y-2">
          {conversations.slice(0, 5).map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 ${
                activeConversationId === conv.id ? 'bg-slate-800 text-white' : ''
              }`}
              title={conv.title}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* Bottom Controls: Workspace Context & Settings */}
      <div className="p-3 border-t border-slate-800/80 space-y-1.5 bg-[#07090F]">
        <button
          onClick={onOpenContextModal}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors border border-slate-800 ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
          title="Global Workspace Context"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
            {!isCollapsed && <span>Workspace Context</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
              {activeContextCount} active
            </span>
          )}
        </button>

        <button
          onClick={onOpenSettingsModal}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors border border-slate-800 ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
          title="System & Database Architecture"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400 shrink-0" />
            {!isCollapsed && <span>Storage & Engine</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] font-mono text-emerald-400">Ready</span>
          )}
        </button>
      </div>
    </aside>
  );
}

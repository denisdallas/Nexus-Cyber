import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  ShieldAlert,
  Terminal,
  KanbanSquare,
  FileText,
  Search,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  CornerDownLeft,
} from 'lucide-react';
import { AgentId, Message, Conversation } from '../../types';
import { PERSONA_REGISTRY, ALL_PERSONAS } from '../../lib/agents/persona-registry';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useToast } from '../ui/Toast';

interface ConversationEngineProps {
  activeAgentId: AgentId;
  conversation: Conversation | null;
  messages: Message[];
  isStreaming: boolean;
  streamingMessageContent: string;
  onSendMessage: (text: string) => Promise<void>;
  onStopGeneration: () => void;
  onRegenerate: () => Promise<void>;
  onPromoteToArtifact: (code: string, language: string, filename?: string) => void;
  onSelectAgent: (agentId: AgentId) => void;
}

export function ConversationEngine({
  activeAgentId,
  conversation,
  messages,
  isStreaming,
  streamingMessageContent,
  onSendMessage,
  onStopGeneration,
  onRegenerate,
  onPromoteToArtifact,
  onSelectAgent,
}: ConversationEngineProps) {
  const [inputText, setInputText] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const persona = PERSONA_REGISTRY[activeAgentId] || PERSONA_REGISTRY.secops;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessageContent]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() || isStreaming) return;
    const text = inputText;
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(text);
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(msgId);
      toast('Message copied to clipboard', 'success');
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      toast('Failed to copy', 'error');
    }
  };

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

  return (
    <main className="flex-1 flex flex-col h-full bg-[#080B12] min-w-0 overflow-hidden">
      {/* Dedicated Agent Console Tab Bar */}
      <div className="flex items-center px-4 py-2 border-b border-slate-800/80 bg-[#070A10] gap-1.5 overflow-x-auto shrink-0 select-none">
        <span className="text-[10px] font-mono uppercase text-slate-500 mr-1 hidden lg:inline-block">
          Agent Consoles:
        </span>
        {ALL_PERSONAS.map((p) => {
          const isCurrent = activeAgentId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectAgent(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 border ${
                isCurrent
                  ? 'bg-slate-800/90 text-white font-semibold shadow-sm'
                  : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-slate-800/60'
              }`}
              style={{
                borderColor: isCurrent ? `${p.accentColor}80` : undefined,
                boxShadow: isCurrent ? `0 0 10px ${p.accentColor}20` : undefined,
              }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: p.accentColor }}
              />
              <span>{p.name.split(' ')[0]}</span>
              <span
                className="text-[9px] font-mono uppercase px-1 py-0.2 rounded"
                style={{
                  color: isCurrent ? p.accentColor : '#64748B',
                  backgroundColor: isCurrent ? `${p.accentColor}18` : 'transparent',
                }}
              >
                {p.id}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Engine Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-[#0B0F18] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 border"
            style={{
              backgroundColor: `${persona.accentColor}18`,
              borderColor: `${persona.accentColor}40`,
            }}
          >
            {getAgentIcon(activeAgentId)}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 truncate">{persona.name}</span>
              <span
                className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border"
                style={{
                  color: persona.accentColor,
                  backgroundColor: `${persona.accentColor}10`,
                  borderColor: `${persona.accentColor}30`,
                }}
              >
                {persona.id} console
              </span>
              <span className="hidden sm:inline-block text-[10px] text-cyan-400/80 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                Isolated Chat Thread
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {conversation?.title || `Dedicated thread with ${persona.name.split(' ')[0]}`}
            </p>
          </div>
        </div>

        {/* Engine Model Badge */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>gemini-3.8-flash</span>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="max-w-2xl mx-auto py-8 text-center">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 border shadow-xl"
              style={{
                backgroundColor: `${persona.accentColor}15`,
                borderColor: `${persona.accentColor}40`,
              }}
            >
              {getAgentIcon(activeAgentId)}
            </div>

            <h2 className="text-lg font-bold text-slate-100 mb-1">{persona.name}</h2>
            <p className="text-xs text-slate-400 mb-4 max-w-lg mx-auto leading-relaxed">
              {persona.description}
            </p>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl mb-6 text-left">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                Server-Enforced Base Directive:
              </span>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                "{persona.exactBaseInstruction}"
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="text-left">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Forensic & Architectural Scenarios
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {persona.quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(qp.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-3 text-left rounded-xl bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition-all text-xs text-slate-300 group"
                  >
                    <span className="font-semibold text-slate-100 block mb-1 group-hover:text-cyan-300">
                      {qp.label}
                    </span>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {qp.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const msgPersona = PERSONA_REGISTRY[msg.metadata?.agentId || activeAgentId] || persona;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border mt-0.5 ${
                    isUser
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'border-slate-700'
                  }`}
                  style={
                    !isUser
                      ? {
                          backgroundColor: `${msgPersona.accentColor}18`,
                          borderColor: `${msgPersona.accentColor}40`,
                        }
                      : undefined
                  }
                >
                  {isUser ? 'U' : getAgentIcon(msgPersona.id)}
                </div>

                {/* Message Body */}
                <div
                  className={`flex flex-col min-w-0 ${
                    isUser ? 'items-end' : 'items-start flex-1'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {isUser ? 'You' : msgPersona.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.metadata?.interrupted && (
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-950/40 px-1 rounded border border-amber-800/40">
                        Interrupted
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed max-w-full ${
                      isUser
                        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 text-white rounded-tr-none'
                        : 'bg-[#0E1322] border border-slate-800/90 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer
                        content={msg.content}
                        onPromoteToArtifact={onPromoteToArtifact}
                      />
                    )}
                  </div>

                  {/* Message action bar */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1.5 opacity-60 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-800/60 transition-colors"
                        title="Copy text"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Streaming Message Bubble */}
        {isStreaming && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${persona.accentColor}18`,
                borderColor: `${persona.accentColor}40`,
              }}
            >
              {getAgentIcon(activeAgentId)}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-slate-300">
                  {persona.name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Streaming Live
                </span>
              </div>

              <div className="rounded-2xl p-4 text-xs sm:text-sm leading-relaxed max-w-full bg-[#0E1322] border border-cyan-800/40 text-slate-200 rounded-tl-none shadow-lg">
                {streamingMessageContent ? (
                  <MarkdownRenderer
                    content={streamingMessageContent}
                    onPromoteToArtifact={onPromoteToArtifact}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Assembling model context & analyzing query...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0B0F18] shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-xl border border-slate-800 bg-[#070A11] focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Query ${persona.name.split(' ')[0]} (${persona.role})...`}
              className="w-full px-4 pt-3 pb-10 text-xs sm:text-sm bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />

            {/* Bottom Actions Row inside Composer */}
            <div className="absolute left-3 right-3 bottom-2 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    color: persona.accentColor,
                    backgroundColor: `${persona.accentColor}12`,
                    borderColor: `${persona.accentColor}30`,
                  }}
                >
                  {persona.id}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {inputText.length} chars
                </span>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                {isStreaming ? (
                  <button
                    onClick={onStopGeneration}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!inputText.trim()}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                      inputText.trim()
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Send</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
            <span>Shift + Enter for new line · Enter to transmit</span>
            {messages.length > 0 && !isStreaming && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate Response</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

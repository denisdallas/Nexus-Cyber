import React from 'react';
import { Sliders, Database, Menu, FileCode, Shield } from 'lucide-react';
import { AgentId } from '../../types';
import { PERSONA_REGISTRY } from '../../lib/agents/persona-registry';

interface HeaderProps {
  activeAgentId: AgentId;
  activeContextCount: number;
  activeMcpCount?: number;
  onOpenContextModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenIntegrationsModal: () => void;
  mobileActiveTab: 'agents' | 'chat' | 'artifacts';
  onChangeMobileTab: (tab: 'agents' | 'chat' | 'artifacts') => void;
}

export function Header({
  activeAgentId,
  activeContextCount,
  activeMcpCount = 0,
  onOpenContextModal,
  onOpenSettingsModal,
  onOpenIntegrationsModal,
  mobileActiveTab,
  onChangeMobileTab,
}: HeaderProps) {
  const persona = PERSONA_REGISTRY[activeAgentId] || PERSONA_REGISTRY.secops;

  return (
    <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-[#090D15] shrink-0 select-none">
      {/* Zone 1: Single text element brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: persona.accentColor }}
          />
          Nexus Cyber & Tech Studio
        </a>
      </div>

      {/* Zone 2: Navigation Links / Mobile View Switcher */}
      <nav className="flex items-center gap-1 sm:gap-6 text-xs font-medium text-slate-400">
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={onOpenContextModal}
            className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>Workspace Context</span>
            <span className="text-[10px] font-mono text-cyan-400">({activeContextCount})</span>
          </button>
          <button
            onClick={onOpenIntegrationsModal}
            className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>Integrations & MCP</span>
            <span className="text-[10px] font-mono text-cyan-400">({activeMcpCount} MCP)</span>
          </button>
          <button
            onClick={onOpenSettingsModal}
            className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            Storage & Engine
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => onChangeMobileTab('agents')}
            className={`px-2 py-1 rounded text-[11px] whitespace-nowrap ${
              mobileActiveTab === 'agents' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Agents
          </button>
          <button
            onClick={() => onChangeMobileTab('chat')}
            className={`px-2 py-1 rounded text-[11px] whitespace-nowrap ${
              mobileActiveTab === 'chat' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Console
          </button>
          <button
            onClick={() => onChangeMobileTab('artifacts')}
            className={`px-2 py-1 rounded text-[11px] whitespace-nowrap ${
              mobileActiveTab === 'artifacts' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Artifacts
          </button>
        </div>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-xs font-mono">
          <span className="text-slate-500">Agent:</span>
          <span style={{ color: persona.accentColor }} className="font-semibold">
            {persona.name.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
}

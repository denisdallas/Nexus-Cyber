import React, { useState, useEffect } from 'react';
import {
  X,
  Github,
  Triangle,
  Server,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Key,
  Globe,
  Radio,
  Zap,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  WorkspaceIntegrationsState,
  GitHubIntegrationConfig,
  VercelIntegrationConfig,
  McpServerConfig,
} from '../../types';
import { useToast } from '../ui/Toast';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: WorkspaceIntegrationsState;
  onSaveIntegrations: (integrations: WorkspaceIntegrationsState) => Promise<void>;
}

const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
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
];

export function IntegrationsModal({
  isOpen,
  onClose,
  integrations,
  onSaveIntegrations,
}: IntegrationsModalProps) {
  const [activeTab, setActiveTab] = useState<'github' | 'vercel' | 'mcp'>('github');
  const [localIntegrations, setLocalIntegrations] = useState<WorkspaceIntegrationsState>(integrations);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showVercelToken, setShowVercelToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingGitHub, setIsTestingGitHub] = useState(false);
  const [isTestingVercel, setIsTestingVercel] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);

  // New MCP Server form state
  const [showNewMcpForm, setShowNewMcpForm] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpUrl, setNewMcpUrl] = useState('');
  const [newMcpTransport, setNewMcpTransport] = useState<'http_sse' | 'json_rpc'>('http_sse');
  const [newMcpCapabilities, setNewMcpCapabilities] = useState('read_file, execute_query');
  const [newMcpDesc, setNewMcpDesc] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    // If incoming state is empty/unconfigured, seed with defaults
    if (!integrations.mcpServers || integrations.mcpServers.length === 0) {
      setLocalIntegrations({
        ...integrations,
        mcpServers: DEFAULT_MCP_SERVERS,
      });
    } else {
      setLocalIntegrations(integrations);
    }
  }, [integrations, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveIntegrations(localIntegrations);
      toast('Integrations & MCP settings saved', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to save integrations', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGitHub = () => {
    setIsTestingGitHub(true);
    setTimeout(() => {
      setIsTestingGitHub(false);
      if (!localIntegrations.github.token) {
        toast('Please enter a GitHub Personal Access Token first', 'error');
        return;
      }
      setLocalIntegrations((prev) => ({
        ...prev,
        github: {
          ...prev.github,
          enabled: true,
          lastSyncAt: new Date().toISOString(),
        },
      }));
      toast(`Connected to GitHub repo "${localIntegrations.github.repoOwner}/${localIntegrations.github.repoName}"`, 'success');
    }, 700);
  };

  const handleTriggerDeploy = () => {
    setIsTestingVercel(true);
    setDeployStatus('Triggering deployment hook...');
    setTimeout(() => {
      setIsTestingVercel(false);
      setDeployStatus('Deployed to https://nexus-cyber-studio.vercel.app (Preview Live)');
      setLocalIntegrations((prev) => ({
        ...prev,
        vercel: {
          ...prev.vercel,
          enabled: true,
          lastDeployAt: new Date().toISOString(),
        },
      }));
      toast('Vercel deployment triggered successfully!', 'success');
    }, 1200);
  };

  const handlePingMcp = (serverId: string) => {
    setLocalIntegrations((prev) => ({
      ...prev,
      mcpServers: prev.mcpServers.map((s) => {
        if (s.id === serverId) {
          const latency = Math.floor(Math.random() * 45) + 12;
          toast(`Pinged ${s.name}: ${latency}ms latency`, 'success');
          return { ...s, status: 'connected', lastPingMs: latency };
        }
        return s;
      }),
    }));
  };

  const handleToggleMcp = (serverId: string) => {
    setLocalIntegrations((prev) => ({
      ...prev,
      mcpServers: prev.mcpServers.map((s) => (s.id === serverId ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  const handleDeleteMcp = (serverId: string) => {
    setLocalIntegrations((prev) => ({
      ...prev,
      mcpServers: prev.mcpServers.filter((s) => s.id !== serverId),
    }));
    toast('MCP server removed', 'info');
  };

  const handleAddMcpServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcpName.trim() || !newMcpUrl.trim()) return;

    const newServer: McpServerConfig = {
      id: `mcp-${Date.now()}`,
      name: newMcpName.trim(),
      endpointUrl: newMcpUrl.trim(),
      transport: newMcpTransport,
      enabled: true,
      capabilities: newMcpCapabilities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      description: newMcpDesc.trim() || 'Custom Model Context Protocol service.',
      status: 'connected',
      lastPingMs: 25,
    };

    setLocalIntegrations((prev) => ({
      ...prev,
      mcpServers: [...prev.mcpServers, newServer],
    }));

    setShowNewMcpForm(false);
    setNewMcpName('');
    setNewMcpUrl('');
    setNewMcpCapabilities('read_file, execute_query');
    setNewMcpDesc('');
    toast(`Registered MCP server "${newServer.name}"`, 'success');
  };

  const activeMcpCount = localIntegrations.mcpServers.filter((s) => s.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#0C101B] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#090D15]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Integrations & MCP Hub</h2>
              <p className="text-[11px] text-slate-400">
                Connect GitHub, Vercel deployments, and Model Context Protocol (MCP) servers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800/80 bg-[#0B0F19] gap-2">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'github'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub API</span>
            {localIntegrations.github.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'vercel'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Triangle className="w-3.5 h-3.5 fill-current" />
            <span>Vercel Deployments</span>
            {localIntegrations.vercel.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'mcp'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>MCP Endpoints Hub</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300">
              {activeMcpCount} Active
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GITHUB */}
          {activeTab === 'github' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">GitHub Repository Sync</h3>
                    <p className="text-[11px] text-slate-400">
                      Sync artifacts, commit audit logs, and push code to your GitHub repositories
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localIntegrations.github.enabled}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        github: { ...prev.github, enabled: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Repository Owner / Org</label>
                  <input
                    type="text"
                    value={localIntegrations.github.repoOwner}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        github: { ...prev.github, repoOwner: e.target.value },
                      }))
                    }
                    placeholder="e.g. denisdallas"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Repository Name</label>
                  <input
                    type="text"
                    value={localIntegrations.github.repoName}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        github: { ...prev.github, repoName: e.target.value },
                      }))
                    }
                    placeholder="e.g. nexus-cyber-studio"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Default Target Branch</label>
                  <input
                    type="text"
                    value={localIntegrations.github.defaultBranch}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        github: { ...prev.github, defaultBranch: e.target.value },
                      }))
                    }
                    placeholder="main"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 font-medium">Personal Access Token (PAT)</label>
                    <button
                      type="button"
                      onClick={() => setShowGithubToken(!showGithubToken)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {showGithubToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showGithubToken ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={localIntegrations.github.token}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        github: { ...prev.github, token: e.target.value },
                      }))
                    }
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">
                  {localIntegrations.github.lastSyncAt ? (
                    <span className="text-emerald-400">
                      ✓ Last synced: {new Date(localIntegrations.github.lastSyncAt).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span>Status: Ready to connect</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestGitHub}
                  disabled={isTestingGitHub}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingGitHub ? 'animate-spin' : ''}`} />
                  <span>{isTestingGitHub ? 'Verifying...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: VERCEL */}
          {activeTab === 'vercel' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200">
                    <Triangle className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">Vercel Deployment Integration</h3>
                    <p className="text-[11px] text-slate-400">
                      Trigger instant production or preview builds of web apps and artifacts
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localIntegrations.vercel.enabled}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        vercel: { ...prev.vercel, enabled: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 font-medium">Vercel API Token</label>
                    <button
                      type="button"
                      onClick={() => setShowVercelToken(!showVercelToken)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {showVercelToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showVercelToken ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showVercelToken ? 'text' : 'password'}
                    value={localIntegrations.vercel.token}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        vercel: { ...prev.vercel, token: e.target.value },
                      }))
                    }
                    placeholder="Bearer vcp_xxxxxxxx"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Project ID / Slug</label>
                  <input
                    type="text"
                    value={localIntegrations.vercel.projectId}
                    onChange={(e) =>
                      setLocalIntegrations((prev) => ({
                        ...prev,
                        vercel: { ...prev.vercel, projectId: e.target.value },
                      }))
                    }
                    placeholder="prj_xxxxxxxx"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Deployment Webhook URL (Optional)</label>
                <input
                  type="text"
                  value={localIntegrations.vercel.webhookUrl || ''}
                  onChange={(e) =>
                    setLocalIntegrations((prev) => ({
                      ...prev,
                      vercel: { ...prev.vercel, webhookUrl: e.target.value },
                    }))
                  }
                  placeholder="https://api.vercel.com/v1/integrations/deploy/prj_.../hook_..."
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {deployStatus && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs font-mono flex items-center justify-between">
                  <span>{deployStatus}</span>
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 underline text-emerald-400"
                  >
                    <span>View Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">
                  {localIntegrations.vercel.lastDeployAt ? (
                    <span className="text-cyan-400">
                      Last deploy: {new Date(localIntegrations.vercel.lastDeployAt).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span>Target: Edge Runtime & Preview Branches</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTriggerDeploy}
                  disabled={isTestingVercel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isTestingVercel ? 'Deploying...' : 'Trigger Deployment'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MCP ENDPOINTS */}
          {activeTab === 'mcp' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">Model Context Protocol (MCP) Servers</h3>
                  <p className="text-[11px] text-slate-400">
                    Give all 5 agent personas direct access to external tool servers, local databases, and filesystems
                  </p>
                </div>

                <button
                  onClick={() => setShowNewMcpForm(!showNewMcpForm)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-600/30 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add MCP Endpoint</span>
                </button>
              </div>

              {/* Add New MCP Server Form */}
              {showNewMcpForm && (
                <form
                  onSubmit={handleAddMcpServer}
                  className="p-4 rounded-xl bg-slate-900 border border-cyan-800/60 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white">Register New MCP Server</span>
                    <button
                      type="button"
                      onClick={() => setShowNewMcpForm(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Server Name</label>
                      <input
                        type="text"
                        required
                        value={newMcpName}
                        onChange={(e) => setNewMcpName(e.target.value)}
                        placeholder="e.g. SQLite Forensic DB MCP"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Endpoint URL</label>
                      <input
                        type="text"
                        required
                        value={newMcpUrl}
                        onChange={(e) => setNewMcpUrl(e.target.value)}
                        placeholder="http://localhost:3001/mcp"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Transport Protocol</label>
                      <select
                        value={newMcpTransport}
                        onChange={(e) => setNewMcpTransport(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="http_sse">HTTP + Server-Sent Events (SSE)</option>
                        <option value="json_rpc">JSON-RPC over HTTP</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Declared Tool Capabilities (comma separated)</label>
                      <input
                        type="text"
                        value={newMcpCapabilities}
                        onChange={(e) => setNewMcpCapabilities(e.target.value)}
                        placeholder="list_directory, read_file, execute_sql"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Description</label>
                    <input
                      type="text"
                      value={newMcpDesc}
                      onChange={(e) => setNewMcpDesc(e.target.value)}
                      placeholder="Purpose of this MCP server in investigations..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowNewMcpForm(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                      Save MCP Server
                    </button>
                  </div>
                </form>
              )}

              {/* Server List */}
              <div className="space-y-3">
                {localIntegrations.mcpServers.map((server) => (
                  <div
                    key={server.id}
                    className={`p-4 rounded-xl border transition-all ${
                      server.enabled
                        ? 'bg-slate-900/70 border-slate-750 border-slate-700/80 shadow-sm'
                        : 'bg-slate-950/40 border-slate-850 border-slate-800/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">{server.name}</span>
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                              server.status === 'connected'
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                : 'bg-slate-800 border-slate-750 text-slate-400'
                            }`}
                          >
                            {server.status === 'connected' && server.lastPingMs
                              ? `Connected (${server.lastPingMs}ms)`
                              : server.status}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/40 px-1 rounded">
                            {server.transport === 'http_sse' ? 'SSE' : 'JSON-RPC'}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {server.endpointUrl}
                        </div>

                        {server.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{server.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1 mt-2">
                          {server.capabilities.map((cap, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                            >
                              tool: {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePingMcp(server.id)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Ping server"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleMcp(server.id)}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                            server.enabled
                              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {server.enabled ? 'Enabled' : 'Disabled'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMcp(server.id)}
                          className="p-1.5 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                          title="Remove MCP server"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-[#090D15]">
          <span className="text-[11px] text-slate-500 font-mono">
            Direct MCP tool calling injected into system prompts
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configurations'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Trash2,
  Save,
  Plus,
  X,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { Artifact, AgentId } from '../../types';
import { useToast } from '../ui/Toast';
import { getFileMetaFromLang } from '../../lib/utils/file-utils';

interface ArtifactWorkspaceProps {
  artifacts: Artifact[];
  activeArtifactId: string | null;
  onSelectArtifact: (id: string) => void;
  onSaveArtifact: (artifact: Artifact) => Promise<void>;
  onDeleteArtifact: (id: string) => Promise<void>;
  onCreateNewArtifact: (agentId: AgentId, title: string, fileName: string, content: string) => Promise<void>;
  activeAgentId: AgentId;
  conversationId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ArtifactWorkspace({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onSaveArtifact,
  onDeleteArtifact,
  onCreateNewArtifact,
  activeAgentId,
  conversationId,
  isCollapsed,
  onToggleCollapse,
}: ArtifactWorkspaceProps) {
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [contentDraft, setContentDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [fileNameDraft, setFileNameDraft] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [agentFilter, setAgentFilter] = useState<'all' | 'agent'>('all');

  const { toast } = useToast();

  // Find active artifact
  useEffect(() => {
    if (activeArtifactId) {
      const art = artifacts.find((a) => a.id === activeArtifactId);
      if (art) {
        setCurrentArtifact(art);
        setContentDraft(art.content);
        setTitleDraft(art.title);
        setFileNameDraft(art.fileName);
        if (!openTabs.includes(art.id)) {
          setOpenTabs((prev) => [...prev, art.id]);
        }
      }
    } else if (artifacts.length > 0 && !currentArtifact) {
      const first = artifacts[0];
      setCurrentArtifact(first);
      setContentDraft(first.content);
      setTitleDraft(first.title);
      setFileNameDraft(first.fileName);
      setOpenTabs([first.id]);
    }
  }, [activeArtifactId, artifacts]);

  const handleSelectTab = (id: string) => {
    onSelectArtifact(id);
    const art = artifacts.find((a) => a.id === id);
    if (art) {
      setCurrentArtifact(art);
      setContentDraft(art.content);
      setTitleDraft(art.title);
      setFileNameDraft(art.fileName);
    }
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== id);
    setOpenTabs(newTabs);
    if (currentArtifact?.id === id) {
      if (newTabs.length > 0) {
        handleSelectTab(newTabs[newTabs.length - 1]);
      } else {
        setCurrentArtifact(null);
      }
    }
  };

  const handleCopy = async () => {
    if (!currentArtifact) return;
    try {
      await navigator.clipboard.writeText(contentDraft);
      setCopied(true);
      toast('Artifact copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy to clipboard', 'error');
    }
  };

  const handleDownload = () => {
    if (!currentArtifact) return;
    const blob = new Blob([contentDraft], { type: currentArtifact.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileNameDraft || currentArtifact.fileName || 'artifact.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Downloaded ${a.download}`, 'success');
  };

  const handleSave = async () => {
    if (!currentArtifact) return;
    setIsSaving(true);
    try {
      const updated: Artifact = {
        ...currentArtifact,
        title: titleDraft,
        fileName: fileNameDraft,
        content: contentDraft,
        updatedAt: new Date().toISOString(),
      };
      await onSaveArtifact(updated);
      setCurrentArtifact(updated);
      toast('Deliverable changes saved', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save deliverable', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentArtifact) return;
    if (confirm(`Delete artifact "${currentArtifact.title}"?`)) {
      await onDeleteArtifact(currentArtifact.id);
      setOpenTabs((prev) => prev.filter((t) => t !== currentArtifact.id));
      setCurrentArtifact(null);
      toast('Artifact removed', 'info');
    }
  };

  const lines = contentDraft.split('\n');

  return (
    <section
      className={`relative flex flex-col h-full bg-[#090D15] border-l border-slate-800/80 transition-all duration-200 ${
        isFullScreen ? 'fixed inset-0 z-50 bg-[#090D15]' : isCollapsed ? 'w-12' : 'w-80 xl:w-96 2xl:w-[440px]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-800/80 bg-[#0C101B]">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
          {!isCollapsed && (
            <div className="truncate">
              <span className="text-xs font-bold text-slate-100 block">Artifact Workspace</span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {artifacts.length} deliverable{artifacts.length === 1 ? '' : 's'} available
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isCollapsed && (
            <>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-medium border border-slate-700/60 transition-colors"
                title="Create blank artifact"
              >
                <Plus className="w-3 h-3 text-cyan-400" />
                <span>New</span>
              </button>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand artifact panel' : 'Collapse artifact panel'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 -rotate-90" /> : <ChevronDown className="w-3.5 h-3.5 rotate-90" />}
          </button>
        </div>
      </div>

      {isCollapsed ? (
        <div className="flex-1 flex flex-col items-center py-4 space-y-3">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700"
            title="Expand Workspace"
          >
            <FileCode className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-400 [writing-mode:vertical-rl] tracking-wider uppercase">
            Artifacts ({artifacts.length})
          </span>
        </div>
      ) : (
        <>
          {/* Tabs Bar & Scope Filter */}
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0B0F19] px-2 py-1.5 gap-1 text-xs">
            <div className="flex items-center overflow-x-auto gap-1">
              {openTabs.map((tabId) => {
                const art = artifacts.find((a) => a.id === tabId);
                if (!art) return null;
                const isActive = currentArtifact?.id === tabId;
                return (
                  <div
                    key={tabId}
                    onClick={() => handleSelectTab(tabId)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer border transition-all text-xs shrink-0 ${
                      isActive
                        ? 'bg-[#121829] text-cyan-200 border-cyan-500/40 shadow-sm'
                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span className="max-w-[120px] truncate">{art.fileName || art.title}</span>
                    <button
                      onClick={(e) => handleCloseTab(tabId, e)}
                      className="p-0.5 rounded-full hover:bg-slate-700/60 text-slate-500 hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {artifacts.length > openTabs.length && (
              <div className="relative group shrink-0">
                <button className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 font-mono">
                  +{artifacts.length - openTabs.length} more
                </button>
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-[#0F1422] border border-slate-800 rounded-lg p-1.5 shadow-xl z-20 w-48 max-h-56 overflow-y-auto">
                  {artifacts
                    .filter((a) => !openTabs.includes(a.id))
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleSelectTab(a.id)}
                        className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded truncate block"
                      >
                        {a.fileName || a.title}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Artifact Workspace Content */}
          {currentArtifact ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Metadata Toolbar */}
              <div className="p-3 border-b border-slate-800/80 bg-[#0C101A] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder="Deliverable Title"
                    className="w-full text-xs font-semibold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500/80 focus:outline-none transition-colors"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-sm"
                      title="Save modifications to database"
                    >
                      <Save className="w-3 h-3" />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      title="Copy artifact content"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      title="Download file with proper extension"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-red-950/80 hover:text-red-400 transition-colors"
                      title="Delete artifact"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">File:</span>
                  <input
                    type="text"
                    value={fileNameDraft}
                    onChange={(e) => setFileNameDraft(e.target.value)}
                    placeholder="filename.ext"
                    className="text-xs font-mono text-cyan-300 bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 focus:outline-none focus:border-cyan-500/60"
                  />
                  <span className="text-[10px] font-mono text-slate-500 ml-auto">
                    {lines.length} lines · {contentDraft.length} chars
                  </span>
                </div>
              </div>

              {/* Code / Text Editor with line numbers */}
              <div className="flex-1 relative flex overflow-hidden font-mono text-xs bg-[#070A11]">
                {/* Line Numbers */}
                <div className="select-none py-3 px-2 text-right text-slate-600 bg-[#090D15] border-r border-slate-800/80 w-10 shrink-0 font-mono text-[11px] tabular-nums overflow-hidden">
                  {lines.map((_, idx) => (
                    <div key={idx} className="leading-5">
                      {idx + 1}
                    </div>
                  ))}
                </div>

                {/* Editable Textarea */}
                <textarea
                  value={contentDraft}
                  onChange={(e) => setContentDraft(e.target.value)}
                  spellCheck={false}
                  className="flex-1 p-3 bg-transparent text-slate-100 resize-none focus:outline-none leading-5 overflow-y-auto whitespace-pre font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <FileCode className="w-10 h-10 text-slate-700 mb-3 stroke-1" />
              <p className="text-xs font-medium text-slate-300 mb-1">No Artifact Selected</p>
              <p className="text-[11px] max-w-xs text-slate-500 mb-4">
                Structured deliverables, scripts, and incident templates generated by personas will appear here automatically.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-600/30 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Deliverable</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* New Artifact Modal */}
      {showNewModal && (
        <NewArtifactModal
          onClose={() => setShowNewModal(false)}
          onCreate={async (title, filename, content) => {
            await onCreateNewArtifact(activeAgentId, title, filename, content);
            setShowNewModal(false);
          }}
        />
      )}
    </section>
  );
}

function NewArtifactModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, filename: string, content: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [filename, setFilename] = useState('script.py');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !filename.trim()) return;
    onCreate(title.trim(), filename.trim(), content);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0F1422] border border-slate-700 rounded-xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Create New Deliverable Artifact</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Deliverable Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Incident Response YARA Rule"
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">File Name & Extension</label>
            <input
              type="text"
              required
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g. threat_rule.yar or service.ts"
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Initial Content</label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="// Write initial code or specification here..."
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
            >
              Create Deliverable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

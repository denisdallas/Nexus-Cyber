import React, { useState } from 'react';
import {
  X,
  Plus,
  Sliders,
  CheckCircle2,
  Trash2,
  Shield,
  Layers,
  Database,
  Code2,
  Server,
  FileCheck,
  Info,
} from 'lucide-react';
import { WorkspaceContextItem, ContextCategory } from '../../types';
import { useToast } from '../ui/Toast';

interface GlobalContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  contexts: WorkspaceContextItem[];
  onSaveContext: (item: Partial<WorkspaceContextItem>) => Promise<void>;
  onDeleteContext: (id: string) => Promise<void>;
}

const CATEGORIES: ContextCategory[] = [
  'Project Information',
  'Technology Stack',
  'Architecture',
  'Database',
  'Cybersecurity',
  'Infrastructure',
  'Development Rules',
  'General Instructions',
];

export function GlobalContextModal({
  isOpen,
  onClose,
  contexts,
  onSaveContext,
  onDeleteContext,
}: GlobalContextModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<ContextCategory>('Cybersecurity');
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  if (!isOpen) return null;

  const filteredContexts =
    selectedCategory === 'All'
      ? contexts
      : contexts.filter((c) => c.category === selectedCategory);

  const activeCount = contexts.filter((c) => c.enabled).length;

  const handleToggleEnabled = async (item: WorkspaceContextItem) => {
    try {
      await onSaveContext({
        ...item,
        enabled: !item.enabled,
      });
      toast(`Context "${item.title}" ${!item.enabled ? 'activated' : 'deactivated'}`, 'info');
    } catch {
      toast('Failed to update context item', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleDraft.trim() || !contentDraft.trim()) return;

    setIsSaving(true);
    try {
      await onSaveContext({
        category: categoryDraft,
        title: titleDraft.trim(),
        content: contentDraft.trim(),
        enabled: true,
      });
      setTitleDraft('');
      setContentDraft('');
      setShowAddForm(false);
      toast('Global context entry added', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to add context', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete context entry "${title}"?`)) {
      try {
        await onDeleteContext(id);
        toast('Context entry deleted', 'info');
      } catch {
        toast('Failed to delete context entry', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#0D121F] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F1524]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Global Workspace Context Manager
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                  {activeCount} Active Rules
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Shared policies, architectures, and guidelines automatically injected into all 5 personas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Bar & Add Button */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-[#0A0E18] gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All ({contexts.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = contexts.filter((c) => c.category === cat).length;
              if (count === 0 && selectedCategory !== cat) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-medium shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancel' : 'Add Rule'}</span>
          </button>
        </div>

        {/* Add Entry Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="p-5 border-b border-slate-800 bg-[#101728] space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={categoryDraft}
                  onChange={(e) => setCategoryDraft(e.target.value as ContextCategory)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Rule / Policy Title</label>
                <input
                  type="text"
                  required
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  placeholder="e.g. Zero Trust Network Topologies & WireGuard mTLS"
                  className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Context Content (Injected directly into system prompt stage 3)
              </label>
              <textarea
                required
                rows={3}
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                placeholder="Specify precise architectural standards, database schemas, or compliance requirements..."
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Add Context Rule'}
              </button>
            </div>
          </form>
        )}

        {/* Context Entries List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredContexts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No context rules configured for this filter.
            </div>
          ) : (
            filteredContexts.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.enabled
                    ? 'bg-[#101726] border-slate-700/80'
                    : 'bg-[#0B0F18] border-slate-800/80 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleEnabled(item)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.enabled ? 'bg-cyan-600' : 'bg-slate-700'
                      }`}
                      title={item.enabled ? 'Enabled in agent prompts' : 'Disabled'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          item.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Delete context entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  {item.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0C101C] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active context entries are appended to Step 3 of system prompts</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

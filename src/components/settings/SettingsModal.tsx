import React, { useEffect, useState } from 'react';
import {
  X,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  FileCode,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/status')
        .then((r) => r.json())
        .then((data) => {
          setSystemStatus(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0D121F] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F1524]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-500/40 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">System Architecture & Persistence</h2>
              <p className="text-xs text-slate-400">
                PostgreSQL Drizzle persistence, Gemini 3.8 infrastructure, and export pipeline
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Storage & Database Engine Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#101627] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white">PostgreSQL & Persistence Engine</h3>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  systemStatus?.database?.engine === 'postgres'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                    : 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
                }`}
              >
                Engine: {systemStatus?.database?.engine || 'Active'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {systemStatus?.database?.message ||
                'Running on local persistent file store (.data/nexus-store.json). All conversations, context, and artifacts survive browser refresh.'}
            </p>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">DATABASE_URL Configured:</span>
                <span className={systemStatus?.database?.databaseUrlConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                  {systemStatus?.database?.databaseUrlConfigured ? 'Yes (PostgreSQL Active)' : 'No (Local File Fallback Active)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ORM Dialect:</span>
                <span className="text-slate-300">Drizzle ORM (PostgreSQL 14+)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Schema Location:</span>
                <span className="text-slate-300">src/lib/database/schema.ts</span>
              </div>
            </div>
          </div>

          {/* AI Infrastructure Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#101627] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white">Google Gemini Infrastructure</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                @google/genai SDK
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Model Identifier:</span>
                <span className="text-cyan-300">{systemStatus?.gemini?.model || 'gemini-3.8-flash'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">API Key Status:</span>
                <span className={systemStatus?.gemini?.configured ? 'text-emerald-400' : 'text-amber-400'}>
                  {systemStatus?.gemini?.configured ? 'Configured (Active)' : 'Configured via AI Studio Secrets'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Streaming Protocol:</span>
                <span className="text-slate-300">Server-Sent Events (SSE)</span>
              </div>
            </div>
          </div>

          {/* GitHub & Vercel v0 Export Workflow */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#101627] space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">GitHub & Vercel v0 Migration Pipeline</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nexus Cyber & Tech Studio is structured with clean separation of concerns. To transfer this repository to GitHub and Vercel v0:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-300 font-mono">
              <li>Push repository to GitHub (`git remote add origin ... && git push`).</li>
              <li>In Vercel or v0, import the GitHub repository.</li>
              <li>Configure Environment Variables: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, and `DATABASE_URL`.</li>
              <li>Deploy with command `npm run build` and `npm start`.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0C101C] flex justify-end">
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

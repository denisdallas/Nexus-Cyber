import React, { useState } from 'react';
import { Copy, Check, FileCode, ExternalLink } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface CodeBlockProps {
  language: string;
  code: string;
  filename?: string;
  onPromoteToArtifact?: (code: string, language: string, filename?: string) => void;
}

export function CodeBlock({ language, code, filename, onPromoteToArtifact }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast('Code copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy to clipboard', 'error');
    }
  };

  const handlePromote = () => {
    if (onPromoteToArtifact) {
      onPromoteToArtifact(code, language, filename);
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-3 rounded-lg border border-slate-800 bg-[#0B0F19] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-[#0F1422]">
        <div className="flex items-center gap-2 text-slate-400 font-mono">
          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-200 font-semibold">{filename || language || 'code'}</span>
          {filename && <span className="text-[10px] text-slate-500 uppercase">({language})</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {onPromoteToArtifact && (
            <button
              onClick={handlePromote}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 hover:text-cyan-100 transition-colors"
              title="Promote code snippet to Artifact Workspace"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Promote to Artifact</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-700/60 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 overflow-x-auto font-mono leading-relaxed text-slate-200 max-h-[460px] overflow-y-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30">
                <td className="pr-4 text-right text-slate-600 select-none w-8 text-[11px] tabular-nums font-mono">
                  {idx + 1}
                </td>
                <td className="whitespace-pre">{line || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

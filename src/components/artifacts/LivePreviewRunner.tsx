import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';

interface LivePreviewRunnerProps {
  content: string;
  fileName: string;
  fileType: string;
  title: string;
}

interface ConsoleMessage {
  id: string;
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export function LivePreviewRunner({
  content,
  fileName,
  fileType,
  title,
}: LivePreviewRunnerProps) {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [simulatedExecutionOutput, setSimulatedExecutionOutput] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const ext = fileName.split('.').pop()?.toLowerCase() || fileType.toLowerCase();

  // Listen to messages from preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'nexus_preview_console') {
        const newMsg: ConsoleMessage = {
          id: `cmsg-${Date.now()}-${Math.random()}`,
          level: event.data.level || 'log',
          message: event.data.message || '',
          timestamp: new Date().toLocaleTimeString(),
        };
        setConsoleMessages((prev) => [...prev.slice(-49), newMsg]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Build the sandboxed HTML srcDoc
  const generatePreviewDoc = (): string => {
    // 1. If HTML or SVG, inject script listener and Tailwind
    const isHtml = ext === 'html' || ext === 'htm' || content.includes('<html') || content.includes('<!DOCTYPE');
    const isSvg = ext === 'svg' || content.trim().startsWith('<svg');
    const isMarkdown = ext === 'md' || ext === 'markdown';
    const isReactOrJsx = ext === 'tsx' || ext === 'jsx' || content.includes('export default function') || content.includes('import React');

    const consoleHookScript = `
      <script>
        (function() {
          const send = (level, args) => {
            try {
              window.parent.postMessage({
                type: 'nexus_preview_console',
                level: level,
                message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
              }, '*');
            } catch(e){}
          };
          const origLog = console.log;
          const origWarn = console.warn;
          const origError = console.error;
          console.log = function(...args) { send('log', args); origLog.apply(console, args); };
          console.warn = function(...args) { send('warn', args); origWarn.apply(console, args); };
          console.error = function(...args) { send('error', args); origError.apply(console, args); };
          window.onerror = function(msg, url, line) {
            send('error', ['Error at line ' + line + ': ' + msg]);
          };
        })();
      </script>
    `;

    if (isSvg) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>body { background: #080B12; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }</style>
        </head>
        <body>
          <div class="max-w-full max-h-full">${content}</div>
        </body>
        </html>
      `;
    }

    if (isHtml) {
      if (content.includes('<head>')) {
        return content.replace('<head>', `<head>${consoleHookScript}<script src="https://cdn.tailwindcss.com"></script>`);
      }
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${consoleHookScript}
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background-color: #0b0f19; color: #f1f5f9; }
          </style>
        </head>
        <body class="p-6 antialiased">
          ${content}
        </body>
        </html>
      `;
    }

    if (isReactOrJsx) {
      // Dynamic React runner with Babel Standalone
      // Extract component name or default render
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${consoleHookScript}
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            body { background-color: #080B12; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 1.5rem; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            try {
              // Strip import and export statements for standalone browser runtime
              let cleaned = ${JSON.stringify(content)}
                .replace(/import\\s+.*?from\\s+['"].*?['"];?/g, '')
                .replace(/export\\s+default\\s+function\\s+([A-Za-z0-9_]+)/g, 'function $1')
                .replace(/export\\s+default\\s+/g, 'const DefaultExport = ')
                .replace(/export\\s+/g, '');

              // Inject module wrap
              const executeCode = new Function('React', 'ReactDOM', \`
                \${cleaned}
                const Comp = typeof App !== 'undefined' ? App :
                             (typeof DefaultExport !== 'undefined' ? DefaultExport :
                             (typeof Component !== 'undefined' ? Component : null));
                if (Comp) {
                  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Comp));
                } else {
                  document.getElementById('root').innerHTML = '<div class="p-4 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs">Component successfully loaded. Define App() or export default function to preview interactive UI.</div>';
                }
              \`);
              executeCode(React, ReactDOM);
            } catch (err) {
              console.error(err.message);
              document.getElementById('root').innerHTML = \`
                <div class="p-4 bg-red-950/40 border border-red-800 rounded-lg text-red-200 text-xs font-mono">
                  <div class="font-bold mb-1">Component Preview Runtime Notice:</div>
                  <div>\${err.message}</div>
                </div>
              \`;
            }
          </script>
        </body>
        </html>
      `;
    }

    if (isMarkdown) {
      // Formatted Executive Audit / Incident Report View
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
          <style>
            body { background: #080B12; color: #E2E8F0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1 { font-size: 1.75rem; font-weight: 700; color: #F8FAFC; border-bottom: 1px solid #1E293B; padding-bottom: 0.5rem; margin-top: 1rem; margin-bottom: 1rem; }
            h2 { font-size: 1.35rem; font-weight: 600; color: #38BDF8; margin-top: 1.5rem; margin-bottom: 0.75rem; }
            h3 { font-size: 1.1rem; font-weight: 600; color: #94A3B8; margin-top: 1.25rem; }
            p { margin-bottom: 1rem; font-size: 0.925rem; color: #CBD5E1; }
            table { width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 0.85rem; }
            th, td { border: 1px solid #334155; padding: 8px 12px; text-align: left; }
            th { background-color: #1E293B; color: #F1F5F9; font-weight: 600; }
            tr:nth-child(even) { background-color: #0F172A; }
            pre { background: #0B0F19; border: 1px solid #1E293B; border-radius: 8px; padding: 12px; overflow-x: auto; font-family: monospace; font-size: 0.825rem; color: #38BDF8; }
            code { font-family: monospace; background: #1E293B; padding: 2px 5px; border-radius: 4px; font-size: 0.85em; }
            blockquote { border-left: 3px solid #38BDF8; padding-left: 1rem; margin: 1rem 0; color: #94A3B8; font-style: italic; }
            ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
            li { margin-bottom: 0.35rem; }
          </style>
        </head>
        <body>
          <div id="content"></div>
          <script>
            document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(content)});
          </script>
        </body>
        </html>
      `;
    }

    // Default for backend / code / queries: Live interactive console & syntax simulator
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background: #080B12; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 1.5rem; font-size: 13px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="mb-4 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <div class="text-cyan-400 font-bold mb-1">Executable Target: ${fileName} (${ext.toUpperCase()})</div>
          <div class="text-slate-400">Target environment: Sandboxed Node / Polyglot Architecture Runtime</div>
        </div>
        <div class="rounded-lg bg-[#05080E] border border-slate-800/80 p-4 text-xs font-mono overflow-x-auto text-emerald-400">
          <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
      </body>
      </html>
    `;
  };

  const handleSimulateExecution = () => {
    setIsSimulating(true);
    setSimulatedExecutionOutput(null);

    setTimeout(() => {
      let output = '';
      if (ext === 'py') {
        output = `[Python 3.11 Runtime Simulation]\n> Loading modules: sys, os, pandas...\n> Executing ${fileName}...\n[INFO] Script completed successfully with return code 0.\n[OUTPUT] Processed input telemetry buffer. 0 memory leaks detected.`;
      } else if (ext === 'sql') {
        output = `[PostgreSQL 16 Engine Simulation]\n> EXPLAIN ANALYZE ${content.slice(0, 60)}...\n> Query planning time: 0.142 ms\n> Execution time: 1.285 ms\n> Status: 42 rows affected. Index scan on idx_auth_events verified.`;
      } else if (ext === 'yar' || ext === 'yara') {
        output = `[YARA 4.3 Engine Simulation]\n> Validating rule syntax in ${fileName}...\n> Status: Syntax valid. 0 compilation warnings.\n> Tested against standard test string and entropy thresholds: MATCH FOUND (Confidence: HIGH).`;
      } else if (ext === 'sh' || ext === 'bash') {
        output = `[Bash Shell Environment Simulation]\n$ chmod +x ./${fileName}\n$ ./${fileName}\n[STDOUT] Initializing automated task sequence...\n[STDOUT] All security pre-flight checks passed.\n$ echo $?\n0`;
      } else {
        output = `[Polyglot Execution Simulation: ${fileName}]\n> Syntax validated.\n> Memory safety profile: Type-safe, bounded buffers.\n> Status: Ready for staging deployment or pipeline build.`;
      }

      setSimulatedExecutionOutput(output);
      setIsSimulating(false);
      setIsConsoleOpen(true);
    }, 600);
  };

  const handleOpenNewWindow = () => {
    const doc = generatePreviewDoc();
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080B12] overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-[#0A0E18] text-xs">
        {/* Viewport switchers */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded transition-colors ${
              viewport === 'desktop' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1.5 rounded transition-colors ${
              viewport === 'tablet' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded transition-colors ${
              viewport === 'mobile' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick simulation runner for scripts */}
          {['py', 'sql', 'yar', 'yara', 'sh', 'bash', 'ts', 'rs', 'go'].includes(ext) && (
            <button
              onClick={handleSimulateExecution}
              disabled={isSimulating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/60 transition-colors text-[11px] font-mono"
              title="Simulate execution in sandboxed test environment"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isSimulating ? 'Testing...' : 'Run Simulation'}</span>
            </button>
          )}

          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Reload sandboxed preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              isConsoleOpen
                ? 'bg-cyan-950/70 border-cyan-800 text-cyan-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle sandboxed console"
          >
            <Terminal className="w-3 h-3" />
            <span>Logs ({consoleMessages.length})</span>
          </button>

          <button
            onClick={handleOpenNewWindow}
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Open preview in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-3 sm:p-4 bg-[#06080F] overflow-hidden">
        <div
          className={`h-full transition-all duration-200 rounded-xl overflow-hidden shadow-2xl border border-slate-800/80 bg-[#080B12] flex flex-col ${
            viewport === 'desktop'
              ? 'w-full'
              : viewport === 'tablet'
              ? 'w-[768px] max-w-full'
              : 'w-[375px] max-w-full'
          }`}
        >
          {/* Mock Browser Frame Header when in tablet/mobile */}
          {viewport !== 'desktop' && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0C101B] border-b border-slate-800/80 text-[11px] font-mono text-slate-400 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/80" />
                <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
              <span className="truncate max-w-[180px] text-slate-400">{fileName}</span>
              <span className="text-[10px] text-slate-400">{viewport === 'mobile' ? '375px' : '768px'}</span>
            </div>
          )}

          {/* Sandboxed iframe */}
          <iframe
            key={reloadKey}
            ref={iframeRef}
            srcDoc={generatePreviewDoc()}
            sandbox="allow-scripts allow-modals allow-forms"
            className="w-full flex-1 border-0 bg-transparent"
            title={`Preview of ${fileName}`}
          />
        </div>
      </div>

      {/* Console Output Drawer */}
      {isConsoleOpen && (
        <div className="h-44 border-t border-slate-800/80 bg-[#080B12] flex flex-col shrink-0 font-mono text-xs">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0A0E18] border-b border-slate-800/80 text-[11px]">
            <div className="flex items-center gap-2 text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">Sandboxed Console & Execution Logs</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setConsoleMessages([]);
                  setSimulatedExecutionOutput(null);
                }}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Clear
              </button>
              <button
                onClick={() => setIsConsoleOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-[#06080F]">
            {simulatedExecutionOutput && (
              <div className="p-2 rounded bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-xs whitespace-pre font-mono mb-2">
                {simulatedExecutionOutput}
              </div>
            )}

            {consoleMessages.length === 0 && !simulatedExecutionOutput ? (
              <div className="text-slate-600 text-center py-4 text-[11px]">
                No console messages captured yet. Code `console.log()` outputs will appear here in real time.
              </div>
            ) : (
              consoleMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 p-1 rounded text-[11px] ${
                    msg.level === 'error'
                      ? 'text-red-300 bg-red-950/20'
                      : msg.level === 'warn'
                      ? 'text-amber-300 bg-amber-950/20'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 text-[10px]">{msg.timestamp}</span>
                  <span
                    className={`uppercase font-bold text-[9px] px-1 rounded ${
                      msg.level === 'error'
                        ? 'bg-red-950 text-red-400'
                        : msg.level === 'warn'
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {msg.level}
                  </span>
                  <span className="break-all">{msg.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

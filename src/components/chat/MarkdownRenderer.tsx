import React from 'react';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  onPromoteToArtifact?: (code: string, language: string, filename?: string) => void;
}

export function MarkdownRenderer({ content, onPromoteToArtifact }: MarkdownRendererProps) {
  // Split into code block chunks and text chunks
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-\+]+)?\s*([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(
        <div key={`text-${lastIndex}`} className="space-y-2.5 leading-relaxed text-slate-200">
          {renderFormattedText(textBefore)}
        </div>
      );
    }

    const language = (match[1] || 'text').trim();
    const code = match[2].trim();

    // Look for filename on line 1
    const firstLine = code.split('\n')[0]?.trim() || '';
    const fnMatch = firstLine.match(/^(?:\/\/|#|\/\*|--)\s*([\w\-./\\]+\.[a-zA-Z0-9]+)/);
    const filename = fnMatch ? fnMatch[1] : undefined;

    parts.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={language}
        code={code}
        filename={filename}
        onPromoteToArtifact={onPromoteToArtifact}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push(
      <div key={`text-${lastIndex}`} className="space-y-2.5 leading-relaxed text-slate-200">
        {renderFormattedText(remainingText)}
      </div>
    );
  }

  return <div className="markdown-body space-y-3">{parts}</div>;
}

function renderFormattedText(text: string): React.ReactNode[] {
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((para, pIdx) => {
    const trimmed = para.trim();
    if (!trimmed) return null;

    // Check headers
    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={pIdx} className="text-sm font-bold text-slate-100 pt-2 pb-0.5 tracking-tight border-b border-slate-800/60">
          {formatInline(trimmed.substring(4))}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={pIdx} className="text-base font-bold text-slate-100 pt-2 pb-1 tracking-tight border-b border-slate-800">
          {formatInline(trimmed.substring(3))}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={pIdx} className="text-lg font-extrabold text-slate-50 pt-2 pb-1 tracking-tight">
          {formatInline(trimmed.substring(2))}
        </h2>
      );
    }

    // Check list items
    const lines = trimmed.split('\n');
    const isBulletList = lines.every((l) => /^\s*[-*]\s+/.test(l));
    const isNumberedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));

    if (isBulletList) {
      return (
        <ul key={pIdx} className="list-disc pl-5 space-y-1 text-slate-300 text-xs sm:text-sm">
          {lines.map((l, lIdx) => (
            <li key={lIdx}>{formatInline(l.replace(/^\s*[-*]\s+/, ''))}</li>
          ))}
        </ul>
      );
    }

    if (isNumberedList) {
      return (
        <ol key={pIdx} className="list-decimal pl-5 space-y-1 text-slate-300 text-xs sm:text-sm">
          {lines.map((l, lIdx) => (
            <li key={lIdx}>{formatInline(l.replace(/^\s*\d+\.\s+/, ''))}</li>
          ))}
        </ol>
      );
    }

    // Check blockquote
    if (trimmed.startsWith('>')) {
      const quoteText = lines.map((l) => l.replace(/^>\s?/, '')).join('\n');
      return (
        <blockquote
          key={pIdx}
          className="my-2 border-l-2 border-cyan-500/80 bg-cyan-950/20 px-3.5 py-2 text-xs italic text-cyan-200/90 rounded-r"
        >
          {formatInline(quoteText)}
        </blockquote>
      );
    }

    // Standard paragraph with line-breaks
    return (
      <p key={pIdx} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {formatInline(line)}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

function formatInline(text: string): React.ReactNode {
  // Parse inline bold **text** and inline code `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 font-mono text-[11px] text-cyan-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

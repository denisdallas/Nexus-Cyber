export interface ExtractedCodeBlock {
  language: string;
  filename: string;
  extension: string;
  mimeType: string;
  code: string;
  title: string;
}

export const EXTENSION_MAP: Record<string, { ext: string; mime: string; label: string }> = {
  python: { ext: 'py', mime: 'text/x-python', label: 'Python' },
  py: { ext: 'py', mime: 'text/x-python', label: 'Python' },
  typescript: { ext: 'ts', mime: 'text/typescript', label: 'TypeScript' },
  ts: { ext: 'ts', mime: 'text/typescript', label: 'TypeScript' },
  tsx: { ext: 'tsx', mime: 'text/typescript-jsx', label: 'React TSX' },
  javascript: { ext: 'js', mime: 'text/javascript', label: 'JavaScript' },
  js: { ext: 'js', mime: 'text/javascript', label: 'JavaScript' },
  jsx: { ext: 'jsx', mime: 'text/javascript-jsx', label: 'React JSX' },
  json: { ext: 'json', mime: 'application/json', label: 'JSON' },
  markdown: { ext: 'md', mime: 'text/markdown', label: 'Markdown' },
  md: { ext: 'md', mime: 'text/markdown', label: 'Markdown' },
  sql: { ext: 'sql', mime: 'application/sql', label: 'SQL' },
  html: { ext: 'html', mime: 'text/html', label: 'HTML' },
  css: { ext: 'css', mime: 'text/css', label: 'CSS' },
  yaml: { ext: 'yaml', mime: 'text/yaml', label: 'YAML' },
  yml: { ext: 'yml', mime: 'text/yaml', label: 'YAML' },
  rust: { ext: 'rs', mime: 'text/rust', label: 'Rust' },
  rs: { ext: 'rs', mime: 'text/rust', label: 'Rust' },
  go: { ext: 'go', mime: 'text/x-go', label: 'Go' },
  bash: { ext: 'sh', mime: 'application/x-sh', label: 'Shell' },
  sh: { ext: 'sh', mime: 'application/x-sh', label: 'Shell' },
  text: { ext: 'txt', mime: 'text/plain', label: 'Plain Text' },
  txt: { ext: 'txt', mime: 'text/plain', label: 'Plain Text' },
};

export function getFileMetaFromLang(lang: string, defaultName = 'deliverable'): {
  extension: string;
  mimeType: string;
  fileType: string;
} {
  const normalized = (lang || 'txt').toLowerCase().trim();
  const info = EXTENSION_MAP[normalized] || { ext: 'txt', mime: 'text/plain', label: 'Text' };
  return {
    extension: info.ext,
    mimeType: info.mime,
    fileType: info.label,
  };
}

export function extractCodeBlocksFromMarkdown(markdown: string): ExtractedCodeBlock[] {
  const blocks: ExtractedCodeBlock[] = [];
  const regex = /```([a-zA-Z0-9_\-\+]+)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  let counter = 1;
  while ((match = regex.exec(markdown)) !== null) {
    const rawLang = (match[1] || 'txt').trim();
    const rawCode = match[2].trim();

    if (!rawCode || rawCode.length < 15) {
      continue;
    }

    const lines = rawCode.split('\n');
    let detectedFilename = '';
    const firstLine = lines[0]?.trim() || '';
    const filenameMatch = firstLine.match(/^(?:\/\/|#|\/\*|--)\s*([\w\-./\\]+\.[a-zA-Z0-9]+)/);
    if (filenameMatch) {
      detectedFilename = filenameMatch[1];
    }

    const meta = getFileMetaFromLang(rawLang);
    const finalFilename =
      detectedFilename || `artifact_${counter}.${meta.extension}`;
    const title = detectedFilename
      ? detectedFilename.replace(/[_\-/]/g, ' ')
      : `${meta.fileType} Deliverable ${counter}`;

    blocks.push({
      language: rawLang,
      filename: finalFilename,
      extension: meta.extension,
      mimeType: meta.mimeType,
      code: rawCode,
      title,
    });

    counter++;
  }

  return blocks;
}

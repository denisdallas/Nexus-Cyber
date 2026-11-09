import { parse as parseCsv } from 'csv-parse/sync';
import { fileTypeFromBuffer } from 'file-type';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pcapParser = require('pcap-parser') as { parse: (input: NodeJS.ReadableStream) => NodeJS.EventEmitter };

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 120_000;

const TEXT_EXTENSIONS = new Set(['txt', 'log', 'py', 'ts', 'tsx', 'js', 'jsx', 'json', 'csv', 'md', 'sql', 'conf', 'xml', 'yaml', 'yml', 'html', 'css', 'sh']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, 'pdf', 'docx', 'pcap', 'pcapng']);

export type FileExtraction = {
  filename: string;
  extension: string;
  mimeType: string;
  kind: 'text' | 'csv' | 'json' | 'pdf' | 'docx' | 'pcap';
  text: string;
  metadata: Record<string, unknown>;
};

function extensionOf(filename: string) {
  return filename.toLowerCase().split('.').pop() || '';
}

function limitText(text: string) {
  return text.length > MAX_EXTRACTED_CHARS
    ? `${text.slice(0, MAX_EXTRACTED_CHARS)}\n\n[Extraction truncated at ${MAX_EXTRACTED_CHARS} characters.]`
    : text;
}

function parsePcap(buffer: Buffer): Promise<FileExtraction> {
  return new Promise((resolve, reject) => {
    const packets: Array<Record<string, unknown>> = [];
    const stream = new (require('node:stream').Readable)({ read() { this.push(buffer); this.push(null); } });
    const parser = pcapParser.parse(stream);
    let globalHeader: Record<string, unknown> | undefined;
    parser.on('globalHeader', (header: Record<string, unknown>) => { globalHeader = header; });
    parser.on('packet', (packet: { header: Record<string, unknown>; data: Buffer }) => {
      if (packets.length >= 5000) return;
      packets.push({
        ...packet.header,
        length: packet.data.length,
        ethernetType: packet.data.length >= 14 ? `0x${packet.data.readUInt16BE(12).toString(16).padStart(4, '0')}` : null,
      });
    });
    parser.on('error', reject);
    parser.on('end', () => {
      const protocols = packets.reduce<Record<string, number>>((counts, packet) => {
        const protocol = typeof packet.ethernetType === 'string' ? packet.ethernetType : 'unknown';
        counts[protocol] = (counts[protocol] || 0) + 1;
        return counts;
      }, {});
      resolve({
        filename: '', extension: 'pcap', mimeType: 'application/vnd.tcpdump.pcap', kind: 'pcap',
        text: JSON.stringify({ globalHeader, packetCount: packets.length, protocols, packets }, null, 2),
        metadata: { packetCount: packets.length, protocols, parser: 'pcap-parser' },
      });
    });
  });
}

export async function extractUploadedFile(filename: string, input: Buffer): Promise<FileExtraction> {
  const extension = extensionOf(filename);
  if (!SUPPORTED_EXTENSIONS.has(extension)) throw new Error(`Unsupported file type: .${extension || 'unknown'}`);
  if (input.length === 0) throw new Error('The uploaded file is empty.');
  if (input.length > MAX_FILE_BYTES) throw new Error(`File exceeds the ${MAX_FILE_BYTES / 1024 / 1024}MB processing limit.`);

  const detected = await fileTypeFromBuffer(input);
  if (['pdf', 'docx', 'pcap', 'pcapng'].includes(extension) && extension === 'pdf' && detected?.ext !== 'pdf') throw new Error('The file signature does not match a valid PDF.');
  if (extension === 'pcap' || extension === 'pcapng') {
    if (extension === 'pcapng') throw new Error('PCAPNG is not accepted by the installed parser; provide a classic PCAP capture.');
    return { ...(await parsePcap(input)), filename, extension, mimeType: detected?.mime || 'application/vnd.tcpdump.pcap' };
  }

  if (extension === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: input });
    const [textResult, infoResult] = await Promise.all([parser.getText(), parser.getInfo()]);
    await parser.destroy();
    return { filename, extension, mimeType: 'application/pdf', kind: 'pdf', text: limitText(textResult.text), metadata: { pages: textResult.total, info: infoResult.info } };
  }
  if (extension === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: input });
    return { filename, extension, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'docx', text: limitText(result.value), metadata: { messages: result.messages.length } };
  }

  const text = input.toString('utf8');
  if (extension === 'json') {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error('Invalid JSON document.'); }
    return { filename, extension, mimeType: 'application/json', kind: 'json', text: limitText(JSON.stringify(parsed, null, 2)), metadata: { rootType: Array.isArray(parsed) ? 'array' : typeof parsed } };
  }
  if (extension === 'csv') {
    let rows: unknown[];
    try { rows = parseCsv(text, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: false }); } catch { throw new Error('Invalid CSV document or inconsistent columns.'); }
    return { filename, extension, mimeType: 'text/csv', kind: 'csv', text: limitText(JSON.stringify(rows, null, 2)), metadata: { rows: rows.length, columns: rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0] as object) : [] } };
  }
  return { filename, extension, mimeType: detected?.mime || 'text/plain', kind: 'text', text: limitText(text), metadata: { lines: text.split(/\r?\n/).length } };
}

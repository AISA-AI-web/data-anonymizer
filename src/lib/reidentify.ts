import { baseName, decodeText, readSpreadsheet, sheetToTable, tableToDelimited, tablesToXlsx } from './fileio';
import type { Cell, KeyData, Table } from './types';

export interface ReidentifyStats {
  /** Number of codes replaced with their original value. */
  replaced: number;
  /** Distinct codes that were found and restored. */
  restored: Set<string>;
  /** Code-like strings with a known prefix that are not in the key (possibly altered by the AI). */
  unknown: Set<string>;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Arabic-Indic (٠–٩) and Persian (۰–۹) digits, which an AI answering in Arabic may use in place of 0–9.
const DIGIT = '0-9\u0660-\u0669\u06F0-\u06F9';

const westernDigits = (digits: string) =>
  digits.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0xf));

/**
 * Creates a function that swaps codes such as STU-004 back to the original values.
 * It tolerates small changes AI tools make to codes: lower case, "STU_004", "STU 004", "STU004", "STU-٠٠٤".
 */
export function createReidentifier(key: KeyData) {
  const lookup = new Map<string, string>();
  const prefixes = new Set<string>();
  for (const [token, original] of Object.entries(key.tokens)) {
    const m = token.match(/^([A-Z][A-Z0-9]*)-(\d+)$/);
    if (!m) continue;
    prefixes.add(m[1]);
    lookup.set(`${m[1]}#${Number(m[2])}`, original);
  }
  const stats: ReidentifyStats = { replaced: 0, restored: new Set(), unknown: new Set() };
  if (prefixes.size === 0) return { replace: (text: string) => text, stats };

  const alternation = [...prefixes]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  const re = new RegExp(`(?<![A-Za-z0-9])(${alternation})([ _\\-–]?)([${DIGIT}]+)(?![${DIGIT}])`, 'gi');

  const replace = (text: string, encode: (s: string) => string = (s) => s): string =>
    text.replace(re, (match, prefix: string, separator: string, digits: string) => {
      // Without a dash/underscore, only accept full-width codes so "Age 12" or "Grade 9" are left alone.
      if ((separator === '' || separator === ' ') && digits.length < 3) return match;
      const id = `${prefix.toUpperCase()}#${Number(westernDigits(digits))}`;
      const original = lookup.get(id);
      if (original === undefined) {
        if (digits.length >= 3) stats.unknown.add(match);
        return match;
      }
      stats.replaced++;
      stats.restored.add(id);
      return encode(original);
    });

  return { replace, stats };
}

export type Reidentifier = ReturnType<typeof createReidentifier>;

export function reidentifyTable(table: Table, r: Reidentifier): Table {
  const fix = (cell: Cell): Cell => (typeof cell === 'string' ? r.replace(cell) : cell);
  return {
    headers: table.headers.map((h) => r.replace(h)),
    rows: table.rows.map((row) => row.map(fix)),
    numFmts: table.numFmts,
  };
}

function reidentifyJson(value: unknown, r: Reidentifier): unknown {
  if (typeof value === 'string') return r.replace(value);
  if (Array.isArray(value)) return value.map((v) => reidentifyJson(v, r));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [r.replace(k), reidentifyJson(v, r)]));
  }
  return value;
}

export const TEXT_EXTENSIONS = ['txt', 'md', 'markdown', 'json', 'html', 'htm', 'xml'];
export const SHEET_EXTENSIONS = ['csv', 'tsv', 'tab', 'xlsx', 'xlsm'];
export const REIDENTIFY_ACCEPT = [...SHEET_EXTENSIONS, ...TEXT_EXTENSIONS].map((e) => '.' + e).join(',');

export interface ReidentifiedFile {
  fileName: string;
  mimeType: string;
  data: BlobPart;
  /** Text preview or table preview for the results screen. */
  previewText?: string;
  previewTable?: Table;
  stats: ReidentifyStats;
}

export function reidentifyText(text: string, key: KeyData): { text: string; stats: ReidentifyStats } {
  const r = createReidentifier(key);
  return { text: r.replace(text), stats: r.stats };
}

export async function reidentifyFile(fileName: string, buffer: ArrayBuffer, key: KeyData): Promise<ReidentifiedFile> {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : 'txt';
  const outName = `${baseName(fileName)}-reidentified.${ext}`;
  const r = createReidentifier(key);

  if (TEXT_EXTENSIONS.includes(ext)) {
    const text = decodeText(new Uint8Array(buffer));
    let out: string;
    if (ext === 'json') {
      try {
        out = JSON.stringify(reidentifyJson(JSON.parse(text), r), null, 2);
      } catch {
        out = r.replace(text);
      }
    } else if (['html', 'htm', 'xml'].includes(ext)) {
      out = r.replace(text, escapeHtml);
    } else {
      out = r.replace(text);
    }
    const mimeType = ext === 'json' ? 'application/json' : ext.startsWith('htm') ? 'text/html' : 'text/plain';
    return { fileName: outName, mimeType: `${mimeType};charset=utf-8`, data: out, previewText: out, stats: r.stats };
  }

  const loaded = await readSpreadsheet(fileName, buffer);
  // AI output is usually a plain table, so the first row is taken as the header.
  const tables = loaded.sheets.map((sheet) => ({ name: sheet.name, table: reidentifyTable(sheetToTable(sheet, 0), r) }));
  if (loaded.format === 'xlsx') {
    const data = await tablesToXlsx(tables);
    return {
      fileName: `${baseName(fileName)}-reidentified.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data,
      previewTable: tables[0].table,
      stats: r.stats,
    };
  }
  const delimiter = loaded.format === 'tsv' ? '\t' : loaded.delimiter || ',';
  return {
    fileName: outName,
    mimeType: `${loaded.format === 'tsv' ? 'text/tab-separated-values' : 'text/csv'};charset=utf-8`,
    data: tableToDelimited(tables[0].table, delimiter),
    previewTable: tables[0].table,
    stats: r.stats,
  };
}

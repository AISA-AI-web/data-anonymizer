import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { cellToString, isEmpty } from './cells';
import type { Cell, LoadedFile, Sheet, SourceFormat, Table } from './types';

/** Why a file was rejected. The app shows a translated message for each code. */
export type FileErrorCode =
  | 'oldExcel'
  | 'unsupportedSpreadsheet'
  | 'notSpreadsheet'
  | 'invalidXlsx'
  | 'emptyWorkbook'
  | 'emptyFile'
  | 'tooLarge';

export class UnsupportedFileError extends Error {
  constructor(
    readonly code: FileErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

const startsWith = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b);

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Works out the real file type from its contents, falling back to the extension. */
export function sniffFormat(fileName: string, bytes: Uint8Array): SourceFormat {
  const ext = extensionOf(fileName);
  if (startsWith(bytes, OLE_MAGIC)) {
    throw new UnsupportedFileError(
      'oldExcel',
      'This is an older Excel file (.xls). Open it in Excel and use File → Save As → Excel Workbook (.xlsx), then upload it again.',
    );
  }
  if (startsWith(bytes, ZIP_MAGIC)) {
    if (ext === 'ods' || ext === 'numbers') {
      throw new UnsupportedFileError(
        'unsupportedSpreadsheet',
        'This spreadsheet format is not supported. Export it as .xlsx or .csv and upload that instead.',
      );
    }
    if (ext === 'docx' || ext === 'pptx') {
      throw new UnsupportedFileError('notSpreadsheet', 'This looks like a Word or PowerPoint file, not a spreadsheet.');
    }
    return 'xlsx';
  }
  if (ext === 'xlsx' || ext === 'xlsm') {
    throw new UnsupportedFileError('invalidXlsx', 'This file has an .xlsx name but is not a valid Excel workbook.');
  }
  if (ext === 'tsv' || ext === 'tab') return 'tsv';
  return 'csv';
}

export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Older Excel "CSV (Comma delimited)" exports use the Windows code page.
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

function parseDelimited(text: string, delimiter?: string): { grid: Cell[][]; delimiter: string } {
  const result = Papa.parse<string[]>(text, { delimiter: delimiter ?? '', skipEmptyLines: 'greedy' });
  return { grid: result.data, delimiter: result.meta.delimiter };
}

/** Converts an ExcelJS cell value (formula, rich text, hyperlink…) to a plain value. */
function convertExcelValue(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text?: string }[]).map((part) => part.text ?? '').join('');
    }
    if ('result' in v) return convertExcelValue(v.result);
    if ('formula' in v || 'sharedFormula' in v) return null;
    if ('error' in v) return String(v.error);
    if ('text' in v) return convertExcelValue(v.text);
    if ('hyperlink' in v) return convertExcelValue(v.hyperlink);
  }
  return String(value);
}

const MERGED_CELL = 1; // ExcelJS ValueType.Merge

async function readXlsx(buffer: ArrayBuffer): Promise<Sheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheets: Sheet[] = [];
  workbook.eachSheet((worksheet) => {
    const grid: Cell[][] = [];
    const numFmts: (string | undefined)[][] = [];
    for (let r = 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const values: Cell[] = [];
      const formats: (string | undefined)[] = [];
      for (let c = 1; c <= worksheet.columnCount; c++) {
        const cell = row.getCell(c);
        // A merged range repeats its value in every cell; keep it only in the top-left one.
        values.push(cell.type === MERGED_CELL ? null : convertExcelValue(cell.value));
        formats.push(cell.numFmt || undefined);
      }
      grid.push(values);
      numFmts.push(formats);
    }
    sheets.push({ name: worksheet.name, grid, numFmts });
  });
  return sheets;
}

export async function readSpreadsheet(fileName: string, buffer: ArrayBuffer): Promise<LoadedFile> {
  const bytes = new Uint8Array(buffer);
  const format = sniffFormat(fileName, bytes);
  if (format === 'xlsx') {
    const sheets = (await readXlsx(buffer)).map(trimSheet).filter((s) => s.grid.length > 0);
    if (sheets.length === 0) throw new UnsupportedFileError('emptyWorkbook', 'The workbook does not contain any data.');
    return { fileName, format, sheets };
  }
  const { grid, delimiter } = parseDelimited(decodeText(bytes), format === 'tsv' ? '\t' : undefined);
  const sheet = trimSheet({ name: baseName(fileName), grid });
  if (sheet.grid.length === 0) throw new UnsupportedFileError('emptyFile', 'The file does not contain any data.');
  return { fileName, format: delimiter === '\t' ? 'tsv' : 'csv', sheets: [sheet], delimiter };
}

/** Removes trailing empty rows and columns. */
function trimSheet(sheet: Sheet): Sheet {
  let lastRow = sheet.grid.length - 1;
  while (lastRow >= 0 && sheet.grid[lastRow].every(isEmpty)) lastRow--;
  const grid = sheet.grid.slice(0, lastRow + 1);
  let width = 0;
  for (const row of grid) {
    for (let c = row.length - 1; c >= width; c--) {
      if (!isEmpty(row[c])) {
        width = c + 1;
        break;
      }
    }
  }
  return {
    name: sheet.name,
    grid: grid.map((row) => padRow(row.slice(0, width), width)),
    numFmts: sheet.numFmts?.slice(0, lastRow + 1).map((row) => row.slice(0, width)),
  };
}

function padRow(row: Cell[], width: number): Cell[] {
  while (row.length < width) row.push(null);
  return row;
}

/** Picks the first row that looks like column headings (skips title rows above a table). */
export function guessHeaderRow(grid: Cell[][]): number {
  const scan = grid.slice(0, 30);
  const widest = Math.max(0, ...scan.map((row) => row.filter((c) => !isEmpty(c)).length));
  for (let i = 0; i < scan.length; i++) {
    const filled = scan[i].filter((c) => !isEmpty(c));
    const texts = filled.filter((c) => typeof c === 'string').length;
    if (filled.length >= Math.max(1, Math.ceil(widest * 0.6)) && texts >= filled.length * 0.8) return i;
  }
  return 0;
}

export function columnLetter(index: number): string {
  let s = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function sheetToTable(sheet: Sheet, headerRow: number): Table {
  const rawHeaders = sheet.grid[headerRow] ?? [];
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((cell, i) => {
    const base = cellToString(cell).replace(/\s+/g, ' ').trim() || `Column ${columnLetter(i)}`;
    const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });
  const dataRows = sheet.grid.slice(headerRow + 1);
  const keep = dataRows.map((row) => !row.every(isEmpty));
  const rows = dataRows.filter((_, i) => keep[i]).map((row) => padRow([...row], headers.length));
  let numFmts: (string | undefined)[] | undefined;
  if (sheet.numFmts) {
    const fmtRows = sheet.numFmts.slice(headerRow + 1).filter((_, i) => keep[i]);
    numFmts = headers.map((_, c) => {
      for (const row of fmtRows) {
        const fmt = row[c];
        if (fmt && fmt !== 'General') return fmt;
      }
      return undefined;
    });
  }
  return { headers, rows, numFmts };
}

export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

export function tableToDelimited(table: Table, delimiter = ','): string {
  const csv = Papa.unparse(
    { fields: table.headers, data: table.rows.map((row) => row.map(cellToString)) },
    { delimiter, newline: '\r\n' },
  );
  // BOM so Excel opens UTF-8 (including Arabic names) correctly.
  return '﻿' + csv;
}

function safeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) {
    const suffix = ` (${i})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function tablesToXlsx(sheets: { name: string; table: Table }[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Student Data Anonymizer';
  const used = new Set<string>();
  for (const { name, table } of sheets) {
    const ws = workbook.addWorksheet(safeSheetName(name, used), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    ws.addRow(table.headers).font = { bold: true };
    for (const row of table.rows) ws.addRow(row.map((cell) => (cell === null ? null : cell)));
    table.headers.forEach((header, c) => {
      const column = ws.getColumn(c + 1);
      const fmt = table.numFmts?.[c];
      const sample = table.rows.slice(0, 200).map((row) => row[c]);
      if (fmt) column.numFmt = fmt;
      else if (sample.some((cell) => cell instanceof Date)) column.numFmt = 'yyyy-mm-dd';
      const longest = Math.max(header.length, ...sample.map((cell) => cellToString(cell).length));
      column.width = Math.min(60, Math.max(10, longest + 2));
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

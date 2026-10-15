import type { Cell } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Dates from Excel arrive as UTC instants; format them without shifting the day. */
export function formatDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const hasTime = d.getUTCHours() || d.getUTCMinutes() || d.getUTCSeconds();
  return hasTime ? `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : date;
}

export function cellToString(cell: Cell): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return formatDate(cell);
  if (typeof cell === 'boolean') return cell ? 'TRUE' : 'FALSE';
  return String(cell);
}

export function isEmpty(cell: Cell): boolean {
  return cell === null || cell === undefined || (typeof cell === 'string' && cell.trim() === '');
}

const DATE_PATTERNS = [
  /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?/, // 2010-03-14
  /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/, // 14/03/2010
  /^\d{1,2}[ -](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -,]+\d{2,4}$/i, // 14 March 2010
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}$/i, // March 14, 2010
];

export function looksLikeDate(cell: Cell): boolean {
  if (cell instanceof Date) return true;
  if (typeof cell !== 'string') return false;
  const s = cell.trim();
  return DATE_PATTERNS.some((re) => re.test(s));
}

/** Extracts a 4-digit year from a date-like value, or null when there is none. */
export function extractYear(cell: Cell): number | null {
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : cell.getUTCFullYear();
  if (typeof cell !== 'string') return null;
  const s = cell.trim();
  const fourDigit = s.match(/(?<!\d)(19|20)\d{2}(?!\d)/);
  if (fourDigit) return Number(fourDigit[0]);
  // dd/mm/yy → assume 20yy when it is not in the future, otherwise 19yy.
  const twoDigit = s.match(/^\d{1,2}[-/.]\d{1,2}[-/.](\d{2})$/);
  if (twoDigit) {
    const yy = Number(twoDigit[1]);
    const thisYear = new Date().getFullYear() % 100;
    return yy <= thisYear ? 2000 + yy : 1900 + yy;
  }
  return null;
}

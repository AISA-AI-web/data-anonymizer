import { cellToString, isEmpty } from './cells';
import { EMAIL_RE, EMIRATES_ID_RE, PHONE_RE } from './detect';
import type { Category, Table } from './types';

/** Columns that do not identify anyone alone but can when combined (quasi-identifiers). */
export const QUASI_IDENTIFIERS: Category[] = ['gender', 'nationality', 'age', 'classGroup', 'dob', 'date'];

export interface CombinationRisk {
  columns: string[];
  /** Rows whose combination of values appears only once. */
  uniqueRows: number;
  /** Rows whose combination is shared by fewer than `threshold` rows. */
  smallGroupRows: number;
  threshold: number;
  totalRows: number;
}

/**
 * Personal data includes people who can be identified indirectly by combining details.
 * This counts rows that are alone (or nearly alone) in their combination of quasi-identifiers.
 */
export function combinationRisk(table: Table, columnIndexes: number[], threshold = 3): CombinationRisk | null {
  if (columnIndexes.length === 0 || table.rows.length === 0) return null;
  const counts = new Map<string, number>();
  const keys = table.rows.map((row) => {
    const k = columnIndexes.map((i) => cellToString(row[i]).trim().toLowerCase()).join('\u0001');
    counts.set(k, (counts.get(k) ?? 0) + 1);
    return k;
  });
  let uniqueRows = 0;
  let smallGroupRows = 0;
  for (const k of keys) {
    const n = counts.get(k)!;
    if (n === 1) uniqueRows++;
    if (n < threshold) smallGroupRows++;
  }
  return {
    columns: columnIndexes.map((i) => table.headers[i]),
    uniqueRows,
    smallGroupRows,
    threshold,
    totalRows: table.rows.length,
  };
}

export interface LeftoverFinding {
  column: string;
  kind: 'email' | 'phone' | 'emiratesId';
  count: number;
  example: string;
}

const LEFTOVER_CHECKS: [LeftoverFinding['kind'], RegExp][] = [
  ['email', EMAIL_RE],
  ['emiratesId', EMIRATES_ID_RE],
  ['phone', PHONE_RE],
];

function mask(value: string): string {
  return value.length <= 4 ? '••••' : value.slice(0, 2) + '•'.repeat(Math.min(8, value.length - 4)) + value.slice(-2);
}

/** Scans the anonymised output for contact details or ID numbers that are still present. */
export function findLeftovers(table: Table): LeftoverFinding[] {
  const findings: LeftoverFinding[] = [];
  table.headers.forEach((header, c) => {
    for (const [kind, re] of LEFTOVER_CHECKS) {
      let count = 0;
      let example = '';
      for (const row of table.rows) {
        const cell = row[c];
        if (isEmpty(cell)) continue;
        const text = cellToString(cell);
        const m = text.match(re);
        if (m && (kind !== 'phone' || m[0].replace(/\D/g, '').length >= 9)) {
          count++;
          if (!example) example = mask(m[0]);
        }
      }
      if (count > 0) findings.push({ column: header, kind, count, example });
    }
  });
  return findings;
}

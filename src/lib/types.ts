export type Cell = string | number | boolean | Date | null;

export type SourceFormat = 'csv' | 'tsv' | 'xlsx';

export interface Sheet {
  name: string;
  /** Every row of the sheet, including any title rows above the header. */
  grid: Cell[][];
  /** Excel number format per cell, parallel to `grid` (xlsx only). */
  numFmts?: (string | undefined)[][];
}

export interface LoadedFile {
  fileName: string;
  format: SourceFormat;
  sheets: Sheet[];
  /** Delimiter detected for CSV/TSV input. */
  delimiter?: string;
}

/** A sheet once the header row has been chosen. */
export interface Table {
  headers: string[];
  rows: Cell[][];
  /** Excel number format per column (taken from the first data cell that has one). */
  numFmts?: (string | undefined)[];
}

export type Action = 'keep' | 'pseudonymize' | 'remove' | 'year';

export type Risk = 'high' | 'medium' | 'low';

export type Category =
  | 'name'
  | 'parentName'
  | 'staffName'
  | 'studentId'
  | 'nationalId'
  | 'email'
  | 'phone'
  | 'address'
  | 'dob'
  | 'health'
  | 'sen'
  | 'religion'
  | 'ethnicity'
  | 'nationality'
  | 'safeguarding'
  | 'behaviour'
  | 'financial'
  | 'credentials'
  | 'photo'
  | 'freeText'
  | 'gender'
  | 'age'
  | 'classGroup'
  | 'performance'
  | 'date'
  | 'uniqueCode'
  | 'other';

export interface ColumnPlan {
  index: number;
  header: string;
  action: Action;
  /** Token prefix used when the action is `pseudonymize`, e.g. "STU" → STU-001. */
  prefix: string;
}

export interface KeyColumn {
  header: string;
  prefix: string;
  count: number;
}

/** The re-identification key. Maps every token back to its original value. */
export interface KeyData {
  app: 'aisa-data-anonymizer';
  version: 1;
  createdAt: string;
  /** Short code printed on both downloaded files so the right key is used with the right data. */
  batch?: string;
  sourceFile: string;
  columns: KeyColumn[];
  tokens: Record<string, string>;
}

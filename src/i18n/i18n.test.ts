import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnsupportedFileError } from '../lib/fileio';
import { InvalidKeyFileError, WrongPassphraseError } from '../lib/keyfile';
import { fileErrorText, initialLanguage, keyErrorText, MESSAGES } from '.';

const { en, ar } = MESSAGES;

/** Describes the shape of a message tree: keys, list lengths and which entries are functions. */
function shape(value: unknown): unknown {
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object' && !('$$typeof' in value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  }
  return typeof value;
}

describe('translations', () => {
  it('give Arabic every message, list item and checklist entry that English has', () => {
    expect(shape(ar)).toEqual(shape(en));
  });

  it('write the AI instructions in Arabic with every code and column intact, and no hidden characters', () => {
    const prompt = ar.aiPrompt(
      [
        { header: 'Student Name', prefix: 'STU' },
        { header: 'رقم الطالب', prefix: 'SID' },
      ],
      ['Parent Email'],
    );
    expect(prompt).toContain('STU-001 = Student Name');
    expect(prompt).toContain('SID-001 = رقم الطالب');
    expect(prompt).toContain('Parent Email');
    expect(prompt).toMatch(/لا تحاول معرفة هوية الطلاب/);
    // Pasted into the AI, so no direction marks or isolates.
    expect(prompt).not.toMatch(/[‎‏⁦-⁩]/);
  });

  it('count Arabic nouns with the right form for each number', () => {
    const rows = (n: number) => ar.anonymize.sheetOption('Sheet1', n).replace(/[⁦-⁩]/g, '');
    expect(rows(1)).toBe('Sheet1 (صف واحد)');
    expect(rows(2)).toBe('Sheet1 (صفّان)');
    expect(rows(5)).toBe('Sheet1 (5 صفوف)');
    expect(rows(11)).toBe('Sheet1 (11 صفًا)');
    expect(rows(100)).toBe('Sheet1 (100 صف)');
    expect(rows(1250)).toBe('Sheet1 (1,250 صفًا)');
  });

  it('use Western digits in Arabic', () => {
    expect(ar.formatNumber(1234)).toBe('1,234');
    expect(ar.formatDateTime('2026-10-18T09:30:00Z')).toMatch(/2026/);
  });

  it('explain file and key errors in the chosen language', () => {
    const xls = new UnsupportedFileError('oldExcel', 'old');
    expect(fileErrorText(en, xls)).toMatch(/older Excel file/);
    expect(fileErrorText(ar, xls)).toMatch(/بصيغة قديمة/);
    expect(fileErrorText(ar, new Error('Corrupted zip'))).toBe('تعذّرت قراءة الملف. (Corrupted zip)');
    expect(keyErrorText(ar, new WrongPassphraseError())).toBe(ar.reidentify.keyErrors.wrongPassphrase);
    expect(keyErrorText(en, new InvalidKeyFileError('notJson', 'x'))).toBe(en.reidentify.keyErrors.notJson);
    expect(keyErrorText(en, 'something else')).toBe(en.reidentify.keyErrors.unreadable);
  });
});

describe('initial language', () => {
  afterEach(() => vi.unstubAllGlobals());

  const storage = (saved: string | null) => ({ getItem: () => saved, setItem: () => {} });

  it('uses the saved choice first', () => {
    vi.stubGlobal('localStorage', storage('ar'));
    vi.stubGlobal('navigator', { languages: ['en-US'] });
    expect(initialLanguage()).toBe('ar');
  });

  it('otherwise follows the browser, then falls back to English', () => {
    vi.stubGlobal('localStorage', storage(null));
    vi.stubGlobal('navigator', { languages: ['fr-FR', 'ar-AE', 'en'] });
    expect(initialLanguage()).toBe('ar');
    vi.stubGlobal('navigator', { languages: ['fr-FR'] });
    expect(initialLanguage()).toBe('en');
  });

  it('copes with storage being blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    vi.stubGlobal('navigator', { languages: ['ar'] });
    expect(initialLanguage()).toBe('ar');
  });
});

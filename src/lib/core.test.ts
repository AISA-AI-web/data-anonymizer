import { describe, expect, it } from 'vitest';
import { anonymize, AMBIGUOUS_NAME, validatePlans } from './anonymize';
import { extractYear } from './cells';
import { categoryFromHeading, categoryFromValues, suggestAll } from './detect';
import {
  guessHeaderRow,
  readSpreadsheet,
  sheetToTable,
  sniffFormat,
  tableToDelimited,
  tablesToXlsx,
  UnsupportedFileError,
} from './fileio';
import { parseKeyFile, PassphraseRequiredError, serializeKey, WrongPassphraseError } from './keyfile';
import { reidentifyFile, reidentifyText } from './reidentify';
import { combinationRisk, findLeftovers } from './risk';
import { SAMPLE_CSV, SAMPLE_FILE_NAME } from './sample';
import type { ColumnPlan, Table } from './types';

const encode = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

const roster: Table = {
  headers: ['Student Name', 'ESIS Number', 'Parent Email', 'Date of Birth', 'Gender', 'Grade', 'Math Score', 'Teacher Comments'],
  rows: [
    ['Ahmed Al Mansouri', '000123', 'ahmed.parent@example.com', '2012-03-14', 'M', '6A', 81, 'Ahmed has improved a lot.'],
    ['Sara Khan', '000124', 'khan.family@example.com', '2012-07-01', 'F', '6A', 92, 'Sara Khan leads her group. Call 050 123 4567.'],
    ['Lina Haddad', '000125', 'lina.h@example.com', '2011-11-30', 'F', '6B', 74, 'Needs support with fractions.'],
    ['Ahmed Saleh', '000126', 'saleh@example.com', '2012-01-09', 'M', '6B', 66, 'Ahmed is often late.'],
  ],
};

function planFromSuggestions(table: Table): ColumnPlan[] {
  return suggestAll(table).map((s, index) => ({ index, header: table.headers[index], action: s.action, prefix: s.prefix }));
}

describe('column detection', () => {
  it.each([
    ['Student Name', 'name'],
    ['First_Name', 'name'],
    ['اسم الطالب', 'name'],
    ['Student', 'name'],
    ['School Name', null],
    ['Parent Email', 'email'],
    ['Mother Mobile', 'phone'],
    ['Emirates ID', 'nationalId'],
    ['Passport No.', 'nationalId'],
    ['ESIS Number', 'studentId'],
    ['Student ID', 'studentId'],
    ['DOB', 'dob'],
    ['Country of Birth', 'nationality'],
    ['Nationality', 'nationality'],
    ['Medical Conditions', 'health'],
    ['SEN Status', 'sen'],
    ['IEP', 'sen'],
    ['Religion', 'religion'],
    ['Counselling notes', 'safeguarding'],
    ['Teacher Comments', 'freeText'],
    ['Homeroom Teacher', 'staffName'],
    ['Behaviour Points', 'behaviour'],
    ['Gender', 'gender'],
    ['Grade', 'classGroup'],
    ['Math Score', 'performance'],
    ['Attendance %', 'performance'],
    ['Home Address', 'address'],
  ])('%s → %s', (heading, expected) => {
    expect(categoryFromHeading(heading)).toBe(expected);
  });

  it('detects emails, Emirates IDs and names from values', () => {
    expect(categoryFromValues(['a@b.com', 'c@d.org', 'x'])).toBe('email');
    expect(categoryFromValues(['784-2012-1234567-1', '784201298765432'])).toBe('nationalId');
    expect(categoryFromValues(['Ahmed Ali', 'Sara Khan', 'Lina Haddad', 'Omar Farooq', 'Maya Noor'])).toBe('name');
    expect(categoryFromValues(['81', '92', '74'])).toBeNull();
  });

  it('suggests sensible actions for a typical roster', () => {
    const actions = planFromSuggestions(roster).map((p) => p.action);
    expect(actions).toEqual(['pseudonymize', 'pseudonymize', 'remove', 'year', 'keep', 'keep', 'keep', 'keep']);
  });
});

describe('example data', () => {
  it('gets the expected suggestions for the made-up class list', async () => {
    const loaded = await readSpreadsheet(SAMPLE_FILE_NAME, encode(SAMPLE_CSV));
    const table = sheetToTable(loaded.sheets[0], guessHeaderRow(loaded.sheets[0].grid));
    const actions = Object.fromEntries(suggestAll(table).map((s, i) => [table.headers[i], s.action]));
    expect(actions).toEqual({
      'Student Name': 'pseudonymize',
      'ESIS Number': 'pseudonymize',
      'Date of Birth': 'year',
      Gender: 'keep',
      Nationality: 'remove',
      Grade: 'keep',
      Section: 'keep',
      'Parent Email': 'remove',
      'Parent Mobile': 'remove',
      'Emirates ID': 'remove',
      'Medical Notes': 'remove',
      'SEN Status': 'remove',
      'Reading Level': 'keep',
      'Math Score (%)': 'keep',
      'Attendance (%)': 'keep',
      'Teacher Comments': 'keep',
    });
  });
});

describe('anonymize', () => {
  const categories = suggestAll(roster).map((s) => s.category);
  const result = anonymize(roster, planFromSuggestions(roster), {
    sourceFile: 'roster.csv',
    scrubMentions: true,
    redactPatterns: true,
    categories,
  });

  it('removes, pseudonymizes and generalizes columns', () => {
    expect(result.table.headers).toEqual([
      'Student Name',
      'ESIS Number',
      'Date of Birth (year)',
      'Gender',
      'Grade',
      'Math Score',
      'Teacher Comments',
    ]);
    const [name, id, year] = result.table.rows[0];
    expect(name).toMatch(/^STU-\d{3}$/);
    expect(id).toMatch(/^SID-\d{3}$/);
    expect(year).toBe(2012);
    expect(result.key.tokens[name as string]).toBe('Ahmed Al Mansouri');
    expect(result.key.tokens[id as string]).toBe('000123');
  });

  it('never leaves the original identifiers in the output', () => {
    const csv = tableToDelimited(result.table);
    for (const original of ['Ahmed Al Mansouri', 'Sara Khan', 'Lina Haddad', '000123', 'example.com', '050 123 4567']) {
      expect(csv).not.toContain(original);
    }
  });

  it('replaces names inside comments, using [NAME] when a first name is shared', () => {
    const comments = result.table.rows.map((row) => row[6] as string);
    // Two students are called Ahmed, so a bare "Ahmed" cannot be linked to one of them.
    expect(comments[0]).toBe(`${AMBIGUOUS_NAME} has improved a lot.`);
    expect(comments[1]).toBe(`${result.table.rows[1][0]} leads her group. Call [PHONE].`);
    expect(result.stats.redactedPatterns).toBe(1);
  });

  it('uses the same code for repeated values', () => {
    const table: Table = { headers: ['Name'], rows: [['Omar'], ['omar '], ['Huda']] };
    const out = anonymize(table, [{ index: 0, header: 'Name', action: 'pseudonymize', prefix: 'STU' }], {
      sourceFile: 'x.csv',
      scrubMentions: false,
      redactPatterns: false,
    });
    expect(out.table.rows[0][0]).toBe(out.table.rows[1][0]);
    expect(out.table.rows[0][0]).not.toBe(out.table.rows[2][0]);
    expect(Object.keys(out.key.tokens)).toHaveLength(2);
  });

  it('rejects duplicate or invalid prefixes', () => {
    expect(
      validatePlans([
        { index: 0, header: 'A', action: 'pseudonymize', prefix: 'STU' },
        { index: 1, header: 'B', action: 'pseudonymize', prefix: 'STU' },
        { index: 2, header: 'C', action: 'pseudonymize', prefix: '1x' },
      ]),
    ).toHaveLength(2);
  });
});

describe('re-identify', () => {
  const key = {
    app: 'aisa-data-anonymizer' as const,
    version: 1 as const,
    createdAt: '',
    sourceFile: 'roster.csv',
    columns: [{ header: 'Student Name', prefix: 'STU', count: 3 }],
    tokens: { 'STU-001': 'Ahmed Al Mansouri', 'STU-002': 'Sara Khan', 'STU-010': 'Lina Haddad' },
  };

  it('restores codes, including small changes made by AI tools', () => {
    const { text, stats } = reidentifyText(
      'STU-001 is on track. stu_002 needs help; STU 010 and STU010 too. **STU-002** again.',
      key,
    );
    expect(text).toBe(
      'Ahmed Al Mansouri is on track. Sara Khan needs help; Lina Haddad and Lina Haddad too. **Sara Khan** again.',
    );
    expect(stats.replaced).toBe(5);
    expect(stats.restored.size).toBe(3);
  });

  it('leaves ordinary text alone and reports unknown codes', () => {
    const { text, stats } = reidentifyText('Stu 12 is in Grade 9. STU-999 was invented. STUDENT-001 too.', key);
    expect(text).toBe('Stu 12 is in Grade 9. STU-999 was invented. STUDENT-001 too.');
    expect([...stats.unknown]).toEqual(['STU-999']);
  });

  it('re-identifies a CSV returned by an AI tool', async () => {
    const csv = 'Student,Risk,Recommendation\r\nSTU-001,High,Small-group support\r\nSTU-002,Low,Extension work\r\n';
    const out = await reidentifyFile('ai-results.csv', encode(csv), key);
    expect(out.fileName).toBe('ai-results-reidentified.csv');
    expect(out.data).toContain('Ahmed Al Mansouri,High,Small-group support');
    expect(out.stats.replaced).toBe(2);
  });

  it('keeps JSON valid even when names contain quotes', async () => {
    const quoted = { ...key, tokens: { 'STU-001': 'Sara "Sasa" Khan' } };
    const out = await reidentifyFile('r.json', encode('{"student":"STU-001","note":"STU-001 ok"}'), quoted);
    expect(JSON.parse(out.data as string)).toEqual({ student: 'Sara "Sasa" Khan', note: 'Sara "Sasa" Khan ok' });
  });
});

describe('key file', () => {
  const key = {
    app: 'aisa-data-anonymizer' as const,
    version: 1 as const,
    createdAt: '2026-10-15T00:00:00.000Z',
    sourceFile: 'roster.xlsx',
    columns: [{ header: 'Name', prefix: 'STU', count: 1 }],
    tokens: { 'STU-001': 'أحمد المنصوري' },
  };

  it('round-trips without a passphrase', async () => {
    expect(await parseKeyFile(await serializeKey(key))).toEqual(key);
  });

  it('encrypts with a passphrase and rejects a wrong one', async () => {
    const locked = await serializeKey(key, 'correct horse battery staple');
    expect(locked).not.toContain('STU-001');
    expect(locked).not.toContain('المنصوري');
    await expect(parseKeyFile(locked)).rejects.toBeInstanceOf(PassphraseRequiredError);
    await expect(parseKeyFile(locked, 'wrong')).rejects.toBeInstanceOf(WrongPassphraseError);
    expect(await parseKeyFile(locked, 'correct horse battery staple')).toEqual(key);
  });
});

describe('file reading and writing', () => {
  it('keeps leading zeros and Arabic text in CSV files', async () => {
    const csv = '﻿الاسم,ID\r\nأحمد,00042\r\n';
    const loaded = await readSpreadsheet('names.csv', encode(csv));
    const table = sheetToTable(loaded.sheets[0], 0);
    expect(table.headers).toEqual(['الاسم', 'ID']);
    expect(table.rows[0]).toEqual(['أحمد', '00042']);
  });

  it('detects semicolon-separated files', async () => {
    const loaded = await readSpreadsheet('export.csv', encode('Name;Score\nOmar;5\nHuda;7\n'));
    expect(loaded.delimiter).toBe(';');
    expect(sheetToTable(loaded.sheets[0], 0).rows).toEqual([
      ['Omar', '5'],
      ['Huda', '7'],
    ]);
  });

  it('skips title rows above the header', () => {
    const grid = [
      ['Grade 6 Term 1 Report', null, null],
      [null, null, null],
      ['Name', 'Score', 'Class'],
      ['Omar', 5, '6A'],
    ];
    expect(guessHeaderRow(grid)).toBe(2);
  });

  it('writes and reads back an xlsx workbook', async () => {
    const table: Table = {
      headers: ['Name', 'Score', 'Date'],
      rows: [['STU-001', 0.85, new Date(Date.UTC(2026, 8, 1))]],
      numFmts: [undefined, '0%', undefined],
    };
    const buffer = await tablesToXlsx([{ name: 'Anonymized', table }]);
    const loaded = await readSpreadsheet('out.xlsx', buffer);
    expect(loaded.format).toBe('xlsx');
    const back = sheetToTable(loaded.sheets[0], 0);
    expect(back.headers).toEqual(['Name', 'Score', 'Date']);
    expect(back.rows[0][0]).toBe('STU-001');
    expect(back.rows[0][1]).toBe(0.85);
    expect((back.rows[0][2] as Date).toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(back.numFmts?.[1]).toBe('0%');
  });

  it('explains how to handle old .xls files', () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]);
    expect(() => sniffFormat('old.xls', ole)).toThrow(UnsupportedFileError);
  });
});

describe('risk checks', () => {
  it('flags rows that are unique on combined details', () => {
    const risk = combinationRisk(roster, [4, 5]);
    // M/6A, F/6A, F/6B, M/6B are each unique.
    expect(risk?.uniqueRows).toBe(4);
  });

  it('finds contact details left in the output', () => {
    const findings = findLeftovers({ headers: ['Notes'], rows: [['email me at a.b@example.com'], ['ok']] });
    expect(findings).toEqual([{ column: 'Notes', kind: 'email', count: 1, example: 'a.••••••••om' }]);
  });

  it('extracts years from different date formats', () => {
    expect(extractYear('14/03/2012')).toBe(2012);
    expect(extractYear('March 14, 2011')).toBe(2011);
    expect(extractYear(new Date(Date.UTC(2010, 0, 1)))).toBe(2010);
    expect(extractYear('unknown')).toBeNull();
  });
});

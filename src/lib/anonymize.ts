import { extractYear, isEmpty } from './cells';
import { EMAIL_RE, EMIRATES_ID_RE, PHONE_RE } from './detect';
import type { Category, Cell, ColumnPlan, KeyData, Table } from './types';

export interface AnonymizeOptions {
  sourceFile: string;
  /** Replace known names/IDs when they appear inside other kept columns (e.g. comments). */
  scrubMentions: boolean;
  /** Redact email addresses, phone numbers and Emirates ID numbers inside kept columns. */
  redactPatterns: boolean;
  /** Category per column; used to decide which columns hold people's names. */
  categories?: Category[];
}

export interface AnonymizeStats {
  kept: number;
  removed: number;
  pseudonymized: number;
  generalized: number;
  tokens: number;
  scrubbedMentions: number;
  redactedPatterns: number;
  yearFailures: number;
}

export interface AnonymizeResult {
  table: Table;
  key: KeyData;
  stats: AnonymizeStats;
}

export const PREFIX_RE = /^[A-Z][A-Z0-9]{1,7}$/;
export const AMBIGUOUS_NAME = '[NAME]';

const PERSON_CATEGORIES: Category[] = ['name', 'staffName', 'parentName'];
// Name particles that are too common to identify anyone on their own.
const NAME_PARTICLES = new Set(['al', 'el', 'bin', 'bint', 'ibn', 'abu', 'abd', 'abdul', 'van', 'von', 'der', 'den', 'de', 'la', 'le', 'da', 'di', 'dos', 'del', 'mc', 'mac']);

export function normaliseValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  const random = new Uint32Array(a.length);
  crypto.getRandomValues(random);
  for (let i = a.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function batchCode(): string {
  // No 0/O/1/I so the code is easy to read back.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(random, (b) => alphabet[b % alphabet.length]).join('');
}

function cellText(cell: Cell): string {
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell);
}

/** Builds a regex that matches any of `terms` as a whole word (Unicode-aware). */
function wholeWordRegex(terms: string[], flags: string): RegExp | null {
  if (terms.length === 0) return null;
  const alternation = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternation})(?![\\p{L}\\p{N}_])`, flags);
}

const REDACTIONS: [RegExp, string][] = [
  [new RegExp(EMAIL_RE.source, 'g'), '[EMAIL]'],
  [new RegExp(EMIRATES_ID_RE.source, 'g'), '[ID NUMBER]'],
  [new RegExp(PHONE_RE.source, 'g'), '[PHONE]'],
];

export function validatePlans(plans: ColumnPlan[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const plan of plans) {
    if (plan.action !== 'pseudonymize') continue;
    if (!PREFIX_RE.test(plan.prefix)) {
      errors.push(`“${plan.header}”: the code prefix must be 2–8 capital letters or digits and start with a letter.`);
    }
    const other = seen.get(plan.prefix);
    if (other) errors.push(`“${plan.header}” and “${other}” use the same code prefix (${plan.prefix}). Each column needs its own.`);
    seen.set(plan.prefix, plan.header);
  }
  return errors;
}

export function anonymize(table: Table, plans: ColumnPlan[], options: AnonymizeOptions): AnonymizeResult {
  const errors = validatePlans(plans);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  const stats: AnonymizeStats = {
    kept: 0,
    removed: 0,
    pseudonymized: 0,
    generalized: 0,
    tokens: 0,
    scrubbedMentions: 0,
    redactedPatterns: 0,
    yearFailures: 0,
  };
  const key: KeyData = {
    app: 'aisa-data-anonymizer',
    version: 1,
    createdAt: new Date().toISOString(),
    batch: batchCode(),
    sourceFile: options.sourceFile,
    columns: [],
    tokens: {},
  };

  // 1. Give every distinct value in each pseudonymised column a random code.
  const tokenFor = new Map<number, Map<string, string>>();
  const fullValueToToken = new Map<string, string>();
  const partToTokens = new Map<string, Set<string>>();

  for (const plan of plans) {
    if (plan.action !== 'pseudonymize') continue;
    const originals = new Map<string, string>();
    for (const row of table.rows) {
      const cell = row[plan.index];
      if (isEmpty(cell)) continue;
      const text = cellText(cell).replace(/\s+/g, ' ').trim();
      const norm = normaliseValue(text);
      if (!originals.has(norm)) originals.set(norm, text);
    }
    const width = Math.max(3, String(originals.size).length);
    const map = new Map<string, string>();
    // Shuffled so codes do not reveal alphabetical or list order.
    shuffle([...originals.keys()]).forEach((norm, i) => {
      const token = `${plan.prefix}-${String(i + 1).padStart(width, '0')}`;
      const original = originals.get(norm)!;
      map.set(norm, token);
      key.tokens[token] = original;
      // Short numbers (e.g. ID 100) would also match scores and counts in comments.
      const longEnough = /^\d+$/.test(norm) ? norm.length >= 5 : norm.length >= 3;
      if (longEnough) fullValueToToken.set(norm, token);
      if (PERSON_CATEGORIES.includes(options.categories?.[plan.index] ?? 'other')) {
        for (const part of original.split(/[\s-]+/)) {
          const clean = part.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
          if (clean.length < 3 || NAME_PARTICLES.has(clean.toLowerCase())) continue;
          const variants = new Set([clean, clean[0].toUpperCase() + clean.slice(1).toLowerCase()]);
          for (const variant of variants) {
            if (!partToTokens.has(variant)) partToTokens.set(variant, new Set());
            partToTokens.get(variant)!.add(token);
          }
        }
      }
    });
    tokenFor.set(plan.index, map);
    key.columns.push({ header: plan.header, prefix: plan.prefix, count: originals.size });
    stats.tokens += originals.size;
  }

  // 2. Matchers for names/IDs mentioned inside other columns.
  const fullValueRegex = options.scrubMentions ? wholeWordRegex([...fullValueToToken.keys()], 'giu') : null;
  const partRegex = options.scrubMentions ? wholeWordRegex([...partToTokens.keys()], 'gu') : null;

  const scrub = (text: string): string => {
    let out = text;
    if (fullValueRegex) {
      out = out.replace(fullValueRegex, (match) => {
        stats.scrubbedMentions++;
        return fullValueToToken.get(normaliseValue(match)) ?? AMBIGUOUS_NAME;
      });
    }
    if (partRegex) {
      out = out.replace(partRegex, (match) => {
        stats.scrubbedMentions++;
        const tokens = partToTokens.get(match);
        // A first name shared by several students cannot be linked to one of them.
        return tokens && tokens.size === 1 ? [...tokens][0] : AMBIGUOUS_NAME;
      });
    }
    if (options.redactPatterns) {
      for (const [re, replacement] of REDACTIONS) {
        out = out.replace(re, () => {
          stats.redactedPatterns++;
          return replacement;
        });
      }
    }
    return out;
  };

  // 3. Build the output table.
  const outputPlans = plans.filter((plan) => plan.action !== 'remove');
  for (const plan of plans) {
    if (plan.action === 'keep') stats.kept++;
    else if (plan.action === 'remove') stats.removed++;
    else if (plan.action === 'pseudonymize') stats.pseudonymized++;
    else stats.generalized++;
  }

  const headers = outputPlans.map((plan) => (plan.action === 'year' ? `${plan.header} (year)` : plan.header));
  const numFmts = outputPlans.map((plan) => (plan.action === 'keep' ? table.numFmts?.[plan.index] : undefined));
  const rows = table.rows.map((row) =>
    outputPlans.map((plan): Cell => {
      const cell = row[plan.index];
      if (isEmpty(cell)) return null;
      switch (plan.action) {
        case 'pseudonymize':
          return tokenFor.get(plan.index)!.get(normaliseValue(cellText(cell))) ?? null;
        case 'year': {
          const year = extractYear(cell);
          if (year === null) stats.yearFailures++;
          return year;
        }
        default:
          return typeof cell === 'string' ? scrub(cell) : cell;
      }
    }),
  );

  return { table: { headers, rows, numFmts }, key, stats };
}

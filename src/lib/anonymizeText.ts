import { batchCode, shuffle } from './anonymize';
import { EMAIL_RE, EMIRATES_ID_RE, PHONE_RE } from './detect';
import { NAME_PARTICLES } from './names';
import type { KeyData } from './types';

/**
 * Replaces the names chosen on the "Check the names" screen with codes (PERSON-001…), and, if asked,
 * email addresses, phone numbers and Emirates ID numbers with their own codes. Every code goes into the
 * key, so the text (or the AI's answer to it) can be unlocked later on "Re-identify results".
 *
 * One person keeps one code: "Ahmed Al Mansoori", "Ahmed" and "Al Mansoori" all become the same code
 * when no one else in the text is called Ahmed. A first name shared by two people gets a code of its own.
 */

export const PERSON_PREFIX = 'PERSON';
export const MAX_TEXT_LENGTH = 200_000;

const CONTACTS = [
  { prefix: 'EMAIL', header: 'Email addresses', re: EMAIL_RE, norm: (s: string) => s.toLowerCase() },
  { prefix: 'IDNUM', header: 'Emirates ID numbers', re: EMIRATES_ID_RE, norm: (s: string) => s.replace(/\D/g, '') },
  { prefix: 'PHONE', header: 'Phone numbers', re: PHONE_RE, norm: (s: string) => s.replace(/\D/g, '') },
] as const;

export interface TextAnonymizeOptions {
  /** Also replace email addresses, phone numbers and Emirates ID numbers with codes. */
  hideContacts: boolean;
  /** Words or names the user said are not names, even where they look like part of one. */
  ignore?: string[];
}

/** A stretch of the original text that is replaced. */
export interface TextSpan {
  start: number;
  end: number;
  token: string;
  kind: 'person' | 'contact';
  /** The name on the list that this mention comes from (people only). */
  source?: string;
}

export interface TextPerson {
  token: string;
  /** What the code stands for, and what it turns back into. */
  name: string;
  mentions: number;
}

export interface TextAnonymizeResult {
  text: string;
  key: KeyData;
  spans: TextSpan[];
  people: TextPerson[];
  contacts: number;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();
const wordsOf = (name: string) => name.split(/[\s\u00a0-]+/).filter(Boolean);
const isParticle = (w: string) => NAME_PARTICLES.has(w.toLowerCase());
const capitalise = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** Whole words only, in any script: "Sara" must not match inside "Sarah". */
const BEFORE = '(?<![\\p{L}\\p{M}\\p{N}_])';
const AFTER = '(?![\\p{L}\\p{M}\\p{N}_])';

interface Person {
  name: string;
  /** Ways the text may refer to this person, each with the listed name it came from. */
  forms: Map<string, string>;
}

/** Splits the chosen names into people and the shorter forms that refer to each of them. */
function buildPeople(names: string[], ignore: Set<string>): Person[] {
  const listed = new Map<string, string>();
  for (const raw of names) {
    const name = tidy(raw);
    if (name.replace(/[^\p{L}]/gu, '').length < 2) continue;
    if (!listed.has(name.toLowerCase())) listed.set(name.toLowerCase(), name);
  }
  const people: Person[] = [];
  const byName = new Map<string, Person>();
  const add = (name: string): Person => {
    const person = { name, forms: new Map<string, string>() };
    people.push(person);
    byName.set(name.toLowerCase(), person);
    return person;
  };

  // Full names first (two words or more, not counting "Al" or "bin").
  const full = [...listed.values()].filter((n) => wordsOf(n).filter((w) => !isParticle(w)).length >= 2);
  for (const name of full) add(name).forms.set(name, name);

  // Shorter forms of each full name: its first word, and every ending ("Al Mansoori", "Mansoori").
  const shortForms = new Map<string, { form: string; owners: Set<Person> }>();
  for (const person of people) {
    const words = wordsOf(person.name);
    const candidates = [words[0], ...words.slice(1).map((_, i) => words.slice(i + 1).join(' '))];
    for (const form of candidates) {
      const content = wordsOf(form).filter((w) => !isParticle(w));
      if (content.length === 0 || content.join('').length < 3) continue;
      const k = form.toLowerCase();
      if (!shortForms.has(k)) shortForms.set(k, { form, owners: new Set() });
      shortForms.get(k)!.owners.add(person);
    }
  }

  // Single names on the list: part of exactly one full name → that person; otherwise a person of their own.
  for (const name of listed.values()) {
    if (full.includes(name)) continue;
    const owners = shortForms.get(name.toLowerCase())?.owners;
    if (owners && owners.size === 1) [...owners][0].forms.set(name, name);
    else add(name).forms.set(name, name);
  }
  for (const [k, { form, owners }] of shortForms) {
    if (ignore.has(k) || listed.has(k)) continue;
    if (owners.size === 1) {
      const owner = [...owners][0];
      owner.forms.set(form, owner.name);
    } else if (!byName.has(k)) {
      // "Ahmed" when the text has Ahmed Al Mansoori and Ahmed Saleh: it cannot be linked to one of them.
      add(form).forms.set(form, form);
    }
  }
  for (const person of people) for (const form of [...person.forms.keys()]) if (ignore.has(form.toLowerCase())) person.forms.delete(form);
  return people;
}

export function anonymizeText(text: string, names: string[], options: TextAnonymizeOptions): TextAnonymizeResult {
  const ignore = new Set((options.ignore ?? []).map((s) => tidy(s).toLowerCase()));
  const taken: { start: number; end: number }[] = [];
  const isFree = (start: number, end: number) => taken.every((t) => end <= t.start || start >= t.end);
  const found: { start: number; end: number; group: string; value: string; kind: TextSpan['kind']; source?: string }[] = [];

  const collect = (re: RegExp, onMatch: (m: RegExpExecArray) => { group: string; value: string; source?: string; kind: TextSpan['kind'] } | null) => {
    for (const m of text.matchAll(re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (!m[0] || !isFree(start, end)) continue;
      const hit = onMatch(m as RegExpExecArray);
      if (!hit) continue;
      taken.push({ start, end });
      found.push({ start, end, ...hit });
    }
  };

  // 1. Contact details (first, so a name inside an email address goes with the address).
  if (options.hideContacts) {
    for (const c of CONTACTS) {
      collect(new RegExp(c.re.source, 'g'), (m) => {
        if (c.prefix === 'PHONE' && m[0].replace(/\D/g, '').length < 9) return null;
        return { group: c.prefix, value: c.norm(m[0]), kind: 'contact' };
      });
    }
  }

  // 2. People: longer forms before shorter ones, so "Ahmed Al Mansoori" is one mention, not three.
  const people = buildPeople(names, ignore);
  const forms: { form: string; person: Person; source: string }[] = [];
  for (const person of people) for (const [form, source] of person.forms) forms.push({ form, person, source });
  forms.sort((a, b) => b.form.length - a.form.length);

  const lookup = new Map<string, { person: Person; source: string }>();
  const multi: string[] = [];
  const single: string[] = [];
  for (const { form, person, source } of forms) {
    const words = wordsOf(form);
    if (words.length > 1) {
      const k = words.join(' ').toLowerCase();
      if (lookup.has(k)) continue;
      lookup.set(k, { person, source });
      multi.push(words.map(escapeRegExp).join('[\\s\\u00a0-]+'));
    } else {
      // One word: as written, Capitalised or in CAPITALS – not "grace" or "will" in lower case.
      for (const variant of new Set([form, capitalise(form), form.toUpperCase()])) {
        if (lookup.has('1:' + variant)) continue;
        lookup.set('1:' + variant, { person, source });
        single.push(escapeRegExp(variant));
      }
    }
  }
  const personHit = (person: Person, source: string) => ({ group: PERSON_PREFIX, value: person.name.toLowerCase(), source, kind: 'person' as const });
  if (multi.length) {
    collect(new RegExp(`${BEFORE}(?:${multi.join('|')})${AFTER}`, 'giu'), (m) => {
      const hit = lookup.get(wordsOf(m[0]).join(' ').toLowerCase());
      return hit ? personHit(hit.person, hit.source) : null;
    });
  }
  if (single.length) {
    collect(new RegExp(`${BEFORE}(?:${single.join('|')})${AFTER}`, 'gu'), (m) => {
      const hit = lookup.get('1:' + m[0]);
      return hit ? personHit(hit.person, hit.source) : null;
    });
  }

  // 3. Codes, in random order so they say nothing about the order of the text.
  const key: KeyData = {
    app: 'aisa-data-anonymizer',
    version: 1,
    createdAt: new Date().toISOString(),
    batch: batchCode(),
    sourceFile: 'Pasted text',
    columns: [],
    tokens: {},
  };
  const tokenOf = new Map<string, string>();
  const groups = [
    { prefix: PERSON_PREFIX, header: 'People named in the text' },
    ...CONTACTS.map((c) => ({ prefix: c.prefix, header: c.header })),
  ];
  for (const { prefix, header } of groups) {
    const values = new Map<string, string>();
    for (const f of found) {
      if (f.group !== prefix || values.has(f.value)) continue;
      const original =
        f.kind === 'person' ? people.find((p) => p.name.toLowerCase() === f.value)!.name : text.slice(f.start, f.end);
      values.set(f.value, original);
    }
    if (values.size === 0) continue;
    const width = Math.max(3, String(values.size).length);
    shuffle([...values.keys()]).forEach((value, i) => {
      const token = `${prefix}-${String(i + 1).padStart(width, '0')}`;
      tokenOf.set(`${prefix}:${value}`, token);
      key.tokens[token] = values.get(value)!;
    });
    key.columns.push({ header, prefix, count: values.size });
  }

  // 4. The text with every mention replaced.
  found.sort((a, b) => a.start - b.start);
  const spans: TextSpan[] = found.map((f) => ({
    start: f.start,
    end: f.end,
    token: tokenOf.get(`${f.group}:${f.value}`)!,
    kind: f.kind,
    source: f.source,
  }));
  let out = '';
  let at = 0;
  for (const s of spans) {
    out += text.slice(at, s.start) + s.token;
    at = s.end;
  }
  out += text.slice(at);

  const mentions = new Map<string, number>();
  for (const s of spans) mentions.set(s.token, (mentions.get(s.token) ?? 0) + 1);
  const peopleOut = Object.entries(key.tokens)
    .filter(([token]) => token.startsWith(PERSON_PREFIX + '-'))
    .map(([token, name]) => ({ token, name, mentions: mentions.get(token) ?? 0 }))
    .sort((a, b) => a.token.localeCompare(b.token));

  return {
    text: out,
    key,
    spans,
    people: peopleOut,
    contacts: spans.filter((s) => s.kind === 'contact').length,
  };
}

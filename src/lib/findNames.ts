import nlp from 'compromise';
import { CUE_WORDS, FIRST_NAMES, HONORIFICS, LEADING_NON_NAMES, NAME_PARTICLES, NOT_NAMES } from './names';

/**
 * Finds people's names in free text, in the browser.
 *
 * The grammar comes from compromise (an open-source English language model that runs in JavaScript:
 * a part-of-speech tagger with a lexicon of about 24,000 words, first names and surnames). It reads each
 * sentence and tags the words, so it can tell "Grace" the student from "grace" the word, and "Will" the
 * question from "Will" the boy. On top of it come rules for writing in a school in the UAE: titles
 * ("Ms Khan"), family and class words ("my son Hamad"), a list of first names the model does not
 * know, name particles ("Fatima bint Rashid", "Al-Hashimi") and words that are never names (subjects,
 * places in the UAE, tools).
 *
 * Nothing is sent anywhere: the model is part of the app.
 */

export type NameReason = 'title' | 'context' | 'language' | 'known' | 'capital';

export interface FoundName {
  /** The name as written in the text, e.g. "Aisha Al-Hashimi". */
  text: string;
  /** Why it was taken for a name (the strongest reason found). */
  reason: NameReason;
  /** False when the only evidence is a capital letter in the middle of a sentence: worth a look. */
  sure: boolean;
}

const REASON_ORDER: NameReason[] = ['title', 'context', 'language', 'known', 'capital'];

/** Tags the model gives a word that is a name (rather than an ordinary word that happens to be one). */
const NAME_TAGS = ['Person', 'FirstName', 'LastName', 'MaleName', 'FemaleName', 'Honorific'];
const NOT_PERSON_TAGS = ['Pronoun', 'Date', 'Month', 'WeekDay', 'Holiday', 'Place', 'Country', 'City', 'Region', 'Acronym', 'Url', 'Email', 'Value'];

interface Word {
  clean: string;
  lower: string;
  start: number;
  end: number;
  tags: Set<string>;
  sentence: number;
  sentenceStart: boolean;
  lineStart: boolean;
  /** Text between this word and the next one. */
  after: string;
}

const LETTERS_RE = /[\p{L}\p{M}][\p{L}\p{M}'’]*/u;

let lexicon: Record<string, string | string[]> | null = null;
function lexiconTags(lower: string): string[] {
  lexicon ??= (nlp.model() as { one: { lexicon: Record<string, string | string[]> } }).one.lexicon;
  const entry = lexicon[lower];
  return entry === undefined ? [] : Array.isArray(entry) ? entry : [entry];
}

/** An ordinary English word the model knows that is not a name ("notes", "will", "summer"). */
function isCommonWord(lower: string): boolean {
  const tags = lexiconTags(lower);
  return tags.length > 0 && !tags.some((t) => NAME_TAGS.includes(t));
}

function toWords(text: string): Word[] {
  const doc = nlp(text);
  const sentences = doc.json({ offset: true, terms: { offset: true } }) as {
    terms: { text: string; pre: string; tags: string[]; offset: { start: number; length: number } }[];
  }[];
  const words: Word[] = [];
  sentences.forEach((sentence, s) => {
    sentence.terms.forEach((term, i) => {
      const raw = text.slice(term.offset.start, term.offset.start + term.offset.length);
      const m = raw.match(LETTERS_RE);
      if (!m || m.index === undefined) return;
      const clean = m[0].replace(/['’]s$/u, '').replace(/['’]$/u, '');
      if (!clean) return;
      const start = term.offset.start + m.index;
      const prev = words[words.length - 1];
      const before = prev ? text.slice(prev.end, start) : '\n';
      if (prev) prev.after = before;
      words.push({
        clean,
        lower: clean.toLowerCase(),
        start,
        end: start + clean.length,
        tags: new Set(term.tags),
        sentence: s,
        // A heading, a bullet, a quotation or a label ("Notes: …") starts a new sentence too.
        sentenceStart: i === 0 || /[\n:;"“(•*]/.test(before) || /[.!?]\s/.test(before),
        lineStart: !prev || before.includes('\n'),
        after: '',
      });
    });
  });
  if (words.length) words[words.length - 1].after = text.slice(words[words.length - 1].end);
  return words;
}

const isCapitalised = (w: Word) => /^\p{Lu}/u.test(w.clean) && /\p{Ll}/u.test(w.clean);
const isAllCaps = (w: Word) => w.clean.length > 1 && w.clean === w.clean.toUpperCase() && /\p{Lu}/u.test(w.clean);
const isStop = (w: Word) => NOT_NAMES.has(w.lower) || HONORIFICS.has(w.lower);
const isParticle = (w: Word) => NAME_PARTICLES.has(w.lower);
const hasAny = (w: Word, tags: string[]) => tags.some((t) => w.tags.has(t));
/** Only a space (or a hyphen) between two words: they can belong to one name. */
const joins = (w: Word) => /^(?:[ \u00a0]{1,2}|-)$/.test(w.after);

/** The reason a single word looks like a name, before looking at its neighbours' names. */
function wordReason(words: Word[], i: number): NameReason | null {
  const w = words[i];
  const capitalised = isCapitalised(w) || (isAllCaps(w) && FIRST_NAMES.has(w.lower));
  if (!capitalised || isStop(w) || hasAny(w, NOT_PERSON_TAGS)) return null;
  const prev = words[i - 1];
  const prevSameSentence = prev && prev.sentence === w.sentence && !/[\n.!?]/.test(prev.after);
  if (prev && HONORIFICS.has(prev.lower.replace(/\.$/, '')) && /^\.?[ \u00a0]{1,2}$/.test(prev.after)) return 'title';
  // The cue is in lower case ("my son Hamad") or opens the sentence ("Dear Reem"), unlike "the Student Council".
  const cue = prevSameSentence && CUE_WORDS.has(prev.lower) && (prev.sentenceStart || !isCapitalised(prev));
  if (cue && /^[ \u00a0,]{1,3}$/.test(prev.after)) return 'context';
  if (w.tags.has('Person') && !w.tags.has('Honorific')) {
    // At the start of a question, "Will" or "May" is a verb, not a name.
    if (w.sentenceStart && LEADING_NON_NAMES.has(w.lower)) return null;
    return 'language';
  }
  if (FIRST_NAMES.has(w.lower)) return 'known';
  if (isCommonWord(w.lower)) return null;
  if (!w.sentenceStart && w.tags.has('ProperNoun') && !w.tags.has('Organization')) return 'capital';
  // A label at the start of a line: "Hamdan: needs help with fractions".
  if (w.lineStart && /^\s*[:–-]/.test(w.after) && !hasAny(w, ['Verb', 'Adjective', 'Plural'])) return 'capital';
  return null;
}

/** Could this capitalised word be the rest of a name that has already started ("Kofi Mensah")? */
function canContinue(w: Word): boolean {
  return isCapitalised(w) && !isStop(w) && !hasAny(w, NOT_PERSON_TAGS) && !isCommonWord(w.lower);
}

export function findNames(text: string): FoundName[] {
  if (!text.trim()) return [];
  const words = toWords(text);
  const reasons = words.map((_, i) => wordReason(words, i));

  // "Hamdan and Reem": a capitalised word joined by "and" / "or" to a name is a name too.
  for (let i = 0; i < words.length; i++) {
    if (reasons[i] || !canContinue(words[i])) continue;
    const next = words[i + 1];
    const prev = words[i - 1];
    const joinedForward = next && ['and', 'or', '&'].includes(next.lower) && reasons[i + 2] && reasons[i + 2] !== 'capital';
    const joinedBack = prev && ['and', 'or', '&'].includes(prev.lower) && reasons[i - 2] && reasons[i - 2] !== 'capital';
    const listed = /^,\s$/.test(words[i].after) && reasons[i + 1] && reasons[i + 1] !== 'capital';
    if (joinedForward || joinedBack || listed) reasons[i] = 'context';
  }

  const found = new Map<string, FoundName>();
  for (let i = 0; i < words.length; i++) {
    if (!reasons[i]) continue;
    let first = i;
    // "al-Mansoori", "bin Rashid": take a particle just before the name.
    if (i > 0 && isParticle(words[i - 1]) && joins(words[i - 1]) && words[i - 1].sentence === words[i].sentence) first = i - 1;
    let last = i;
    while (last + 1 < words.length && joins(words[last])) {
      const next = words[last + 1];
      if (reasons[last + 1] || canContinue(next)) {
        last++;
      } else if (isParticle(next) && joins(next) && words[last + 2] && (reasons[last + 2] || canContinue(words[last + 2]))) {
        last += 2;
      } else {
        break;
      }
    }
    const span = words.slice(first, last + 1);
    i = last;
    // A span that is only "Al" or "bin" is not a name.
    if (span.every((w) => isParticle(w))) continue;
    const spanReasons = span.map((_, k) => reasons[first + k]).filter((r): r is NameReason => !!r);
    const reason = REASON_ORDER.find((r) => spanReasons.includes(r)) ?? 'capital';
    const name = text.slice(span[0].start, span[span.length - 1].end).replace(/\s+/g, ' ');
    const key = name.toLowerCase();
    const existing = found.get(key);
    if (!existing || REASON_ORDER.indexOf(reason) < REASON_ORDER.indexOf(existing.reason)) {
      found.set(key, { text: existing?.text ?? name, reason, sure: reason !== 'capital' || !!existing?.sure });
    }
  }

  // A single word that is part of a longer name found elsewhere is covered by it ("Ahmed" in "Ahmed Saleh"):
  // the anonymizer hides the parts of every full name too.
  const all = [...found.values()];
  const isMulti = (n: FoundName) => /[\s-]/.test(n.text);
  const parts = new Set(all.filter(isMulti).flatMap((n) => n.text.toLowerCase().split(/[\s-]+/)));
  return all
    .filter((n) => isMulti(n) || !parts.has(n.text.toLowerCase()))
    .sort((a, b) => Number(b.sure) - Number(a.sure) || a.text.localeCompare(b.text));
}

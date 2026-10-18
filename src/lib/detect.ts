import { cellToString, isEmpty, looksLikeDate } from './cells';
import type { Action, Category, Risk, Table } from './types';

export interface Suggestion {
  category: Category;
  risk: Risk;
  action: Action;
  prefix: string;
  /** How the suggestion was made: from the column heading or from the values. */
  basis: 'heading' | 'values' | 'none';
  /** Whether "year only" makes sense for this column. */
  dateLike: boolean;
  /** The column has no values. */
  empty: boolean;
  /** "Year only" was the usual advice, but the values are not dates, so removal is suggested instead. */
  notDates: boolean;
}

/** The label and plain-language reason for each category are in the translations (src/i18n). */
interface CategoryInfo {
  risk: Risk;
  action: Action;
  prefix: string;
}

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  name: { risk: 'high', action: 'pseudonymize', prefix: 'STU' },
  parentName: { risk: 'high', action: 'remove', prefix: 'PAR' },
  staffName: { risk: 'medium', action: 'pseudonymize', prefix: 'TCH' },
  studentId: { risk: 'high', action: 'pseudonymize', prefix: 'SID' },
  nationalId: { risk: 'high', action: 'remove', prefix: 'GID' },
  email: { risk: 'high', action: 'remove', prefix: 'EML' },
  phone: { risk: 'high', action: 'remove', prefix: 'TEL' },
  address: { risk: 'high', action: 'remove', prefix: 'ADR' },
  dob: { risk: 'high', action: 'year', prefix: 'DOB' },
  health: { risk: 'high', action: 'remove', prefix: 'MED' },
  sen: { risk: 'high', action: 'remove', prefix: 'SEN' },
  religion: { risk: 'high', action: 'remove', prefix: 'REL' },
  ethnicity: { risk: 'high', action: 'remove', prefix: 'ETH' },
  nationality: { risk: 'medium', action: 'remove', prefix: 'NAT' },
  safeguarding: { risk: 'high', action: 'remove', prefix: 'SFG' },
  behaviour: { risk: 'high', action: 'remove', prefix: 'BEH' },
  financial: { risk: 'high', action: 'remove', prefix: 'FIN' },
  credentials: { risk: 'high', action: 'remove', prefix: 'USR' },
  photo: { risk: 'high', action: 'remove', prefix: 'IMG' },
  freeText: { risk: 'medium', action: 'keep', prefix: 'TXT' },
  gender: { risk: 'medium', action: 'keep', prefix: 'GEN' },
  age: { risk: 'low', action: 'keep', prefix: 'AGE' },
  classGroup: { risk: 'low', action: 'keep', prefix: 'CLS' },
  performance: { risk: 'low', action: 'keep', prefix: 'DAT' },
  date: { risk: 'low', action: 'keep', prefix: 'DTE' },
  uniqueCode: { risk: 'high', action: 'pseudonymize', prefix: 'UID' },
  other: { risk: 'low', action: 'keep', prefix: 'COL' },
};

/**
 * Heading rules, checked in order. Headings are normalised to lower case with
 * underscores/dashes turned into spaces. Arabic keywords cover common bilingual exports.
 */
const HEADING_RULES: [Category, RegExp][] = [
  ['credentials', /\b(password|passcode|pwd|pin|username|user ?name|login|log in|user ?id)\b|كلمة المرور|اسم المستخدم/],
  [
    'nationalId',
    /emirates ?id|\beid\b|national ?id|id ?card|identity|passport|\bvisa\b|unified ?(no|number)|\buid\b|residen(cy|ce) ?(no|number|permit)|الهوية|جواز|الإقامة|التأشيرة|الرقم الموحد/,
  ],
  ['email', /e ?mail|البريد/],
  ['phone', /phone|mobile|\bcell\b|telephone|\btel\b|whats ?app|contact ?(no|number)|\bfax\b|هاتف|جوال|موبايل/],
  [
    'safeguarding',
    /safeguard|child protection|welfare|counsel|abuse|self ?harm|social work|well ?being|pastoral|حماية الطفل|الإرشاد|الرفاه/,
  ],
  [
    'health',
    /medical|health|allerg|medication|medicine|diagnos|\bcondition|illness|disease|asthma|diabet|epilep|blood ?(type|group)|vaccin|immuni[sz]|injur|hospital|doctor|\bnurse|clinic|mental|psycholog|therap|الصحة|طبي|الحساسية|الأدوية|التشخيص/,
  ],
  [
    'sen',
    /\bsend?\b|special (educational )?needs?|\biep\b|\bilp\b|\bisp\b|\bbsp\b|\balp\b|learning (support|plan|needs?|difficult)|additional (learning )?needs|disab|determination|dyslex|adhd|autis|\basd\b|accommodation|access arrangement|inclusion|gifted|talented|\bg ?(and|&) ?t\b|أصحاب الهمم|احتياجات/,
  ],
  ['religion', /religio|\bfaith\b|الديانة|الدين/],
  ['ethnicity', /ethnic|\brace\b|\btribe|العرق|القبيلة/],
  ['nationality', /nationalit|citizenship|country of (birth|origin)|place of birth|الجنسية|مكان الميلاد/],
  ['dob', /birth|\bdob\b|\bd o b\b|\bborn\b|الميلاد/],
  [
    'address',
    /address|street|district|building|\bvilla\b|apartment|\bflat (no|number)|po ?box|p o box|post ?code|\bzip\b|\bcity\b|home (area|location)|area of residence|\bgps\b|latitude|longitude|العنوان|الشارع|صندوق البريد/,
  ],
  [
    'parentName',
    /\b(parent|guardian|mother|father|mum|mom|dad|family|sibling|emergency contact)|ولي الأمر|الأم|الأب|الأسرة/,
  ],
  ['freeText', /comment|\bnotes?\b|remark|observation|feedback|description|\breason|narrative|reflection|ملاحظات|تعليق/],
  ['staffName', /teacher|\bstaff|tutor|advis[eo]r|instructor|\bcoach|المعلم|المدرس/],
  [
    'studentId',
    /^(student|pupil|learner)? ?(id|no|number|code|ref|reference|#)$|^id\b|\besis\b|admission|enrol?ment (no|number|id)|roll ?(no|number)|\bupn\b|رقم الطالب|الرقم الأكاديمي|رقم القيد/,
  ],
  ['financial', /\bfees?\b|payment|invoice|balance|\bbank|\biban\b|account (no|number)|salary|income|scholarship|bursary|الرسوم|الحساب/],
  ['photo', /photo|picture|image|selfie|avatar|الصورة/],
  [
    'behaviour',
    /behaviou?r|disciplin|incident|sanction|detention|suspension|exclusion|misconduct|warning|referral|bullying|السلوك|المخالفات/,
  ],
  ['gender', /gender|\bsex\b|الجنس|النوع/],
  ['age', /^age\b|\bage$|العمر|السن/],
];

const NOT_A_PERSON_NAME =
  /(school|class|course|subject|file|section|group|house|team|club|test|assessment|exam|unit|module|program|programme|company|campus|activity|event|project|book|task|assignment|skill|standard|outcome|strand|domain|category|sheet)\s*name/;

const PERSON_NAME_HEADING = /\bname\b|names|surname|forename|الاسم|اسم/;
const PERSON_HEADINGS = new Set(['student', 'students', 'pupil', 'learner', 'child', 'الطالب', 'الطالبة', 'الطلاب']);

const LATE_RULES: [Category, RegExp][] = [
  [
    'classGroup',
    /year group|grade level|\bgrade\b|\byear\b|\bclass|section|homeroom|\bform\b|\bhouse\b|cohort|division|\bstream|الصف|الشعبة|الفصل/,
  ],
  [
    'performance',
    /score|\bmarks?\b|result|percent|%|attendance|absen|\blate|assessment|exam|\btest|quiz|\bmap\b|cat ?4|\bgpa\b|level|progress|attainment|reading|math|english|arabic|science|subject|النتيجة|الدرجة|الحضور|الغياب/,
  ],
  ['date', /date|time ?stamp|\bjoined|enrol?led|التاريخ/],
];

export function normaliseHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[_\-.:/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function categoryFromHeading(heading: string): Category | null {
  const h = normaliseHeading(heading);
  if (!h) return null;
  for (const [category, re] of HEADING_RULES) if (re.test(h)) return category;
  if (!NOT_A_PERSON_NAME.test(h) && (PERSON_NAME_HEADING.test(h) || PERSON_HEADINGS.has(h))) return 'name';
  for (const [category, re] of LATE_RULES) if (re.test(h)) return category;
  return null;
}

export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
export const EMIRATES_ID_RE = /\b784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d\b/;
/** UAE numbers (+971 / 00971 / 05x) and other international numbers written with a leading +. */
export const PHONE_RE = /(?:\+|00)\d[\d\s\-()]{7,16}\d|\b0(?:5\d|[2-9])[\s-]?\d{3}[\s-]?\d{4}\b/;

const PERSON_NAME_VALUE = /^[\p{L}][\p{L}'’.-]*(\s+[\p{L}][\p{L}'’.-]*){1,4}$/u;

function share(values: string[], test: (v: string) => boolean): number {
  if (values.length === 0) return 0;
  return values.filter(test).length / values.length;
}

/** Looks at the values themselves when the heading gives nothing away. */
export function categoryFromValues(values: string[]): Category | null {
  if (values.length === 0) return null;
  if (share(values, (v) => EMAIL_RE.test(v)) >= 0.5) return 'email';
  if (share(values, (v) => EMIRATES_ID_RE.test(v)) >= 0.5) return 'nationalId';
  if (share(values, (v) => PHONE_RE.test(v) && v.replace(/\D/g, '').length >= 9) >= 0.5) return 'phone';
  const avgLength = values.reduce((sum, v) => sum + v.length, 0) / values.length;
  if (avgLength > 40 && share(values, (v) => v.split(/\s+/).length >= 5) >= 0.5) return 'freeText';
  const unique = new Set(values.map((v) => v.toLowerCase())).size / values.length;
  if (values.length >= 5 && unique >= 0.9 && share(values, (v) => PERSON_NAME_VALUE.test(v)) >= 0.8) return 'name';
  if (
    values.length >= 5 &&
    unique === 1 &&
    share(values, (v) => !/\s/.test(v) && /\d/.test(v) && !/^\d{1,3}(\.\d+)?%?$/.test(v)) >= 0.9
  ) {
    return 'uniqueCode';
  }
  return null;
}

export function suggestForColumn(table: Table, index: number): Suggestion {
  const cells = table.rows.map((row) => row[index]).filter((cell) => !isEmpty(cell));
  const values = cells.slice(0, 500).map(cellToString).map((v) => v.trim());
  const dateLike = cells.length > 0 && cells.slice(0, 500).filter(looksLikeDate).length / Math.min(cells.length, 500) >= 0.8;

  let category = categoryFromHeading(table.headers[index]);
  let basis: Suggestion['basis'] = category ? 'heading' : 'none';

  // Value patterns override vague headings: e.g. a "Contact" column full of emails.
  const fromValues = categoryFromValues(values);
  if (fromValues && (!category || ['other', 'performance', 'classGroup', 'date', 'freeText'].includes(category))) {
    const highRiskFromValues = CATEGORY_INFO[fromValues].risk === 'high';
    if (!category || highRiskFromValues) {
      category = fromValues;
      basis = 'values';
    }
  }
  if (!category) {
    category = dateLike ? 'date' : 'other';
  }

  const info = CATEGORY_INFO[category];
  const notDates = info.action === 'year' && !dateLike;
  return {
    category,
    risk: info.risk,
    action: notDates ? 'remove' : info.action,
    prefix: info.prefix,
    basis,
    dateLike,
    empty: cells.length === 0,
    notDates,
  };
}

/** Suggests unique token prefixes, e.g. two name columns become STU and STU2. */
export function suggestAll(table: Table): Suggestion[] {
  const used = new Map<string, number>();
  return table.headers.map((_, i) => {
    const s = suggestForColumn(table, i);
    const n = (used.get(s.prefix) ?? 0) + 1;
    used.set(s.prefix, n);
    return n === 1 ? s : { ...s, prefix: `${s.prefix}${n}` };
  });
}

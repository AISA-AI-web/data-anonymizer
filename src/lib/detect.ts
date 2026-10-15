import { cellToString, isEmpty, looksLikeDate } from './cells';
import type { Action, Category, Risk, Table } from './types';

export interface Suggestion {
  category: Category;
  risk: Risk;
  action: Action;
  prefix: string;
  /** Short label, e.g. "Student name". */
  label: string;
  /** Plain-language reason shown to the user. */
  reason: string;
  /** How the suggestion was made: from the column heading or from the values. */
  basis: 'heading' | 'values' | 'none';
  /** Whether "year only" makes sense for this column. */
  dateLike: boolean;
}

interface CategoryInfo {
  label: string;
  risk: Risk;
  action: Action;
  prefix: string;
  reason: string;
}

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  name: {
    label: 'Person name',
    risk: 'high',
    action: 'pseudonymize',
    prefix: 'STU',
    reason: 'Names directly identify a student. Replace them with codes so the AI can still tell students apart.',
  },
  parentName: {
    label: 'Parent / family detail',
    risk: 'high',
    action: 'remove',
    prefix: 'PAR',
    reason: 'Information about parents or family identifies the student and is rarely needed for analysis.',
  },
  staffName: {
    label: 'Staff name',
    risk: 'medium',
    action: 'pseudonymize',
    prefix: 'TCH',
    reason: 'Staff names are personal data too. Use codes if you need to compare by teacher.',
  },
  studentId: {
    label: 'Student ID / number',
    risk: 'high',
    action: 'pseudonymize',
    prefix: 'SID',
    reason: 'School and eSIS numbers identify a student. Replace them with codes so results can be matched back.',
  },
  nationalId: {
    label: 'Government ID',
    risk: 'high',
    action: 'remove',
    prefix: 'GID',
    reason: 'Emirates ID, passport and visa numbers must never be shared with an AI tool.',
  },
  email: {
    label: 'Email address',
    risk: 'high',
    action: 'remove',
    prefix: 'EML',
    reason: 'Email addresses identify a person directly and are not needed for analysis.',
  },
  phone: {
    label: 'Phone number',
    risk: 'high',
    action: 'remove',
    prefix: 'TEL',
    reason: 'Phone numbers identify a person directly and are not needed for analysis.',
  },
  address: {
    label: 'Address / location',
    risk: 'high',
    action: 'remove',
    prefix: 'ADR',
    reason: 'Home addresses and locations identify a family and are not needed for analysis.',
  },
  dob: {
    label: 'Date of birth',
    risk: 'high',
    action: 'year',
    prefix: 'DOB',
    reason: 'A full date of birth can identify a student, especially with other details. Keep only the year, or remove it.',
  },
  health: {
    label: 'Health / medical',
    risk: 'high',
    action: 'remove',
    prefix: 'MED',
    reason: 'Health information is sensitive personal data. Remove it unless it is essential and the sharing is approved.',
  },
  sen: {
    label: 'Learning needs (SEN / IEP)',
    risk: 'high',
    action: 'remove',
    prefix: 'SEN',
    reason:
      'Learning-support details (SEN, IEP/ILP, disability, Students of Determination) are sensitive. Remove them unless the analysis needs them and the sharing is approved.',
  },
  religion: {
    label: 'Religion',
    risk: 'high',
    action: 'remove',
    prefix: 'REL',
    reason: 'Religious belief is sensitive personal data and should not be shared with an AI tool.',
  },
  ethnicity: {
    label: 'Ethnicity / tribe',
    risk: 'high',
    action: 'remove',
    prefix: 'ETH',
    reason: 'Ethnic origin is sensitive personal data and should not be shared with an AI tool.',
  },
  nationality: {
    label: 'Nationality',
    risk: 'medium',
    action: 'remove',
    prefix: 'NAT',
    reason:
      'Nationality combined with gender and class can single out a student, especially in small groups. Keep it only if the analysis needs it.',
  },
  safeguarding: {
    label: 'Safeguarding / wellbeing',
    risk: 'high',
    action: 'remove',
    prefix: 'SFG',
    reason: 'Child protection, counselling and wellbeing records are highly sensitive. Never share them with an AI tool.',
  },
  behaviour: {
    label: 'Behaviour / incidents',
    risk: 'high',
    action: 'remove',
    prefix: 'BEH',
    reason: 'Behaviour and incident records are sensitive. Remove them unless they are essential and the sharing is approved.',
  },
  financial: {
    label: 'Financial',
    risk: 'high',
    action: 'remove',
    prefix: 'FIN',
    reason: 'Fees, bank and payment details are not needed for learning analysis.',
  },
  credentials: {
    label: 'Login / password',
    risk: 'high',
    action: 'remove',
    prefix: 'USR',
    reason: 'Usernames and passwords must never be shared.',
  },
  photo: {
    label: 'Photo / image',
    risk: 'high',
    action: 'remove',
    prefix: 'IMG',
    reason: 'Photos and photo links identify a student and must not be shared without consent.',
  },
  freeText: {
    label: 'Free text / comments',
    risk: 'medium',
    action: 'keep',
    prefix: 'TXT',
    reason:
      'Comments often mention names or personal details. Check them yourself. The tool will replace names it knows about, but it cannot catch everything.',
  },
  gender: {
    label: 'Gender',
    risk: 'medium',
    action: 'keep',
    prefix: 'GEN',
    reason: 'Usually fine to keep, but combined with other details it can single out a student.',
  },
  age: {
    label: 'Age',
    risk: 'low',
    action: 'keep',
    prefix: 'AGE',
    reason: 'Usually fine to keep. Check it does not single out a student when combined with other columns.',
  },
  classGroup: {
    label: 'Class / grade group',
    risk: 'low',
    action: 'keep',
    prefix: 'CLS',
    reason: 'Usually needed for analysis. Small classes can make other details more identifying.',
  },
  performance: {
    label: 'Learning data',
    risk: 'low',
    action: 'keep',
    prefix: 'DAT',
    reason: 'Scores, attendance and assessment data are usually what you want the AI to analyse.',
  },
  date: {
    label: 'Date',
    risk: 'low',
    action: 'keep',
    prefix: 'DTE',
    reason: 'General dates are usually fine to keep.',
  },
  uniqueCode: {
    label: 'Unique identifier',
    risk: 'high',
    action: 'pseudonymize',
    prefix: 'UID',
    reason: 'Every value in this column is different, so it probably identifies individual people. Replace it with codes or remove it.',
  },
  other: {
    label: 'No issue detected',
    risk: 'low',
    action: 'keep',
    prefix: 'COL',
    reason: 'Nothing obviously personal was detected. Check it yourself; the tool can miss things.',
  },
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
  let action = info.action;
  let reason = info.reason;
  if (action === 'year' && !dateLike) {
    action = 'remove';
    reason = `${reason} The values do not look like dates, so removal is suggested.`;
  }
  if (cells.length === 0) {
    reason = 'This column is empty. ' + reason;
  }
  if (basis === 'values') {
    reason = `Detected from the values in this column. ${reason}`;
  }
  return { category, risk: info.risk, action, prefix: info.prefix, label: info.label, reason, basis, dateLike };
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

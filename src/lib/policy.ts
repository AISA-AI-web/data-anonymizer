/**
 * Guidance text shown in the app.
 *
 * This repository is public, so everything here is written in our own words and only cites
 * publicly available documents. Do not paste text from confidential or draft policies into
 * this file. Link to them instead with VITE_POLICY_LINKS (see README), which points to a copy
 * that only signed-in staff can open.
 */

export interface PolicyLink {
  title: string;
  url: string;
  note?: string;
}

export interface PolicySection {
  ref: string;
  summary: string;
}

/** Step-by-step guide with screenshots, served from public/user-guide.pdf. */
export const USER_GUIDE_URL = './user-guide.pdf';

/** Video tutorial hosted on Google Drive (shared as "anyone with the link can view"). */
export const TUTORIAL_VIDEO = {
  title: 'Safely anonymizing student data for AI analysis',
  embedUrl: 'https://drive.google.com/file/d/1NJ-rQtFkNzYq6U-obphonRq_R2neoWwj/preview',
  viewUrl: 'https://drive.google.com/file/d/1NJ-rQtFkNzYq6U-obphonRq_R2neoWwj/view',
};

export const ADEK_DIGITAL_POLICY: PolicyLink = {
  title: 'ADEK School Digital Policy (v1.1, September 2024)',
  url: 'https://www.adek.gov.ae/-/media/Project/TAMM/ADEK/Policies/School-Policies/Health-safety-and-wellbeing/ADEK_S_Digital-Policy_EN.pdf',
};

export const ADEK_POLICIES_PAGE: PolicyLink = {
  title: 'ADEK school policies (all current policies)',
  url: 'https://adek.gov.ae/Education-System/Education-Policies/School-Policies',
};

export const UAE_PDPL: PolicyLink = {
  title: 'Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL)',
  url: 'https://uaelegislation.gov.ae/en/legislations/1972',
};

/** Summaries (not quotations) of the parts of the public ADEK School Digital Policy that apply here. */
export const DIGITAL_POLICY_SECTIONS: PolicySection[] = [
  {
    ref: 'Definitions: Personal Information',
    summary:
      'Personal information covers anyone who can be identified directly, or indirectly by combining details. That is why this tool checks combinations of columns such as gender, nationality and class.',
  },
  {
    ref: 'Section 4.1 (5)',
    summary:
      'Schools set standards for sharing data about students and the school community, including uploading student data to external applications and learning tools.',
  },
  {
    ref: 'Section 4.1 (6)',
    summary:
      'Schools set standards for the responsible use of digital tools such as artificial intelligence, in line with data privacy requirements.',
  },
  {
    ref: 'Section 5.5',
    summary:
      'External providers and products are checked before use, including how securely they manage data and whether they comply with the UAE data protection law.',
  },
  {
    ref: 'Section 6.1 (6)',
    summary: 'Schools classify school and student data and use controls that prevent data leaks.',
  },
  {
    ref: 'Section 7.1',
    summary:
      'Each school has a data protection policy covering what personal information may be collected, how consent is obtained and withdrawn, and when personal data may be shared with others.',
  },
];

/** Good practice for using AI with student data. Written generally; applies whatever tool you use. */
export const AI_GOOD_PRACTICE: string[] = [
  'Share only what the task needs. If the AI does not need a column, remove it.',
  'Use only AI tools your school has approved for student data. Check whether the tool keeps your uploads or uses them for training, and switch that off where you can.',
  'Never put student data into a personal AI account.',
  'AI output should inform your professional judgement, not replace it. A responsible member of staff must review and sign off any decision that affects a student’s education, rights or wellbeing.',
  'Check AI conclusions for mistakes and bias, for example patterns that unfairly single out a gender, nationality or group of students.',
  'Keep the key file away from the AI and anyone who does not need it, and delete the files when you no longer need them.',
  'If something goes wrong (for example, identifiable data was uploaded by mistake), report it to your school’s data protection or digital wellbeing lead straight away.',
];

export interface ChecklistItem {
  id: string;
  group: 'Data' | 'Tool and approval' | 'Afterwards';
  text: string;
}

export const ANONYMIZE_CHECKLIST: ChecklistItem[] = [
  {
    id: 'identifiers',
    group: 'Data',
    text: 'Direct identifiers are replaced with codes or removed: names, student/eSIS numbers, emails, phone numbers, Emirates ID/passport numbers and addresses.',
  },
  {
    id: 'freetext',
    group: 'Data',
    text: 'I have read the comment and notes columns myself, and they contain no names or details that could identify a student.',
  },
  {
    id: 'sensitive',
    group: 'Data',
    text: 'Sensitive information is removed (health, learning-support/SEN, religion, safeguarding, counselling or behaviour records), unless it is essential and sharing it is approved.',
  },
  {
    id: 'combinations',
    group: 'Data',
    text: 'The remaining columns, taken together, cannot single out a student (for example, the only student of a nationality in a class).',
  },
  {
    id: 'minimum',
    group: 'Data',
    text: 'I am sharing only the columns the AI needs for this task.',
  },
  {
    id: 'approved-tool',
    group: 'Tool and approval',
    text: 'The AI tool is approved by my school for this kind of data, and I have checked whether it keeps or trains on what I upload.',
  },
  {
    id: 'policy',
    group: 'Tool and approval',
    text: 'This use follows my school’s data protection and AI policies and any parental consent that applies.',
  },
  {
    id: 'key',
    group: 'Afterwards',
    text: 'I will keep the key file private and never upload it to an AI tool.',
  },
  {
    id: 'oversight',
    group: 'Afterwards',
    text: 'A person, not the AI, will review the results and make any decisions about students.',
  },
  {
    id: 'retention',
    group: 'Afterwards',
    text: 'I will delete the anonymized file, the AI output and the key when they are no longer needed.',
  },
];

export const REIDENTIFY_REMINDERS: string[] = [
  'The re-identified file contains personal data again. Save it only in school-approved storage, and never upload it back to an AI tool.',
  'Check the AI’s conclusions for errors and bias before acting on them.',
  'AI output informs your judgement; it does not replace it. Decisions about a student’s education, rights or wellbeing need review and sign-off by a responsible member of staff.',
  'Delete the anonymized file, the AI output, the key and this file when you no longer need them.',
];

export const SUGGESTION_DISCLAIMER =
  'Suggestions are made automatically from column names and value patterns. They can be wrong or incomplete. Your professional judgement decides what is shared: read your school’s data protection and AI policies, and if you are unsure, ask your data protection or digital wellbeing lead.';

/** Extra links configured per deployment, e.g. to a staff-only copy of an internal policy. */
export function configuredPolicyLinks(): PolicyLink[] {
  const raw = import.meta.env.VITE_POLICY_LINKS as string | undefined;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is PolicyLink =>
        !!l && typeof l.title === 'string' && typeof l.url === 'string' && /^https:\/\//.test(l.url),
    );
  } catch {
    return [];
  }
}

export function aiPromptSnippet(columns: { header: string; prefix: string }[], removed: string[]): string {
  const codes = columns.map((c) => `${c.prefix}-001 = ${c.header}`).join('; ');
  const lines = [
    'The attached file contains anonymized student data. Real identifiers have been replaced with codes' +
      (codes ? ` (for example ${codes}).` : '.'),
    '',
    'Please follow these rules in your answer:',
    '1. Whenever you refer to a student or row, use their code exactly as written (for example STU-001). Do not change, shorten or renumber the codes.',
    '2. Do not try to work out who the students are.',
    '3. If you return a table, keep the code column in it.',
  ];
  if (removed.length > 0) {
    lines.push('', `Some columns were removed for privacy (${removed.join(', ')}). Do not ask for them.`);
  }
  return lines.join('\n');
}

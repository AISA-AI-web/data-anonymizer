/**
 * English text for the app. Every other language must provide the same messages (see `Messages`).
 *
 * This repository is public, so the guidance here is written in our own words and only cites
 * publicly available documents. Do not paste text from confidential or draft policies.
 */
import type { ReactNode } from 'react';
import type { PlanError } from '../lib/anonymize';
import type { FileErrorCode } from '../lib/fileio';
import type { ChecklistGroup, ChecklistId } from '../lib/policy';
import type { LeftoverFinding } from '../lib/risk';
import type { Action, Category, Risk, SourceFormat } from '../lib/types';

const num = (n: number) => n.toLocaleString('en');
const count = (n: number, one: string, other: string) => `${num(n)} ${n === 1 ? one : other}`;
const quoted = (items: string[]) => items.map((h) => `“${h}”`).join(', ');

const ACTIONS: Record<Action, string> = {
  keep: 'Keep as is',
  pseudonymize: 'Replace with codes (reversible)',
  remove: 'Remove column',
  year: 'Keep year only',
};

const LEFTOVER_KINDS: Record<LeftoverFinding['kind'], [string, string]> = {
  email: ['email', 'emails'],
  phone: ['phone number', 'phone numbers'],
  emiratesId: ['Emirates ID', 'Emirates IDs'],
};

export const en = {
  dir: 'ltr' as 'ltr' | 'rtl',
  formatNumber: num,
  formatDateTime: (value: string) =>
    new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),

  app: {
    title: 'Student Data Anonymizer',
    school: 'American International School in Abu Dhabi',
    tagline: 'Prepare student data for AI safely, then match the AI’s results back to your students.',
    privacy: 'Runs in your browser · nothing is uploaded',
    watchTutorial: 'Watch the tutorial',
    userGuide: 'User guide (PDF)',
    switchLanguage: 'Switch to Arabic',
    sections: 'Sections',
    tabs: { anonymize: '1. Anonymize', reidentify: '2. Re-identify results', guide: 'Help & guidance' },
    footer:
      'This tool supports, and does not replace, your professional judgement and your school’s data protection and AI policies. Suggestions can be wrong; always check the data yourself before sharing it.',
    videoTutorial: 'Video tutorial',
  },

  common: {
    back: 'Back',
    copied: 'Copied',
    progress: 'Progress',
    empty: '(empty)',
    fileUnusable: 'That file could not be used',
    showing: (shown: number, total: number, columns: number) =>
      `Showing ${num(shown)} of ${count(total, 'row', 'rows')} · ${count(columns, 'column', 'columns')}`,
  },

  fileErrors: {
    oldExcel:
      'This is an older Excel file (.xls). Open it in Excel and use File → Save As → Excel Workbook (.xlsx), then upload it again.',
    unsupportedSpreadsheet: 'This spreadsheet format is not supported. Export it as .xlsx or .csv and upload that instead.',
    notSpreadsheet: 'This looks like a Word or PowerPoint file, not a spreadsheet.',
    invalidXlsx: 'This file has an .xlsx name but is not a valid Excel workbook.',
    emptyWorkbook: 'The workbook does not contain any data.',
    emptyFile: 'The file does not contain any data.',
    tooLarge: 'This file is larger than 50 MB. Split it into smaller files first.',
    unreadable: 'The file could not be read.',
  } satisfies Record<FileErrorCode | 'unreadable', string>,

  anonymize: {
    eyebrow: 'Step 1 of the round trip',
    heading: 'Anonymize a spreadsheet',
    lead: 'Replace student names and IDs with codes, remove what the AI does not need, and save a private key so you can put the real names back into the AI’s results later.',
    steps: ['Upload', 'Choose columns', 'Review', 'Checklist & download'],
    formats: {
      csv: 'CSV (comma-separated text)',
      tsv: 'TSV (tab-separated text)',
      xlsx: 'Excel workbook (.xlsx)',
    } satisfies Record<SourceFormat, string>,
    reading: 'Reading file…',
    dropTitle: 'Drop a spreadsheet here, or click to choose one',
    dropHint: 'CSV, TSV or Excel (.xlsx). The file is opened in this browser only and is never uploaded.',
    file: 'File',
    detected: (format: string) => `Detected: ${format}`,
    sheet: 'Sheet',
    sheetOption: (name: string, rows: number) => `${name} (${count(rows, 'row', 'rows')})`,
    headerRow: 'Row with the column headings',
    headerRowOption: (row: number, preview: string) => `Row ${num(row)}: ${preview}`,
    otherSheets: 'Only the selected sheet is anonymized and included in the download. Other sheets are left out.',
    chooseAnother: 'Choose a different file',
    nextColumns: 'Next: choose columns',

    suggestionsTitle: 'Suggestions, not decisions',
    columnSummary: (high: number, check: number, columns: number, rows: number) =>
      `${num(high)} high-risk and ${num(check)} “check” columns found in ${count(columns, 'column', 'columns')} · ${count(rows, 'row', 'rows')}`,
    resetSuggestions: 'Reset to suggestions',
    scrubTitle: 'Also replace names and IDs found inside other columns',
    scrubHelp:
      'For example “Ahmed did well” becomes “STU-004 did well”. If several students share a first name, it becomes [NAME]. It can occasionally replace an ordinary word that is also a name.',
    redactTitle: 'Hide email addresses, phone numbers and Emirates ID numbers found in kept columns',
    redactHelp: 'They become [EMAIL], [PHONE] and [ID NUMBER]. These cannot be restored later.',
    fixFirst: 'Fix these before continuing',
    planError: (e: PlanError) =>
      e.kind === 'invalidPrefix'
        ? `“${e.header}”: the code prefix must be 2–8 capital letters or digits and start with a letter.`
        : `“${e.header}” and “${e.other}” use the same code prefix (${e.prefix}). Each column needs its own.`,
    nextReview: 'Next: review',
  },

  columns: {
    column: 'Column',
    thinks: 'What the tool thinks',
    todo: 'What to do',
    prefix: 'Code prefix',
    prefixFor: (header: string) => `Code prefix for ${header}`,
    actions: ACTIONS,
    risks: { high: 'High risk', medium: 'Check', low: 'Low risk' } satisfies Record<Risk, string>,
    suggested: (action: Action) => `Suggested: ${ACTIONS[action].toLowerCase()}.`,
    reasonEmpty: 'This column is empty.',
    reasonFromValues: 'Detected from the values in this column.',
    reasonNotDates: 'The values do not look like dates, so removal is suggested.',
  },

  categories: {
    name: {
      label: 'Person name',
      reason: 'Names directly identify a student. Replace them with codes so the AI can still tell students apart.',
    },
    parentName: {
      label: 'Parent / family detail',
      reason: 'Information about parents or family identifies the student and is rarely needed for analysis.',
    },
    staffName: {
      label: 'Staff name',
      reason: 'Staff names are personal data too. Use codes if you need to compare by teacher.',
    },
    studentId: {
      label: 'Student ID / number',
      reason: 'School and eSIS numbers identify a student. Replace them with codes so results can be matched back.',
    },
    nationalId: {
      label: 'Government ID',
      reason: 'Emirates ID, passport and visa numbers must never be shared with an AI tool.',
    },
    email: {
      label: 'Email address',
      reason: 'Email addresses identify a person directly and are not needed for analysis.',
    },
    phone: {
      label: 'Phone number',
      reason: 'Phone numbers identify a person directly and are not needed for analysis.',
    },
    address: {
      label: 'Address / location',
      reason: 'Home addresses and locations identify a family and are not needed for analysis.',
    },
    dob: {
      label: 'Date of birth',
      reason:
        'A full date of birth can identify a student, especially with other details. Keep only the year, or remove it.',
    },
    health: {
      label: 'Health / medical',
      reason:
        'Health information is sensitive personal data. Remove it unless it is essential and the sharing is approved.',
    },
    sen: {
      label: 'Learning needs (SEN / IEP)',
      reason:
        'Learning-support details (SEN, IEP/ILP, disability, Students of Determination) are sensitive. Remove them unless the analysis needs them and the sharing is approved.',
    },
    religion: {
      label: 'Religion',
      reason: 'Religious belief is sensitive personal data and should not be shared with an AI tool.',
    },
    ethnicity: {
      label: 'Ethnicity / tribe',
      reason: 'Ethnic origin is sensitive personal data and should not be shared with an AI tool.',
    },
    nationality: {
      label: 'Nationality',
      reason:
        'Nationality combined with gender and class can single out a student, especially in small groups. Keep it only if the analysis needs it.',
    },
    safeguarding: {
      label: 'Safeguarding / wellbeing',
      reason:
        'Child protection, counselling and wellbeing records are highly sensitive. Never share them with an AI tool.',
    },
    behaviour: {
      label: 'Behaviour / incidents',
      reason:
        'Behaviour and incident records are sensitive. Remove them unless they are essential and the sharing is approved.',
    },
    financial: {
      label: 'Financial',
      reason: 'Fees, bank and payment details are not needed for learning analysis.',
    },
    credentials: {
      label: 'Login / password',
      reason: 'Usernames and passwords must never be shared.',
    },
    photo: {
      label: 'Photo / image',
      reason: 'Photos and photo links identify a student and must not be shared without consent.',
    },
    freeText: {
      label: 'Free text / comments',
      reason:
        'Comments often mention names or personal details. Check them yourself. The tool will replace names it knows about, but it cannot catch everything.',
    },
    gender: {
      label: 'Gender',
      reason: 'Usually fine to keep, but combined with other details it can single out a student.',
    },
    age: {
      label: 'Age',
      reason: 'Usually fine to keep. Check it does not single out a student when combined with other columns.',
    },
    classGroup: {
      label: 'Class / grade group',
      reason: 'Usually needed for analysis. Small classes can make other details more identifying.',
    },
    performance: {
      label: 'Learning data',
      reason: 'Scores, attendance and assessment data are usually what you want the AI to analyse.',
    },
    date: {
      label: 'Date',
      reason: 'General dates are usually fine to keep.',
    },
    uniqueCode: {
      label: 'Unique identifier',
      reason:
        'Every value in this column is different, so it probably identifies individual people. Replace it with codes or remove it.',
    },
    other: {
      label: 'No issue detected',
      reason: 'Nothing obviously personal was detected. Check it yourself; the tool can miss things.',
    },
  } satisfies Record<Category, { label: string; reason: string }>,

  review: {
    stats: {
      rows: 'rows',
      pseudonymized: 'columns replaced with codes',
      tokens: 'codes created',
      removed: 'columns removed',
      generalized: 'dates reduced to year',
      hidden: 'names/details hidden in text',
    },
    nothingTitle: 'Nothing has been anonymized',
    nothingText: 'Every column is set to “Keep as is”. Go back and choose what to replace or remove.',
    leftoversTitle: 'Contact details or ID numbers are still in the data',
    leftover: (l: LeftoverFinding) =>
      `“${l.column}”: ${count(l.count, ...LEFTOVER_KINDS[l.kind])} (e.g. ${l.example})`,
    leftoversFix: 'Go back and remove these columns, or turn on “Hide email addresses…”.',
    keptHighRiskTitle: 'You are keeping high-risk columns',
    keptHighRiskText: 'Only keep these if the analysis truly needs them and the sharing is approved.',
    comboTitle: 'Some students could still be singled out',
    combo: (unique: number, total: number, columns: ReactNode, smallGroups: number, threshold: number): ReactNode => (
      <>
        {num(unique)} of {num(total)} rows ({Math.round((unique / total) * 100)}%) are the only row with their
        combination of {columns}
        {smallGroups > unique && `, and ${num(smallGroups)} rows are in groups smaller than ${num(threshold)}`}. Someone
        who knows the class could work out who they are. Consider removing one of these columns or keeping only what the
        analysis needs.
      </>
    ),
    freeTextTitle: 'Read the free-text columns yourself',
    freeText: (headers: string[]) =>
      `${quoted(headers)} may still mention people, places or events that identify a student. The tool only catches names it knows about from this file.`,
    yearFailuresTitle: 'Some dates could not be read',
    yearFailures: (n: number) =>
      `${count(n, 'value', 'values')} in “year only” columns had no recognisable year and ${n === 1 ? 'was' : 'were'} left blank.`,
    previewHeading: 'Preview of what will be shared',
    previewHelp: 'Codes are highlighted. Check the column headings too: they are shared with the AI.',
    backColumns: 'Back to columns',
    nextChecklist: 'Next: checklist',
  },

  checklist: {
    heading: 'Before you share anything, confirm each point',
    help: 'The downloads unlock once every box is ticked. The tool cannot check these for you, so this is where your judgement counts.',
    progress: (done: number, total: number) => `${num(done)} of ${num(total)} confirmed`,
    groups: { data: 'Data', tool: 'Tool and approval', afterwards: 'Afterwards' } satisfies Record<ChecklistGroup, string>,
    items: {
      identifiers:
        'Direct identifiers are replaced with codes or removed: names, student/eSIS numbers, emails, phone numbers, Emirates ID/passport numbers and addresses.',
      freetext:
        'I have read the comment and notes columns myself, and they contain no names or details that could identify a student.',
      sensitive:
        'Sensitive information is removed (health, learning-support/SEN, religion, safeguarding, counselling or behaviour records), unless it is essential and sharing it is approved.',
      combinations:
        'The remaining columns, taken together, cannot single out a student (for example, the only student of a nationality in a class).',
      minimum: 'I am sharing only the columns the AI needs for this task.',
      'approved-tool':
        'The AI tool is approved by my school for this kind of data, and I have checked whether it keeps or trains on what I upload.',
      policy: 'This use follows my school’s data protection and AI policies and any parental consent that applies.',
      key: 'I will keep the key file private and never upload it to an AI tool.',
      oversight: 'A person, not the AI, will review the results and make any decisions about students.',
      retention: 'I will delete the anonymized file, the AI output and the key when they are no longer needed.',
    } satisfies Record<ChecklistId, string>,
  },

  download: {
    keyEyebrow: 'Keep private',
    keyHeading: '1. Save the key file',
    keyText: (never: (text: string) => ReactNode): ReactNode => (
      <>
        The key links each code back to the real student. Without it you cannot put names back into the AI’s results.{' '}
        {never('Never upload it to an AI tool.')} Store it in school-approved storage.
      </>
    ),
    passphrase: 'Passphrase (recommended)',
    passphrasePlaceholder: 'Locks the key file',
    passphraseAgain: 'Type the passphrase again',
    passphraseShort: 'Use at least 8 characters.',
    passphraseMismatch: 'The two passphrases do not match.',
    passphraseWarning: 'If you forget the passphrase, the key cannot be opened. Nobody can recover it.',
    downloadKey: 'Download key file',
    savedAs: (name: string) => `✓ Saved as ${name}`,
    dataEyebrow: 'Share with the AI',
    dataHeading: '2. Download the anonymized file',
    dataText: 'This is the only file to upload to your approved AI tool.',
    format: 'Format',
    formatCsv: 'CSV (works with every AI tool)',
    formatXlsx: 'Excel (.xlsx)',
    dataName: (name: ReactNode, batch: string): ReactNode => (
      <>
        Saved as {name}. The name is neutral on purpose, because file names can identify students too. Batch code{' '}
        {batch} links it to the matching key.
      </>
    ),
    downloadData: 'Download anonymized file',
    keyNotSavedTitle: 'You have not saved the key yet',
    keyNotSavedText: 'Without the key file you will not be able to put the names back after this page is closed.',
    promptHeading: '3. Paste these instructions into the AI with your file',
    promptHelp: 'They tell the AI to keep the codes intact so the results can be matched back.',
    copyPrompt: 'Copy instructions',
    finishedTitle: 'When the AI has finished',
    finishedText: (tab: (text: string) => ReactNode): ReactNode => (
      <>
        Download or copy the AI’s results, then use {tab('Re-identify results')} to swap the codes back to real names.
        The key stays in this tab until you close or refresh it.
      </>
    ),
    goReidentify: 'Go to Re-identify results',
    backReview: 'Back to review',
    another: 'Anonymize another file',
  },

  /** Instructions the teacher pastes into the AI along with the anonymized file. */
  aiPrompt: (columns: { header: string; prefix: string }[], removed: string[]): string => {
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
  },

  reidentify: {
    eyebrow: 'Step 2 of the round trip',
    heading: 'Re-identify the AI’s results',
    lead: 'Put the real names and IDs back into what the AI gave you. This works with spreadsheets (CSV, Excel), text and Markdown files, or text you paste in.',
    help: (watch: (text: string) => ReactNode, guide: (text: string) => ReactNode): ReactNode => (
      <>
        First time? {watch('Watch the tutorial')} or see “How to put the names back” in the {guide('user guide')}.
      </>
    ),
    keyHeading: '1. Key',
    keyLoaded: 'Key loaded',
    keySummary: (codes: number, source: ReactNode, batch: string | undefined, created: string): ReactNode => (
      <>
        {count(codes, 'code', 'codes')} from {source}
        {batch && <> · batch {batch}</>} · created {created}
      </>
    ),
    otherKey: 'Use a different key file',
    passphraseFor: (name: string) => `Passphrase for ${name}`,
    unlocking: 'Unlocking…',
    unlock: 'Unlock key',
    cancel: 'Cancel',
    keyDropTitle: 'Drop your key file here, or click to choose it',
    keyDropHint: 'The PRIVATE-reidentification-key file you saved when you anonymized the data.',
    keyErrors: {
      passphraseRequired: 'This key file is locked. Enter the passphrase that was used when it was created.',
      wrongPassphrase: 'That passphrase did not unlock the key file. Check it and try again.',
      notJson: 'This file is not a key file (it is not valid JSON).',
      notKeyFile: 'This is not a key file created by this tool.',
      unreadable: 'That key file could not be read.',
    },
    resultsHeading: '2. The AI’s results',
    uploadFile: 'Upload a file',
    pasteText: 'Paste text',
    loadKeyFirst: 'Load the key first.',
    working: 'Working…',
    resultsDropTitle: 'Drop the AI’s output file here',
    resultsDropHint: 'CSV, TSV, Excel (.xlsx), .txt, .md, .json or .html',
    pasteLabel: 'AI response',
    pastePlaceholder: 'Paste the AI’s answer here, e.g. “STU-004 and STU-017 need support with fractions…”',
    putNamesBack: 'Put the names back',
    resultHeading: '3. Result',
    downloadFile: (name: string) => `Download ${name}`,
    copyText: 'Copy text',
    downloadTxt: 'Download as .txt',
    remindersTitle: 'Before you act on these results',
    reminders: [
      'The re-identified file contains personal data again. Save it only in school-approved storage, and never upload it back to an AI tool.',
      'Check the AI’s conclusions for errors and bias before acting on them.',
      'AI output informs your judgement; it does not replace it. Decisions about a student’s education, rights or wellbeing need review and sign-off by a responsible member of staff.',
      'Delete the anonymized file, the AI output, the key and this file when you no longer need them.',
    ],
    replaced: (n: number) => `${count(n, 'code', 'codes')} replaced`,
    restored: (n: number) => `${count(n, 'different student/value was', 'different students/values were')} restored.`,
    noCodesTitle: 'No codes were found',
    noCodesText:
      'Check that you loaded the key that matches this data (the batch code on both file names should be the same) and that the AI kept the codes in its answer.',
    unknownTitle: 'Some codes are not in the key',
    unknown: (shown: string[], more: number) =>
      `${shown.join(', ')}${more > 0 ? ` and ${num(more)} more` : ''}. The AI may have changed or invented them, or they come from a different batch. Treat any results attached to them with caution.`,
  },

  start: {
    needHelp: (
      watch: (text: string) => ReactNode,
      guide: (text: string) => ReactNode,
      sample: (text: string) => ReactNode,
      show: (text: string) => ReactNode,
    ): ReactNode => (
      <>
        Need help? {watch('Watch the tutorial')}, {guide('read the user guide')} or{' '}
        {sample('try it with a made-up class list')}. {show('Show the Start here panel')}
      </>
    ),
    eyebrow: 'New here? Start here',
    heading: 'Learn the tool in a few minutes',
    hide: 'Hide this panel',
    watchTitle: 'Watch the video tutorial',
    watchText: 'See the whole round trip, from spreadsheet to named results.',
    guideTitle: 'Read the user guide (PDF)',
    guideText: 'Every step explained with annotated screenshots.',
    sampleTitle: 'Try it with a made-up class list',
    sampleText: 'Practice on fictional students. No real data needed.',
  },

  video: {
    title: 'Safely anonymizing student data for AI analysis',
    note: 'Plays from Google Drive. Nothing loads until you press play.',
    notPlaying: (link: (text: string) => ReactNode): ReactNode => (
      <>Video not playing? {link('Open it in Google Drive')}.</>
    ),
    dialogTitle: 'Video tutorial',
    close: 'Close',
  },

  guide: {
    eyebrow: 'Help & guidance',
    heading: 'How this works, and the rules behind it',
    lead: 'Use this tool when you want an AI tool to analyse student data, such as finding learning gaps or grouping students for support, without the AI ever seeing who the students are.',
    tutorialEyebrow: 'New to the tool?',
    tutorialHeading: 'Watch the video tutorial',
    tutorialText: 'A short walkthrough of the whole round trip: anonymize, ask the AI, and put the names back.',
    preferRead: (link: (text: string) => ReactNode): ReactNode => (
      <>
        Prefer to read? The user guide covers every step with screenshots. {link('Open the user guide (PDF)')}
      </>
    ),
    flow: [
      {
        title: 'Anonymize',
        text: (
          <>
            Upload a spreadsheet. Names and IDs become codes like <span className="token">STU-004</span>; columns the AI
            does not need are removed.
          </>
        ),
      },
      {
        title: 'Keep the key',
        text: 'A private key file records which code belongs to which student. It never leaves your hands.',
      },
      { title: 'Analyse with AI', text: 'Upload only the anonymized file to a school-approved AI tool and ask your question.' },
      { title: 'Re-identify', text: 'Bring the AI’s answer back here with the key, and the codes turn back into names.' },
    ] as { title: string; text: ReactNode }[],
    judgementTitle: 'Human judgement comes first',
    disclaimer:
      'Suggestions are made automatically from column names and value patterns. They can be wrong or incomplete. Your professional judgement decides what is shared: read your school’s data protection and AI policies, and if you are unsure, ask your data protection or digital wellbeing lead.',
    pseudonymization: (
      <>
        Replacing names with codes is <em>pseudonymization</em>, not full anonymization. Whoever holds the key can
        re-identify the students, so the anonymized data still needs care, and the key needs even more.
      </>
    ) as ReactNode,
    privacyHeading: 'Your privacy in this tool',
    privacy: [
      'Everything happens inside your web browser. Files are never uploaded to a server, including ours.',
      'The page is locked by a security policy that blocks it from sending data anywhere, and it has no analytics or tracking.',
      'Nothing is stored after you close or refresh the tab, apart from the files you choose to download and display settings such as your language.',
      'The video tutorial plays from Google Drive and only loads when you press play.',
    ],
    kindsHeading: 'What to do with each kind of column',
    kindsHelp: 'These are the defaults the tool suggests. The right answer depends on what you are asking the AI to do.',
    kindsColumns: { kind: 'Kind of data', risk: 'Risk', suggested: 'Suggested', why: 'Why' },
    risks: { high: 'High', medium: 'Medium', low: 'Low' } satisfies Record<Risk, string>,
    actions: {
      keep: 'Usually keep',
      pseudonymize: 'Replace with codes',
      remove: 'Remove',
      year: 'Keep year only',
    } satisfies Record<Action, string>,
    practiceHeading: 'Good practice when using AI with student data',
    practice: [
      'Share only what the task needs. If the AI does not need a column, remove it.',
      'Use only AI tools your school has approved for student data. Check whether the tool keeps your uploads or uses them for training, and switch that off where you can.',
      'Never put student data into a personal AI account.',
      'AI output should inform your professional judgement, not replace it. A responsible member of staff must review and sign off any decision that affects a student’s education, rights or wellbeing.',
      'Check AI conclusions for mistakes and bias, for example patterns that unfairly single out a gender, nationality or group of students.',
      'Keep the key file away from the AI and anyone who does not need it, and delete the files when you no longer need them.',
      'If something goes wrong (for example, identifiable data was uploaded by mistake), report it to your school’s data protection or digital wellbeing lead straight away.',
    ],
    adekHeading: 'ADEK School Digital Policy',
    adekHelp: 'Summaries in our own words. Always read the policy itself.',
    /** Summaries (not quotations) of the parts of the public ADEK School Digital Policy that apply here. */
    adekSections: [
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
    ],
    lawHeading: 'Law and other policies',
    schoolPolicies: 'Your school’s policies',
    schoolPoliciesText:
      'Your school’s own data protection policy, AI policy and acceptable-use rules also apply. If you are unsure whether something can be shared, ask before you upload it.',
    limitsHeading: 'Limits of this tool',
    limits: [
      'It recognises common column names in English and Arabic and common value patterns. It will miss some.',
      'It replaces names inside comments only when those names appear in a column you chose to replace. Nicknames, misspellings, siblings, staff and places mentioned in text are not caught.',
      'Hidden rows and columns are included like any others, so unhide and check them. Excel formatting, formulas, cell comments and other sheets are not carried into the download.',
      'The AI can change or invent codes. Results attached to codes that are not in the key are flagged.',
      'Old .xls files must be saved as .xlsx first.',
    ],
  },

  policies: {
    adekDigitalPolicy: 'ADEK School Digital Policy (v1.1, September 2024)',
    adekPolicies: 'ADEK school policies (all current policies)',
    uaePdpl: 'Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL)',
  },
};

export type Messages = typeof en;

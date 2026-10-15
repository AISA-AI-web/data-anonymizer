import { CATEGORY_INFO } from '../lib/detect';
import {
  ADEK_DIGITAL_POLICY,
  ADEK_POLICIES_PAGE,
  AI_GOOD_PRACTICE,
  configuredPolicyLinks,
  DIGITAL_POLICY_SECTIONS,
  SUGGESTION_DISCLAIMER,
  UAE_PDPL,
  USER_GUIDE_URL,
} from '../lib/policy';
import type { Action, Category } from '../lib/types';
import { Notice } from './Notice';
import { VideoTutorial } from './VideoTutorial';

const ACTION_TEXT: Record<Action, string> = {
  keep: 'Usually keep',
  pseudonymize: 'Replace with codes',
  remove: 'Remove',
  year: 'Keep year only',
};

const GUIDE_ORDER: Category[] = [
  'name',
  'studentId',
  'staffName',
  'parentName',
  'nationalId',
  'email',
  'phone',
  'address',
  'dob',
  'health',
  'sen',
  'safeguarding',
  'behaviour',
  'religion',
  'ethnicity',
  'nationality',
  'financial',
  'credentials',
  'photo',
  'freeText',
  'gender',
  'age',
  'classGroup',
  'performance',
];

export function Guide() {
  const schoolLinks = configuredPolicyLinks();
  return (
    <section className="stack" aria-labelledby="guide-heading">
      <div>
        <div className="eyebrow">Help &amp; guidance</div>
        <h2 id="guide-heading">How this works, and the rules behind it</h2>
        <p className="lead">
          Use this tool when you want an AI tool to analyse student data, such as finding learning gaps or grouping
          students for support, without the AI ever seeing who the students are.
        </p>
      </div>

      <div className="card tutorial-card">
        <VideoTutorial />
        <div>
          <div className="eyebrow">New to the tool?</div>
          <h3>Watch the video tutorial</h3>
          <p className="small">
            A short walkthrough of the whole round trip: anonymize, ask the AI, and put the names back.
          </p>
          <p className="small">
            Prefer to read? The user guide covers every step with screenshots.{' '}
            <a href={USER_GUIDE_URL} target="_blank" rel="noopener">
              Open the user guide (PDF)
            </a>
          </p>
        </div>
      </div>

      <div className="flow">
        <div>
          <h4>Anonymize</h4>
          <p>Upload a spreadsheet. Names and IDs become codes like STU-004; columns the AI does not need are removed.</p>
        </div>
        <div>
          <h4>Keep the key</h4>
          <p>A private key file records which code belongs to which student. It never leaves your hands.</p>
        </div>
        <div>
          <h4>Analyse with AI</h4>
          <p>Upload only the anonymized file to a school-approved AI tool and ask your question.</p>
        </div>
        <div>
          <h4>Re-identify</h4>
          <p>Bring the AI’s answer back here with the key, and the codes turn back into names.</p>
        </div>
      </div>

      <Notice tone="gold" title="Human judgement comes first">
        <p>{SUGGESTION_DISCLAIMER}</p>
        <p>
          Replacing names with codes is <em>pseudonymization</em>, not full anonymization. Whoever holds the key can
          re-identify the students, so the anonymized data still needs care, and the key needs even more.
        </p>
      </Notice>

      <div className="card">
        <h3>Your privacy in this tool</h3>
        <ul>
          <li>Everything happens inside your web browser. Files are never uploaded to a server, including ours.</li>
          <li>
            The page is locked by a security policy that blocks it from sending data anywhere, and it has no analytics or
            tracking.
          </li>
          <li>Nothing is stored after you close or refresh the tab, apart from the files you choose to download.</li>
          <li>The video tutorial plays from Google Drive and only loads when you press play.</li>
        </ul>
      </div>

      <div>
        <h3>What to do with each kind of column</h3>
        <p className="small muted">
          These are the defaults the tool suggests. The right answer depends on what you are asking the AI to do.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kind of data</th>
                <th>Risk</th>
                <th>Suggested</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {GUIDE_ORDER.map((c) => {
                const info = CATEGORY_INFO[c];
                return (
                  <tr key={c}>
                    <td>
                      <strong>{info.label}</strong>
                    </td>
                    <td>
                      <span className={`badge badge--${info.risk}`}>{info.risk}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ACTION_TEXT[info.action]}</td>
                    <td className="small">{info.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Good practice when using AI with student data</h3>
        <ul>
          {AI_GOOD_PRACTICE.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>ADEK School Digital Policy</h3>
          <p className="small muted">Summaries in our own words. Always read the policy itself.</p>
          <ul className="small">
            {DIGITAL_POLICY_SECTIONS.map((s) => (
              <li key={s.ref}>
                <strong>{s.ref}:</strong> {s.summary}
              </li>
            ))}
          </ul>
          <p className="small">
            <a href={ADEK_DIGITAL_POLICY.url} target="_blank" rel="noreferrer noopener">
              {ADEK_DIGITAL_POLICY.title}
            </a>
          </p>
        </div>
        <div className="card stack">
          <div>
            <h3>Law and other policies</h3>
            <ul className="small">
              <li>
                <a href={UAE_PDPL.url} target="_blank" rel="noreferrer noopener">
                  {UAE_PDPL.title}
                </a>
              </li>
              <li>
                <a href={ADEK_POLICIES_PAGE.url} target="_blank" rel="noreferrer noopener">
                  {ADEK_POLICIES_PAGE.title}
                </a>
              </li>
            </ul>
          </div>
          {schoolLinks.length > 0 && (
            <div>
              <h4>Your school’s policies</h4>
              <ul className="small">
                {schoolLinks.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noreferrer noopener">
                      {l.title}
                    </a>
                    {l.note && <> · {l.note}</>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="small muted">
            Your school’s own data protection policy, AI policy and acceptable-use rules also apply. If you are unsure
            whether something can be shared, ask before you upload it.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Limits of this tool</h3>
        <ul className="small">
          <li>It recognises common column names in English and Arabic and common value patterns. It will miss some.</li>
          <li>
            It replaces names inside comments only when those names appear in a column you chose to replace. Nicknames,
            misspellings, siblings, staff and places mentioned in text are not caught.
          </li>
          <li>
            Hidden rows and columns are included like any others, so unhide and check them. Excel formatting, formulas,
            cell comments and other sheets are not carried into the download.
          </li>
          <li>The AI can change or invent codes. Results attached to codes that are not in the key are flagged.</li>
          <li>Old .xls files must be saved as .xlsx first.</li>
        </ul>
      </div>
    </section>
  );
}

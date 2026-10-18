import { useI18n } from '../i18n';
import { CATEGORY_INFO } from '../lib/detect';
import { configuredPolicyLinks, POLICY_URLS, USER_GUIDE_URL } from '../lib/policy';
import type { Category } from '../lib/types';
import { Notice } from './Notice';
import { VideoTutorial } from './VideoTutorial';

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
  const { t } = useI18n();
  const g = t.guide;
  const schoolLinks = configuredPolicyLinks();
  return (
    <section className="stack" aria-labelledby="guide-heading">
      <div>
        <div className="eyebrow">{g.eyebrow}</div>
        <h2 id="guide-heading">{g.heading}</h2>
        <p className="lead">{g.lead}</p>
      </div>

      <div className="card tutorial-card">
        <VideoTutorial />
        <div>
          <div className="eyebrow">{g.tutorialEyebrow}</div>
          <h3>{g.tutorialHeading}</h3>
          <p className="small">{g.tutorialText}</p>
          <p className="small">
            {g.preferRead((text) => (
              <a href={USER_GUIDE_URL} target="_blank" rel="noopener">
                {text}
              </a>
            ))}
          </p>
        </div>
      </div>

      <div className="flow">
        {g.flow.map((step) => (
          <div key={step.title}>
            <h4>{step.title}</h4>
            <p>{step.text}</p>
          </div>
        ))}
      </div>

      <Notice tone="gold" title={g.judgementTitle}>
        <p>{g.disclaimer}</p>
        <p>{g.pseudonymization}</p>
      </Notice>

      <div className="card">
        <h3>{g.privacyHeading}</h3>
        <ul>
          {g.privacy.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3>{g.kindsHeading}</h3>
        <p className="small muted">{g.kindsHelp}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{g.kindsColumns.kind}</th>
                <th>{g.kindsColumns.risk}</th>
                <th>{g.kindsColumns.suggested}</th>
                <th>{g.kindsColumns.why}</th>
              </tr>
            </thead>
            <tbody>
              {GUIDE_ORDER.map((c) => {
                const info = CATEGORY_INFO[c];
                return (
                  <tr key={c}>
                    <td>
                      <strong>{t.categories[c].label}</strong>
                    </td>
                    <td>
                      <span className={`badge badge--${info.risk}`}>{g.risks[info.risk]}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{g.actions[info.action]}</td>
                    <td className="small">{t.categories[c].reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>{g.practiceHeading}</h3>
        <ul>
          {g.practice.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>{g.adekHeading}</h3>
          <p className="small muted">{g.adekHelp}</p>
          <ul className="small">
            {g.adekSections.map((s) => (
              <li key={s.ref}>
                <strong>{s.ref}:</strong> {s.summary}
              </li>
            ))}
          </ul>
          <p className="small">
            <a href={POLICY_URLS.adekDigitalPolicy} target="_blank" rel="noreferrer noopener">
              {t.policies.adekDigitalPolicy}
            </a>
          </p>
        </div>
        <div className="card stack">
          <div>
            <h3>{g.lawHeading}</h3>
            <ul className="small">
              <li>
                <a href={POLICY_URLS.uaePdpl} target="_blank" rel="noreferrer noopener">
                  {t.policies.uaePdpl}
                </a>
              </li>
              <li>
                <a href={POLICY_URLS.adekPolicies} target="_blank" rel="noreferrer noopener">
                  {t.policies.adekPolicies}
                </a>
              </li>
            </ul>
          </div>
          {schoolLinks.length > 0 && (
            <div>
              <h4>{g.schoolPolicies}</h4>
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
          <p className="small muted">{g.schoolPoliciesText}</p>
        </div>
      </div>

      <div className="card">
        <h3>{g.limitsHeading}</h3>
        <ul className="small">
          {g.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

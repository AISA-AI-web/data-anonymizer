import { useState } from 'react';
import { AnonymizeFlow } from './components/AnonymizeFlow';
import { Guide } from './components/Guide';
import { LockIcon } from './components/Icons';
import { ReidentifyFlow } from './components/ReidentifyFlow';
import { USER_GUIDE_URL } from './lib/policy';
import type { KeyData } from './lib/types';

type Tab = 'anonymize' | 'reidentify' | 'guide';

const TABS: { id: Tab; label: string }[] = [
  { id: 'anonymize', label: '1. Anonymize' },
  { id: 'reidentify', label: '2. Re-identify results' },
  { id: 'guide', label: 'Guidance & policy' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('anonymize');
  // The key lives only in memory; it disappears when the tab is closed or refreshed.
  const [sessionKey, setSessionKey] = useState<KeyData | null>(null);

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__top">
            <span className="wordmark">AISA</span>
            <h1 className="app-title">Student Data Anonymizer</h1>
            <span className="privacy-pill">
              <LockIcon /> Runs in your browser · nothing is uploaded
            </span>
            <a className="guide-link" href={USER_GUIDE_URL} target="_blank" rel="noopener">
              User guide (PDF)
            </a>
          </div>
          <p className="app-tagline">Prepare student data for AI safely, then match the AI’s results back to your students.</p>
          <nav className="tabs" role="tablist" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                className="tab"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {/* Kept mounted (hidden) so work in progress survives switching tabs. */}
        <div id="panel-anonymize" role="tabpanel" hidden={tab !== 'anonymize'}>
          <AnonymizeFlow onKeyReady={setSessionKey} goToReidentify={() => setTab('reidentify')} />
        </div>
        <div id="panel-reidentify" role="tabpanel" hidden={tab !== 'reidentify'}>
          {tab === 'reidentify' && <ReidentifyFlow sessionKey={sessionKey} onKeyLoaded={setSessionKey} />}
        </div>
        <div id="panel-guide" role="tabpanel" hidden={tab !== 'guide'}>
          {tab === 'guide' && <Guide />}
        </div>
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          American International School in Abu Dhabi · This tool supports, and does not replace, your professional
          judgement and your school’s data protection and AI policies. Suggestions can be wrong; always check the data
          yourself before sharing it.
        </div>
      </footer>
    </>
  );
}

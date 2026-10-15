import { useState } from 'react';
import aisaLogo from './assets/aisa-logo.png';
import aisaSeal from './assets/aisa-seal-white.png';
import { AnonymizeFlow } from './components/AnonymizeFlow';
import { Guide } from './components/Guide';
import { BookIcon, LockIcon, PlayIcon } from './components/Icons';
import { ReidentifyFlow } from './components/ReidentifyFlow';
import { VideoDialog } from './components/VideoTutorial';
import { USER_GUIDE_URL } from './lib/policy';
import type { KeyData } from './lib/types';

type Tab = 'anonymize' | 'reidentify' | 'guide';

const TABS: { id: Tab; label: string }[] = [
  { id: 'anonymize', label: '1. Anonymize' },
  { id: 'reidentify', label: '2. Re-identify results' },
  { id: 'guide', label: 'Help & guidance' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('anonymize');
  // The key lives only in memory; it disappears when the tab is closed or refreshed.
  const [sessionKey, setSessionKey] = useState<KeyData | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const openTutorial = () => setVideoOpen(true);

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__top">
            <div className="brand">
              <img className="brand__seal" src={aisaSeal} alt="American International School in Abu Dhabi" width={68} height={68} />
              <div>
                <div className="brand__school">American International School in Abu Dhabi</div>
                <h1 className="app-title">Student Data Anonymizer</h1>
              </div>
            </div>
            <div className="header-actions">
              <button className="hdr-btn hdr-btn--gold" onClick={openTutorial}>
                <PlayIcon /> Watch the tutorial
              </button>
              <a className="hdr-btn hdr-btn--outline" href={USER_GUIDE_URL} target="_blank" rel="noopener">
                <BookIcon /> User guide (PDF)
              </a>
            </div>
          </div>
          <div className="app-header__sub">
            <p className="app-tagline">Prepare student data for AI safely, then match the AI’s results back to your students.</p>
            <span className="privacy-pill">
              <LockIcon /> Runs in your browser · nothing is uploaded
            </span>
          </div>
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
          <AnonymizeFlow
            onKeyReady={setSessionKey}
            goToReidentify={() => setTab('reidentify')}
            openTutorial={openTutorial}
          />
        </div>
        <div id="panel-reidentify" role="tabpanel" hidden={tab !== 'reidentify'}>
          {tab === 'reidentify' && (
            <ReidentifyFlow sessionKey={sessionKey} onKeyLoaded={setSessionKey} openTutorial={openTutorial} />
          )}
        </div>
        <div id="panel-guide" role="tabpanel" hidden={tab !== 'guide'}>
          {tab === 'guide' && <Guide />}
        </div>
      </main>

      <VideoDialog open={videoOpen} onClose={() => setVideoOpen(false)} />

      <footer className="app-footer">
        <div className="app-footer__inner">
          <img className="app-footer__logo" src={aisaLogo} alt="" width={44} height={44} />
          <div>
            <div className="app-footer__school">American International School in Abu Dhabi</div>
            <p>
              This tool supports, and does not replace, your professional judgement and your school’s data protection
              and AI policies. Suggestions can be wrong; always check the data yourself before sharing it.
            </p>
            <p className="app-footer__links">
              <button className="link-btn" onClick={openTutorial}>
                Video tutorial
              </button>
              <span aria-hidden="true">·</span>
              <a href={USER_GUIDE_URL} target="_blank" rel="noopener">
                User guide (PDF)
              </a>
              <span aria-hidden="true">·</span>
              <button className="link-btn" onClick={() => setTab('guide')}>
                Help &amp; guidance
              </button>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

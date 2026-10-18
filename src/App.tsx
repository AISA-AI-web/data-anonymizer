import { useState } from 'react';
import aisaLogo from './assets/aisa-logo.png';
import aisaSeal from './assets/aisa-seal-white.png';
import { AnonymizeFlow } from './components/AnonymizeFlow';
import { Guide } from './components/Guide';
import { BookIcon, LockIcon, PlayIcon } from './components/Icons';
import { LanguageSwitch } from './components/LanguageSwitch';
import { ReidentifyFlow } from './components/ReidentifyFlow';
import { VideoDialog } from './components/VideoTutorial';
import { useI18n } from './i18n';
import { USER_GUIDE_URL } from './lib/policy';
import type { KeyData } from './lib/types';

type Tab = 'anonymize' | 'reidentify' | 'guide';

const TABS: Tab[] = ['anonymize', 'reidentify', 'guide'];

export default function App() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('anonymize');
  // The key lives only in memory; it disappears when the tab is closed or refreshed.
  const [sessionKey, setSessionKey] = useState<KeyData | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const openTutorial = () => setVideoOpen(true);

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <LanguageSwitch />
          <div className="app-header__top">
            <div className="brand">
              <img className="brand__seal" src={aisaSeal} alt={t.app.school} width={68} height={68} />
              <div>
                <div className="brand__school">{t.app.school}</div>
                <h1 className="app-title">{t.app.title}</h1>
              </div>
            </div>
            <div className="header-actions">
              <button className="hdr-btn hdr-btn--gold" onClick={openTutorial}>
                <PlayIcon /> {t.app.watchTutorial}
              </button>
              <a className="hdr-btn hdr-btn--outline" href={USER_GUIDE_URL} target="_blank" rel="noopener">
                <BookIcon /> {t.app.userGuide}
              </a>
            </div>
          </div>
          <div className="app-header__sub">
            <p className="app-tagline">{t.app.tagline}</p>
            <span className="privacy-pill">
              <LockIcon /> {t.app.privacy}
            </span>
          </div>
          <nav className="tabs" role="tablist" aria-label={t.app.sections}>
            {TABS.map((id) => (
              <button
                key={id}
                className="tab"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
              >
                {t.app.tabs[id]}
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
            <div className="app-footer__school">{t.app.school}</div>
            <p>{t.app.footer}</p>
            <p className="app-footer__links">
              <button className="link-btn" onClick={openTutorial}>
                {t.app.videoTutorial}
              </button>
              <span aria-hidden="true">·</span>
              <a href={USER_GUIDE_URL} target="_blank" rel="noopener">
                {t.app.userGuide}
              </a>
              <span aria-hidden="true">·</span>
              <button className="link-btn" onClick={() => setTab('guide')}>
                {t.app.tabs.guide}
              </button>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

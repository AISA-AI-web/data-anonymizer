import { useState } from 'react';
import { useI18n } from '../i18n';
import { USER_GUIDE_URL } from '../lib/policy';
import { BookIcon, PlayIcon, SparkIcon } from './Icons';

const HIDE_KEY = 'aisa-anonymizer.hideStartHere';

// Only a per-browser convenience; the panel simply shows again if storage is unavailable.
function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(HIDE_KEY, '1');
    else localStorage.removeItem(HIDE_KEY);
  } catch {
    /* ignore */
  }
}

interface Props {
  onWatch: () => void;
  onTrySample: () => void;
}

/** The first thing a new user sees: the tutorial, the guide and a practice run. */
export function GettingStarted({ onWatch, onTrySample }: Props) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(readHidden);
  const toggle = (value: boolean) => {
    writeHidden(value);
    setHidden(value);
  };

  if (hidden) {
    return (
      <p className="small muted help-line">
        {t.start.needHelp(
          (text) => (
            <button className="link-btn" onClick={onWatch}>
              {text}
            </button>
          ),
          (text) => (
            <a href={USER_GUIDE_URL} target="_blank" rel="noopener">
              {text}
            </a>
          ),
          (text) => (
            <button className="link-btn" onClick={onTrySample}>
              {text}
            </button>
          ),
          (text) => (
            <button className="link-btn" onClick={() => toggle(false)}>
              {text}
            </button>
          ),
        )}
      </p>
    );
  }

  return (
    <section className="start-here" aria-labelledby="start-here-title">
      <div className="start-here__head">
        <div>
          <div className="eyebrow start-here__eyebrow">{t.start.eyebrow}</div>
          <h3 id="start-here-title">{t.start.heading}</h3>
        </div>
        <button className="link-btn small" onClick={() => toggle(true)}>
          {t.start.hide}
        </button>
      </div>
      <div className="start-here__tiles">
        <button className="tile tile--primary" onClick={onWatch}>
          <span className="tile__icon">
            <PlayIcon size={22} />
          </span>
          <span className="tile__title">{t.start.watchTitle}</span>
          <span className="tile__text">{t.start.watchText}</span>
        </button>
        <a className="tile" href={USER_GUIDE_URL} target="_blank" rel="noopener">
          <span className="tile__icon">
            <BookIcon size={22} />
          </span>
          <span className="tile__title">{t.start.guideTitle}</span>
          <span className="tile__text">{t.start.guideText}</span>
        </a>
        <button className="tile" onClick={onTrySample}>
          <span className="tile__icon">
            <SparkIcon size={22} />
          </span>
          <span className="tile__title">{t.start.sampleTitle}</span>
          <span className="tile__text">{t.start.sampleText}</span>
        </button>
      </div>
    </section>
  );
}

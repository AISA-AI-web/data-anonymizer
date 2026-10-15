import { useState } from 'react';
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
  const [hidden, setHidden] = useState(readHidden);
  const toggle = (value: boolean) => {
    writeHidden(value);
    setHidden(value);
  };

  if (hidden) {
    return (
      <p className="small muted help-line">
        Need help?{' '}
        <button className="link-btn" onClick={onWatch}>
          Watch the tutorial
        </button>
        ,{' '}
        <a href={USER_GUIDE_URL} target="_blank" rel="noopener">
          read the user guide
        </a>{' '}
        or{' '}
        <button className="link-btn" onClick={onTrySample}>
          try it with a made-up class list
        </button>
        .{' '}
        <button className="link-btn" onClick={() => toggle(false)}>
          Show the Start here panel
        </button>
      </p>
    );
  }

  return (
    <section className="start-here" aria-labelledby="start-here-title">
      <div className="start-here__head">
        <div>
          <div className="eyebrow start-here__eyebrow">New here? Start here</div>
          <h3 id="start-here-title">Learn the tool in a few minutes</h3>
        </div>
        <button className="link-btn small" onClick={() => toggle(true)}>
          Hide this panel
        </button>
      </div>
      <div className="start-here__tiles">
        <button className="tile tile--primary" onClick={onWatch}>
          <span className="tile__icon">
            <PlayIcon size={22} />
          </span>
          <span className="tile__title">Watch the video tutorial</span>
          <span className="tile__text">See the whole round trip, from spreadsheet to named results.</span>
        </button>
        <a className="tile" href={USER_GUIDE_URL} target="_blank" rel="noopener">
          <span className="tile__icon">
            <BookIcon size={22} />
          </span>
          <span className="tile__title">Read the user guide (PDF)</span>
          <span className="tile__text">Every step explained with annotated screenshots.</span>
        </a>
        <button className="tile" onClick={onTrySample}>
          <span className="tile__icon">
            <SparkIcon size={22} />
          </span>
          <span className="tile__title">Try it with a made-up class list</span>
          <span className="tile__text">Practice on fictional students. No real data needed.</span>
        </button>
      </div>
    </section>
  );
}

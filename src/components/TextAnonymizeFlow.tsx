import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { anonymizeText, MAX_TEXT_LENGTH, type TextAnonymizeResult } from '../lib/anonymizeText';
import { copyText, downloadFile } from '../lib/download';
import type { FoundName } from '../lib/findNames';
import { serializeKey } from '../lib/keyfile';
import { useI18n } from '../i18n';
import { TEXT_CHECKLIST } from '../lib/policy';
import { SAMPLE_TEXT } from '../lib/sample';
import type { KeyData } from '../lib/types';
import { Checklist } from './Checklist';
import { BackIcon, CopyIcon, DownloadIcon, KeyIcon, LockIcon, NextIcon } from './Icons';
import { Notice } from './Notice';
import { Stepper } from './Stepper';

interface Props {
  onKeyReady: (key: KeyData) => void;
  goToReidentify: () => void;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const CODE_RE = /(\b[A-Z][A-Z0-9]{1,7}-\d{3,}\b)/g;

/** The anonymized text with its codes highlighted. */
function CodedText({ text }: { text: string }) {
  return (
    <pre className="snippet text-out" dir="auto">
      {text.split(CODE_RE).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="token">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </pre>
  );
}

export function TextAnonymizeFlow({ onKeyReady, goToReidentify }: Props) {
  const { t } = useI18n();
  const tx = t.text;
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [hideContacts, setHideContacts] = useState(true);
  const [found, setFound] = useState<FoundName[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [ignore, setIgnore] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [final, setFinal] = useState<TextAnonymizeResult | null>(null);

  // Worked out again whenever a name is added or removed, so the screen always shows what will be shared.
  const preview = useMemo(
    () => (step === 1 ? anonymizeText(text, names, { hideContacts, ignore }) : null),
    [step, text, names, hideContacts, ignore],
  );

  async function detect() {
    setError(null);
    setBusy(true);
    try {
      // The language model is loaded only when it is needed, from this site (nothing is sent anywhere).
      const { findNames } = await import('../lib/findNames');
      const list = findNames(text);
      setFound(list);
      setNames(list.map((n) => n.text));
      setIgnore([]);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : tx.error);
    } finally {
      setBusy(false);
    }
  }

  function addName(name: string) {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    setIgnore((prev) => prev.filter((w) => !sameName(w, clean)));
    setNames((prev) => (prev.some((n) => sameName(n, clean)) ? prev : [...prev, clean]));
  }

  function removeName(name: string) {
    setNames((prev) => prev.filter((n) => !sameName(n, name)));
  }

  /** "This is not a name": remove it from the list, or, for a short form of a listed name, keep it as written. */
  function keepMention(mention: string) {
    if (names.some((n) => sameName(n, mention))) removeName(mention);
    else setIgnore((prev) => (prev.some((w) => sameName(w, mention)) ? prev : [...prev, mention]));
  }

  const reasonOf = (name: string) => found.find((f) => sameName(f.text, name));
  const tooLong = text.length > MAX_TEXT_LENGTH;

  return (
    <section aria-labelledby="text-heading">
      <div className="eyebrow">{tx.eyebrow}</div>
      <h2 id="text-heading">{tx.heading}</h2>
      <p className="lead">{tx.lead}</p>
      <Stepper steps={tx.steps} current={step} />

      {step === 0 && (
        <div className="stack">
          <div className="card stack">
            <label className="field">
              <strong>{tx.textLabel}</strong>
              <textarea
                className="text-in"
                dir="auto"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={tx.placeholder}
              />
            </label>
            <div className="row">
              <span className="small muted">{tx.characters(text.length)}</span>
              <span className="spacer" />
              <button className="link-btn small" onClick={() => setText(SAMPLE_TEXT)}>
                {tx.sample}
              </button>
            </div>
            <label className="check">
              <input type="checkbox" checked={hideContacts} onChange={(e) => setHideContacts(e.target.checked)} />
              <span>
                <strong>{tx.contactsTitle}</strong>
                <br />
                <span className="small muted">{tx.contactsHelp}</span>
              </span>
            </label>
          </div>
          {tooLong && (
            <Notice tone="danger" title={tx.tooLongTitle}>
              <p>{tx.tooLong(MAX_TEXT_LENGTH)}</p>
            </Notice>
          )}
          {error && (
            <Notice tone="danger" title={tx.errorTitle}>
              <p>{error}</p>
            </Notice>
          )}
          <div className="row">
            <span className="spacer" />
            <button className="btn" onClick={detect} disabled={!text.trim() || tooLong || busy}>
              {busy ? tx.reading : tx.find} <NextIcon />
            </button>
          </div>
        </div>
      )}

      {step === 1 && preview && (
        <div className="stack">
          <Notice tone="gold" title={tx.checkTitle}>
            <p>{tx.checkText}</p>
          </Notice>

          <div className="card stack">
            <div className="row">
              <h3 style={{ margin: 0 }}>{tx.yourText}</h3>
              <span className="spacer" />
              <span className="small muted legend">
                <span className="name-mark">{tx.legendHidden}</span>{' '}
                <span className="name-mark name-mark--check">{tx.legendCheck}</span>{' '}
                <span className="word-add">{tx.legendNotHidden}</span>
              </span>
            </div>
            <p className="small muted">{tx.clickHelp((text) => <strong>{text}</strong>)}</p>
            <MarkedText
              text={text}
              result={preview}
              isCheck={(source) => reasonOf(source)?.sure === false}
              onKeep={keepMention}
              onAdd={addName}
            />
          </div>

          <div className="card stack">
            <h3>{tx.namesHeading(names.length)}</h3>
            {names.length === 0 ? (
              <p className="small muted">{tx.noNames}</p>
            ) : (
              <ul className="name-chips">
                {names.map((name) => {
                  const info = reasonOf(name);
                  const person = preview.people.find((p) => sameName(p.name, name));
                  const mentions = preview.spans.filter((s) => s.source && sameName(s.source, name)).length;
                  return (
                    <li key={name} className={`chip${info?.sure === false ? ' chip--check' : ''}`}>
                      <span>
                        <strong>{name}</strong>
                        {person && <span className="token chip__code">{person.token}</span>}
                        <span className="small muted">
                          {' '}
                          · {tx.mentions(mentions)} · {info ? tx.reasons[info.reason] : tx.addedByYou}
                        </span>
                      </span>
                      <button className="chip__remove" onClick={() => removeName(name)} aria-label={tx.removeName(name)}>
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="row"
              style={{ alignItems: 'flex-end' }}
              onSubmit={(e) => {
                e.preventDefault();
                addName(newName);
                setNewName('');
              }}
            >
              <label className="field" style={{ flex: '1 1 16rem' }}>
                {tx.addLabel}
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={tx.addPlaceholder} />
              </label>
              <button className="btn btn--secondary" type="submit" disabled={!newName.trim()}>
                {tx.add}
              </button>
            </form>
            {ignore.length > 0 && (
              <p className="small">
                {tx.leftAsWritten}{' '}
                {ignore.map((w, i) => (
                  <Fragment key={w}>
                    {i > 0 && ', '}“{w}” (
                    <button className="link-btn" onClick={() => setIgnore((prev) => prev.filter((x) => x !== w))}>
                      {tx.hideAgain}
                    </button>
                    )
                  </Fragment>
                ))}
              </p>
            )}
          </div>

          <div className="card stack">
            <h3>{tx.sharedHeading}</h3>
            <p className="small muted">{tx.sharedSummary(preview.people.length, preview.contacts)}</p>
            <CodedText text={preview.text} />
          </div>

          {preview.spans.length === 0 && (
            <Notice tone="warning" title={tx.nothingTitle}>
              <p>{tx.nothingText}</p>
            </Notice>
          )}

          <div className="row">
            <button className="btn btn--secondary" onClick={() => setStep(0)}>
              <BackIcon /> {tx.backText}
            </button>
            <span className="spacer" />
            <button
              className="btn"
              disabled={preview.spans.length === 0}
              onClick={() => {
                setFinal(preview);
                setStep(2);
              }}
            >
              {tx.nextLock} <NextIcon />
            </button>
          </div>
        </div>
      )}

      {step === 2 && final && (
        <LockAndShare
          result={final}
          onKeyReady={onKeyReady}
          onBack={() => setStep(1)}
          onStartOver={() => {
            setText('');
            setFinal(null);
            setStep(0);
          }}
          goToReidentify={goToReidentify}
        />
      )}
    </section>
  );
}

/** The original text, with each mention that will be hidden marked, and every other capitalised word clickable. */
function MarkedText({
  text,
  result,
  isCheck,
  onKeep,
  onAdd,
}: {
  text: string;
  result: TextAnonymizeResult;
  isCheck: (source: string) => boolean;
  onKeep: (mention: string) => void;
  onAdd: (word: string) => void;
}) {
  const { t } = useI18n();
  const plain = (from: number, to: number, keyBase: number): ReactNode[] => {
    const out: ReactNode[] = [];
    const chunk = text.slice(from, to);
    let at = 0;
    for (const m of chunk.matchAll(/\p{Lu}[\p{L}\p{M}'’-]*\p{L}/gu)) {
      out.push(chunk.slice(at, m.index));
      const word = m[0].replace(/['’]s$/u, '');
      out.push(
        <button key={`${keyBase}-${m.index}`} className="word-add" title={t.text.hideWord(word)} onClick={() => onAdd(word)}>
          {m[0]}
        </button>,
      );
      at = m.index! + m[0].length;
    }
    out.push(chunk.slice(at));
    return out;
  };

  const nodes: ReactNode[] = [];
  let at = 0;
  for (const s of result.spans) {
    nodes.push(...plain(at, s.start, at));
    const mention = text.slice(s.start, s.end);
    nodes.push(
      s.kind === 'person' ? (
        <button
          key={s.start}
          className={`name-mark${s.source && isCheck(s.source) ? ' name-mark--check' : ''}`}
          title={t.text.hiddenAs(s.token, s.source && !sameName(s.source, mention) ? s.source : undefined)}
          onClick={() => onKeep(mention)}
        >
          {mention}
        </button>
      ) : (
        <span key={s.start} className="name-mark name-mark--contact" title={t.text.contactHiddenAs(s.token)}>
          {mention}
        </span>
      ),
    );
    at = s.end;
  }
  nodes.push(...plain(at, text.length, at));
  return <div className="marked-text" dir="auto">{nodes}</div>;
}

function LockAndShare({
  result,
  onKeyReady,
  onBack,
  onStartOver,
  goToReidentify,
}: {
  result: TextAnonymizeResult;
  onKeyReady: (key: KeyData) => void;
  onBack: () => void;
  onStartOver: () => void;
  goToReidentify: () => void;
}) {
  const { t } = useI18n();
  const tx = t.text;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [textTaken, setTextTaken] = useState(false);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState<'text' | 'prompt' | null>(null);

  const batch = result.key.batch ?? 'TEXT';
  const keyName = `PRIVATE-reidentification-key-${today()}-${batch}.json`;
  const textName = `anonymized-text-${today()}-${batch}.txt`;
  const allChecked = TEXT_CHECKLIST.every((i) => checked.has(i.id));
  const passphraseProblem =
    passphrase && passphrase.length < 8
      ? t.download.passphraseShort
      : passphrase && passphrase !== confirm
        ? t.download.passphraseMismatch
        : null;
  const prompt = t.aiTextPrompt(result.key.columns.map((c) => c.prefix));

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function saveKey() {
    setWorking(true);
    try {
      downloadFile(await serializeKey(result.key, passphrase || undefined), keyName, 'application/json');
      setKeySaved(true);
      onKeyReady(result.key);
    } finally {
      setWorking(false);
    }
  }

  async function copy(what: 'text' | 'prompt') {
    const ok = await copyText(what === 'text' ? result.text : prompt);
    if (what === 'text') {
      setTextTaken(true);
      onKeyReady(result.key);
    }
    setCopied(ok ? what : null);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>{t.checklist.heading}</h3>
        <p className="small muted">{tx.checklistHelp}</p>
        <Checklist items={TEXT_CHECKLIST} checked={checked} onToggle={toggle} />
      </div>

      <div className="grid-2">
        <div className="card stack">
          <div>
            <div className="eyebrow">{t.download.keyEyebrow}</div>
            <h3>
              <KeyIcon /> {tx.keyHeading}
            </h3>
            <p className="small">{tx.keyText((text) => <strong>{text}</strong>)}</p>
          </div>
          <label className="field">
            {t.download.passphrase}
            <input
              type="password"
              value={passphrase}
              autoComplete="new-password"
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={t.download.passphrasePlaceholder}
            />
          </label>
          {passphrase && (
            <label className="field">
              {t.download.passphraseAgain}
              <input type="password" value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
            </label>
          )}
          {passphraseProblem && <p className="small" style={{ color: 'var(--risk-high)' }}>{passphraseProblem}</p>}
          <p className="small muted">{t.download.passphraseWarning}</p>
          <div>
            <button className="btn btn--secondary" onClick={saveKey} disabled={!allChecked || !!passphraseProblem || working}>
              {passphrase ? <LockIcon /> : <DownloadIcon />} {passphrase ? tx.lockDownload : tx.downloadKey}
            </button>
            {keySaved && (
              <p className="small" style={{ marginTop: '0.5rem' }}>
                {passphrase ? tx.savedLocked(keyName) : t.download.savedAs(keyName)}
              </p>
            )}
          </div>
        </div>

        <div className="card stack">
          <div>
            <div className="eyebrow">{t.download.dataEyebrow}</div>
            <h3>{tx.textHeading}</h3>
            <p className="small">{tx.textText(batch)}</p>
          </div>
          <CodedText text={result.text} />
          <div className="row">
            <button className="btn" onClick={() => copy('text')} disabled={!allChecked}>
              <CopyIcon /> {copied === 'text' ? t.common.copied : tx.copyText}
            </button>
            <button
              className="btn btn--secondary"
              disabled={!allChecked}
              onClick={() => {
                downloadFile(result.text, textName, 'text/plain;charset=utf-8');
                setTextTaken(true);
                onKeyReady(result.key);
              }}
            >
              <DownloadIcon /> {tx.downloadTxt}
            </button>
          </div>
          {textTaken && !keySaved && (
            <Notice tone="warning" title={t.download.keyNotSavedTitle}>
              <p>{tx.keyNotSavedText}</p>
            </Notice>
          )}
        </div>
      </div>

      <div className="card stack">
        <div>
          <h3>{tx.promptHeading}</h3>
          <p className="small muted">{tx.promptHelp}</p>
        </div>
        <pre className="snippet">{prompt}</pre>
        <div className="row">
          <button className="btn btn--secondary btn--small" onClick={() => copy('prompt')}>
            <CopyIcon /> {copied === 'prompt' ? t.common.copied : t.download.copyPrompt}
          </button>
        </div>
      </div>

      <Notice title={tx.unlockTitle}>
        <p>{tx.unlockText((text) => <strong>{text}</strong>)}</p>
        <button className="btn btn--gold btn--small" onClick={goToReidentify}>
          {tx.goUnlock} <NextIcon />
        </button>
      </Notice>

      <div className="row">
        <button className="btn btn--secondary" onClick={onBack}>
          <BackIcon /> {tx.backNames}
        </button>
        <span className="spacer" />
        <button className="btn btn--secondary" onClick={onStartOver}>
          {tx.another}
        </button>
      </div>
    </div>
  );
}

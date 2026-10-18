import { useState } from 'react';
import { fileErrorText, keyErrorText, useI18n } from '../i18n';
import { copyText, downloadFile } from '../lib/download';
import { isEncryptedKeyFile, parseKeyFile } from '../lib/keyfile';
import { USER_GUIDE_URL } from '../lib/policy';
import {
  REIDENTIFY_ACCEPT,
  reidentifyFile,
  reidentifyText,
  type ReidentifiedFile,
  type ReidentifyStats,
} from '../lib/reidentify';
import type { KeyData } from '../lib/types';
import { DataPreview } from './DataPreview';
import { FileDrop } from './FileDrop';
import { CopyIcon, DownloadIcon, KeyIcon } from './Icons';
import { Notice } from './Notice';

interface Props {
  sessionKey: KeyData | null;
  onKeyLoaded: (key: KeyData) => void;
  openTutorial: () => void;
}

type Result =
  | { kind: 'file'; file: ReidentifiedFile; stats: ReidentifyStats }
  | { kind: 'text'; text: string; stats: ReidentifyStats };

export function ReidentifyFlow({ sessionKey, onKeyLoaded, openTutorial }: Props) {
  const { t } = useI18n();
  const [key, setKey] = useState<KeyData | null>(sessionKey);
  const [lockedKey, setLockedKey] = useState<{ name: string; text: string } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  // Errors are kept as they are, so their messages follow the chosen language.
  const [keyError, setKeyError] = useState<unknown>(null);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadKeyFile(file: File) {
    setKeyError(null);
    setResult(null);
    const text = await file.text();
    if (isEncryptedKeyFile(text)) {
      setLockedKey({ name: file.name, text });
      return;
    }
    try {
      const k = await parseKeyFile(text);
      setKey(k);
      onKeyLoaded(k);
    } catch (e) {
      setKeyError(e);
    }
  }

  async function unlock() {
    if (!lockedKey) return;
    setBusy(true);
    setKeyError(null);
    try {
      const k = await parseKeyFile(lockedKey.text, passphrase);
      setKey(k);
      onKeyLoaded(k);
      setLockedKey(null);
      setPassphrase('');
    } catch (e) {
      setKeyError(e);
    } finally {
      setBusy(false);
    }
  }

  async function processFile(file: File) {
    if (!key) return;
    setError(null);
    setBusy(true);
    try {
      const out = await reidentifyFile(file.name, await file.arrayBuffer(), key);
      setResult({ kind: 'file', file: out, stats: out.stats });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  function processText() {
    if (!key) return;
    const out = reidentifyText(pasted, key);
    setResult({ kind: 'text', text: out.text, stats: out.stats });
  }

  const tokenCount = key ? Object.keys(key.tokens).length : 0;

  return (
    <section aria-labelledby="reid-heading">
      <div className="eyebrow">{t.reidentify.eyebrow}</div>
      <h2 id="reid-heading">{t.reidentify.heading}</h2>
      <p className="lead">{t.reidentify.lead}</p>
      <p className="small muted help-line">
        {t.reidentify.help(
          (text) => (
            <button className="link-btn" onClick={openTutorial}>
              {text}
            </button>
          ),
          (text) => (
            <a href={USER_GUIDE_URL} target="_blank" rel="noopener">
              {text}
            </a>
          ),
        )}
      </p>

      <div className="stack">
        <div className="card stack">
          <h3>
            <KeyIcon /> {t.reidentify.keyHeading}
          </h3>
          {key ? (
            <div className="row">
              <span className="badge badge--low">{t.reidentify.keyLoaded}</span>
              <span className="small">
                {t.reidentify.keySummary(
                  tokenCount,
                  <strong>
                    <bdi>{key.sourceFile}</bdi>
                  </strong>,
                  key.batch,
                  t.formatDateTime(key.createdAt),
                )}
              </span>
              <span className="spacer" />
              <button
                className="link-btn small"
                onClick={() => {
                  setKey(null);
                  setResult(null);
                }}
              >
                {t.reidentify.otherKey}
              </button>
            </div>
          ) : lockedKey ? (
            <form
              className="row"
              style={{ alignItems: 'flex-end' }}
              onSubmit={(e) => {
                e.preventDefault();
                void unlock();
              }}
            >
              <label className="field">
                {t.reidentify.passphraseFor(lockedKey.name)}
                <input
                  type="password"
                  value={passphrase}
                  autoFocus
                  autoComplete="current-password"
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </label>
              <button className="btn" type="submit" disabled={!passphrase || busy}>
                {busy ? t.reidentify.unlocking : t.reidentify.unlock}
              </button>
              <button type="button" className="link-btn small" onClick={() => setLockedKey(null)}>
                {t.reidentify.cancel}
              </button>
            </form>
          ) : (
            <FileDrop
              accept=".json"
              title={t.reidentify.keyDropTitle}
              hint={t.reidentify.keyDropHint}
              onFile={loadKeyFile}
            />
          )}
          {keyError !== null && (
            <Notice tone="danger">
              <p>{keyErrorText(t, keyError)}</p>
            </Notice>
          )}
        </div>

        <div className="card stack" aria-disabled={!key} style={key ? undefined : { opacity: 0.55 }}>
          <h3>{t.reidentify.resultsHeading}</h3>
          <div className="tabs" role="tablist" style={{ gap: '0.5rem' }}>
            <button
              className={`btn btn--small ${mode === 'file' ? '' : 'btn--secondary'}`}
              role="tab"
              aria-selected={mode === 'file'}
              onClick={() => setMode('file')}
            >
              {t.reidentify.uploadFile}
            </button>
            <button
              className={`btn btn--small ${mode === 'paste' ? '' : 'btn--secondary'}`}
              role="tab"
              aria-selected={mode === 'paste'}
              onClick={() => setMode('paste')}
            >
              {t.reidentify.pasteText}
            </button>
          </div>
          {!key ? (
            <p className="small muted">{t.reidentify.loadKeyFirst}</p>
          ) : mode === 'file' ? (
            <FileDrop
              accept={REIDENTIFY_ACCEPT}
              title={busy ? t.reidentify.working : t.reidentify.resultsDropTitle}
              hint={t.reidentify.resultsDropHint}
              onFile={processFile}
            />
          ) : (
            <div className="stack">
              <label className="field">
                <span className="visually-hidden">{t.reidentify.pasteLabel}</span>
                {/* The AI's answer may be in either language; while empty, the placeholder follows the page. */}
                <textarea
                  dir={pasted ? 'auto' : undefined}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={t.reidentify.pastePlaceholder}
                />
              </label>
              <div>
                <button className="btn" onClick={processText} disabled={!pasted.trim()}>
                  {t.reidentify.putNamesBack}
                </button>
              </div>
            </div>
          )}
          {error !== null && (
            <Notice tone="danger" title={t.common.fileUnusable}>
              <p>{fileErrorText(t, error)}</p>
            </Notice>
          )}
        </div>

        {result && (
          <div className="card stack">
            <h3>{t.reidentify.resultHeading}</h3>
            <ResultSummary stats={result.stats} />
            {result.kind === 'file' ? (
              <>
                {result.file.previewTable ? (
                  <DataPreview table={result.file.previewTable} maxRows={10} />
                ) : (
                  <pre className="snippet">{result.file.previewText?.slice(0, 5000)}</pre>
                )}
                <div>
                  <button
                    className="btn"
                    onClick={() => downloadFile(result.file.data, result.file.fileName, result.file.mimeType)}
                  >
                    <DownloadIcon /> {t.reidentify.downloadFile(result.file.fileName)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <pre className="snippet">{result.text}</pre>
                <div className="row">
                  <button
                    className="btn"
                    onClick={async () => {
                      setCopied(await copyText(result.text));
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <CopyIcon /> {copied ? t.common.copied : t.reidentify.copyText}
                  </button>
                  <button
                    className="btn btn--secondary"
                    onClick={() => downloadFile(result.text, 'ai-results-reidentified.txt', 'text/plain;charset=utf-8')}
                  >
                    <DownloadIcon /> {t.reidentify.downloadTxt}
                  </button>
                </div>
              </>
            )}
            <Notice tone="gold" title={t.reidentify.remindersTitle}>
              <ul>
                {t.reidentify.reminders.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Notice>
          </div>
        )}
      </div>
    </section>
  );
}

function ResultSummary({ stats }: { stats: ReidentifyStats }) {
  const { t } = useI18n();
  const unknown = [...stats.unknown];
  return (
    <div className="stack">
      {stats.replaced > 0 ? (
        <Notice tone="success" title={t.reidentify.replaced(stats.replaced)}>
          <p>{t.reidentify.restored(stats.restored.size)}</p>
        </Notice>
      ) : (
        <Notice tone="warning" title={t.reidentify.noCodesTitle}>
          <p>{t.reidentify.noCodesText}</p>
        </Notice>
      )}
      {unknown.length > 0 && (
        <Notice tone="warning" title={t.reidentify.unknownTitle}>
          <p>{t.reidentify.unknown(unknown.slice(0, 12), Math.max(0, unknown.length - 12))}</p>
        </Notice>
      )}
    </div>
  );
}

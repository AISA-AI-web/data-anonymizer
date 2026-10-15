import { useState } from 'react';
import { copyText, downloadFile } from '../lib/download';
import { isEncryptedKeyFile, parseKeyFile } from '../lib/keyfile';
import { REIDENTIFY_REMINDERS } from '../lib/policy';
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
}

type Result =
  | { kind: 'file'; file: ReidentifiedFile; stats: ReidentifyStats }
  | { kind: 'text'; text: string; stats: ReidentifyStats };

export function ReidentifyFlow({ sessionKey, onKeyLoaded }: Props) {
  const [key, setKey] = useState<KeyData | null>(sessionKey);
  const [lockedKey, setLockedKey] = useState<{ name: string; text: string } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setKeyError(e instanceof Error ? e.message : 'That key file could not be read.');
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
      setKeyError(e instanceof Error ? e.message : 'The key could not be unlocked.');
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
      setError(e instanceof Error ? e.message : 'That file could not be read.');
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
      <div className="eyebrow">Step 2 of the round trip</div>
      <h2 id="reid-heading">Re-identify the AI’s results</h2>
      <p className="lead">
        Put the real names and IDs back into what the AI gave you. This works with spreadsheets (CSV, Excel), text and
        Markdown files, or text you paste in.
      </p>

      <div className="stack">
        <div className="card stack">
          <h3>
            <KeyIcon /> 1. Key
          </h3>
          {key ? (
            <div className="row">
              <span className="badge badge--low">Key loaded</span>
              <span className="small">
                {tokenCount.toLocaleString()} codes from <strong>{key.sourceFile}</strong>
                {key.batch && <> · batch {key.batch}</>} · created {new Date(key.createdAt).toLocaleString()}
              </span>
              <span className="spacer" />
              <button
                className="link-btn small"
                onClick={() => {
                  setKey(null);
                  setResult(null);
                }}
              >
                Use a different key file
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
                Passphrase for {lockedKey.name}
                <input
                  type="password"
                  value={passphrase}
                  autoFocus
                  autoComplete="current-password"
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </label>
              <button className="btn" type="submit" disabled={!passphrase || busy}>
                {busy ? 'Unlocking…' : 'Unlock key'}
              </button>
              <button type="button" className="link-btn small" onClick={() => setLockedKey(null)}>
                Cancel
              </button>
            </form>
          ) : (
            <FileDrop
              accept=".json"
              title="Drop your key file here, or click to choose it"
              hint="The PRIVATE-reidentification-key file you saved when you anonymized the data."
              onFile={loadKeyFile}
            />
          )}
          {keyError && (
            <Notice tone="danger">
              <p>{keyError}</p>
            </Notice>
          )}
        </div>

        <div className="card stack" aria-disabled={!key} style={key ? undefined : { opacity: 0.55 }}>
          <h3>2. The AI’s results</h3>
          <div className="tabs" role="tablist" style={{ gap: '0.5rem' }}>
            <button
              className={`btn btn--small ${mode === 'file' ? '' : 'btn--secondary'}`}
              role="tab"
              aria-selected={mode === 'file'}
              onClick={() => setMode('file')}
            >
              Upload a file
            </button>
            <button
              className={`btn btn--small ${mode === 'paste' ? '' : 'btn--secondary'}`}
              role="tab"
              aria-selected={mode === 'paste'}
              onClick={() => setMode('paste')}
            >
              Paste text
            </button>
          </div>
          {!key ? (
            <p className="small muted">Load the key first.</p>
          ) : mode === 'file' ? (
            <FileDrop
              accept={REIDENTIFY_ACCEPT}
              title={busy ? 'Working…' : 'Drop the AI’s output file here'}
              hint="CSV, TSV, Excel (.xlsx), .txt, .md, .json or .html"
              onFile={processFile}
            />
          ) : (
            <div className="stack">
              <label className="field">
                <span className="visually-hidden">AI response</span>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="Paste the AI’s answer here, e.g. “STU-004 and STU-017 need support with fractions…”"
                />
              </label>
              <div>
                <button className="btn" onClick={processText} disabled={!pasted.trim()}>
                  Put the names back
                </button>
              </div>
            </div>
          )}
          {error && (
            <Notice tone="danger" title="That file could not be used">
              <p>{error}</p>
            </Notice>
          )}
        </div>

        {result && (
          <div className="card stack">
            <h3>3. Result</h3>
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
                    <DownloadIcon /> Download {result.file.fileName}
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
                    <CopyIcon /> {copied ? 'Copied' : 'Copy text'}
                  </button>
                  <button
                    className="btn btn--secondary"
                    onClick={() => downloadFile(result.text, 'ai-results-reidentified.txt', 'text/plain;charset=utf-8')}
                  >
                    <DownloadIcon /> Download as .txt
                  </button>
                </div>
              </>
            )}
            <Notice tone="gold" title="Before you act on these results">
              <ul>
                {REIDENTIFY_REMINDERS.map((r) => (
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
  const unknown = [...stats.unknown];
  return (
    <div className="stack">
      {stats.replaced > 0 ? (
        <Notice tone="success" title={`${stats.replaced.toLocaleString()} codes replaced`}>
          <p>{stats.restored.size.toLocaleString()} different students/values were restored.</p>
        </Notice>
      ) : (
        <Notice tone="warning" title="No codes were found">
          <p>
            Check that you loaded the key that matches this data (the batch code on both file names should be the same)
            and that the AI kept the codes in its answer.
          </p>
        </Notice>
      )}
      {unknown.length > 0 && (
        <Notice tone="warning" title="Some codes are not in the key">
          <p>
            {unknown.slice(0, 12).join(', ')}
            {unknown.length > 12 && ` and ${unknown.length - 12} more`}. The AI may have changed or invented them, or they
            come from a different batch. Treat any results attached to them with caution.
          </p>
        </Notice>
      )}
    </div>
  );
}

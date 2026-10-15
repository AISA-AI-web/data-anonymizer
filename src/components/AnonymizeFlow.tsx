import { useEffect, useMemo, useState } from 'react';
import { anonymize, validatePlans, type AnonymizeResult } from '../lib/anonymize';
import { cellToString } from '../lib/cells';
import { suggestAll } from '../lib/detect';
import { copyText, downloadFile } from '../lib/download';
import { guessHeaderRow, readSpreadsheet, sheetToTable, tableToDelimited, tablesToXlsx } from '../lib/fileio';
import { serializeKey } from '../lib/keyfile';
import { aiPromptSnippet, ANONYMIZE_CHECKLIST, SUGGESTION_DISCLAIMER } from '../lib/policy';
import { combinationRisk, findLeftovers, QUASI_IDENTIFIERS } from '../lib/risk';
import { SAMPLE_CSV, SAMPLE_FILE_NAME } from '../lib/sample';
import type { ColumnPlan, KeyData, LoadedFile } from '../lib/types';
import { Checklist } from './Checklist';
import { ColumnPlanner } from './ColumnPlanner';
import { DataPreview } from './DataPreview';
import { FileDrop } from './FileDrop';
import { GettingStarted } from './GettingStarted';
import { BackIcon, CopyIcon, DownloadIcon, KeyIcon, NextIcon } from './Icons';
import { Notice } from './Notice';
import { Stepper } from './Stepper';

const STEPS = ['Upload', 'Choose columns', 'Review', 'Checklist & download'];
const ACCEPT = '.csv,.tsv,.tab,.txt,.xlsx,.xlsm,.xls';
const MAX_BYTES = 50 * 1024 * 1024;

const FORMAT_LABELS = { csv: 'CSV (comma-separated text)', tsv: 'TSV (tab-separated text)', xlsx: 'Excel workbook (.xlsx)' };

interface Props {
  onKeyReady: (key: KeyData) => void;
  goToReidentify: () => void;
  openTutorial: () => void;
}

export function AnonymizeFlow({ onKeyReady, goToReidentify, openTutorial }: Props) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [plans, setPlans] = useState<ColumnPlan[]>([]);
  const [scrubMentions, setScrubMentions] = useState(true);
  const [redactPatterns, setRedactPatterns] = useState(true);
  const [result, setResult] = useState<{ signature: string; value: AnonymizeResult } | null>(null);

  const table = useMemo(
    () => (loaded ? sheetToTable(loaded.sheets[sheetIndex], headerRow) : null),
    [loaded, sheetIndex, headerRow],
  );
  const suggestions = useMemo(() => (table ? suggestAll(table) : []), [table]);
  const suggestedPlans = useMemo(
    () => suggestions.map((s, index) => ({ index, header: table!.headers[index], action: s.action, prefix: s.prefix })),
    [suggestions, table],
  );
  useEffect(() => setPlans(suggestedPlans), [suggestedPlans]);

  async function load(fileName: string, buffer: ArrayBuffer) {
    setError(null);
    setBusy(true);
    try {
      if (buffer.byteLength > MAX_BYTES) throw new Error('This file is larger than 50 MB. Split it into smaller files first.');
      const file = await readSpreadsheet(fileName, buffer);
      setLoaded(file);
      setSheetIndex(0);
      setHeaderRow(guessHeaderRow(file.sheets[0].grid));
      setResult(null);
    } catch (e) {
      setLoaded(null);
      setError(e instanceof Error ? e.message : 'The file could not be read.');
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setLoaded(null);
    setResult(null);
    setError(null);
    setStep(0);
  }

  const planErrors = useMemo(() => validatePlans(plans), [plans]);

  function goToReview() {
    if (!table || !loaded) return;
    const signature = JSON.stringify({ f: loaded.fileName, sheetIndex, headerRow, plans, scrubMentions, redactPatterns });
    if (result?.signature !== signature) {
      const value = anonymize(table, plans, {
        sourceFile: loaded.fileName,
        scrubMentions,
        redactPatterns,
        categories: suggestions.map((s) => s.category),
      });
      setResult({ signature, value });
    }
    setStep(2);
  }

  return (
    <section aria-labelledby="anon-heading">
      <div className="eyebrow">Step 1 of the round trip</div>
      <h2 id="anon-heading">Anonymize a spreadsheet</h2>
      <p className="lead">
        Replace student names and IDs with codes, remove what the AI does not need, and save a private key so you can
        put the real names back into the AI’s results later.
      </p>
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="stack">
          {!loaded && (
            <GettingStarted
              onWatch={openTutorial}
              onTrySample={() => load(SAMPLE_FILE_NAME, new TextEncoder().encode(SAMPLE_CSV).buffer as ArrayBuffer)}
            />
          )}
          <FileDrop
            accept={ACCEPT}
            title={busy ? 'Reading file…' : 'Drop a spreadsheet here, or click to choose one'}
            hint="CSV, TSV or Excel (.xlsx). The file is opened in this browser only and is never uploaded."
            onFile={async (file) => load(file.name, await file.arrayBuffer())}
          />
          {error && (
            <Notice tone="danger" title="That file could not be used">
              <p>{error}</p>
            </Notice>
          )}
          {loaded && table && (
            <div className="card stack">
              <div className="row">
                <div>
                  <div className="eyebrow">File</div>
                  <strong>{loaded.fileName}</strong>
                </div>
                <span className="badge badge--neutral">Detected: {FORMAT_LABELS[loaded.format]}</span>
              </div>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                {loaded.sheets.length > 1 && (
                  <label className="field">
                    Sheet
                    <select
                      value={sheetIndex}
                      onChange={(e) => {
                        const i = Number(e.target.value);
                        setSheetIndex(i);
                        setHeaderRow(guessHeaderRow(loaded.sheets[i].grid));
                      }}
                    >
                      {loaded.sheets.map((s, i) => (
                        <option key={i} value={i}>
                          {s.name} ({s.grid.length} rows)
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  Row with the column headings
                  <select value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
                    {loaded.sheets[sheetIndex].grid.slice(0, 15).map((row, i) => (
                      <option key={i} value={i}>
                        Row {i + 1}:{' '}
                        {row
                          .map(cellToString)
                          .filter(Boolean)
                          .slice(0, 4)
                          .join(', ')
                          .slice(0, 60) || '(empty)'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {loaded.sheets.length > 1 && (
                <p className="small muted">
                  Only the selected sheet is anonymized and included in the download. Other sheets are left out.
                </p>
              )}
              <DataPreview table={table} maxRows={5} />
              <div className="row">
                <button className="btn btn--secondary" onClick={startOver}>
                  Choose a different file
                </button>
                <span className="spacer" />
                <button className="btn" onClick={() => setStep(1)} disabled={table.headers.length === 0}>
                  Next: choose columns <NextIcon />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 1 && table && (
        <div className="stack">
          <Notice tone="gold" title="Suggestions, not decisions">
            <p>{SUGGESTION_DISCLAIMER}</p>
          </Notice>
          <div className="row">
            <span className="small muted">
              {suggestions.filter((s) => s.risk === 'high').length} high-risk and{' '}
              {suggestions.filter((s) => s.risk === 'medium').length} “check” columns found in {table.headers.length}{' '}
              columns · {table.rows.length} rows
            </span>
            <span className="spacer" />
            <button className="btn btn--secondary btn--small" onClick={() => setPlans(suggestedPlans)}>
              Reset to suggestions
            </button>
          </div>
          <ColumnPlanner table={table} suggestions={suggestions} plans={plans} onChange={setPlans} />
          <div className="card card--tint stack">
            <label className="check">
              <input type="checkbox" checked={scrubMentions} onChange={(e) => setScrubMentions(e.target.checked)} />
              <span>
                <strong>Also replace names and IDs found inside other columns</strong>
                <br />
                <span className="small muted">
                  For example “Ahmed did well” becomes “STU-004 did well”. If several students share a first name, it
                  becomes [NAME]. It can occasionally replace an ordinary word that is also a name.
                </span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={redactPatterns} onChange={(e) => setRedactPatterns(e.target.checked)} />
              <span>
                <strong>Hide email addresses, phone numbers and Emirates ID numbers found in kept columns</strong>
                <br />
                <span className="small muted">They become [EMAIL], [PHONE] and [ID NUMBER]. These cannot be restored later.</span>
              </span>
            </label>
          </div>
          {planErrors.length > 0 && (
            <Notice tone="danger" title="Fix these before continuing">
              <ul>
                {planErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Notice>
          )}
          <div className="row">
            <button className="btn btn--secondary" onClick={() => setStep(0)}>
              <BackIcon /> Back
            </button>
            <span className="spacer" />
            <button className="btn" onClick={goToReview} disabled={planErrors.length > 0}>
              Next: review <NextIcon />
            </button>
          </div>
        </div>
      )}

      {step === 2 && table && result && (
        <Review
          result={result.value}
          plans={plans}
          categories={suggestions.map((s) => s.category)}
          risks={suggestions.map((s) => s.risk)}
          labels={suggestions.map((s) => s.label)}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && loaded && result && (
        <Download
          result={result.value}
          plans={plans}
          sourceFormat={loaded.format}
          onKeyReady={onKeyReady}
          onBack={() => setStep(2)}
          onStartOver={startOver}
          goToReidentify={goToReidentify}
        />
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Review */

function Review({
  result,
  plans,
  categories,
  risks,
  labels,
  onBack,
  onNext,
}: {
  result: AnonymizeResult;
  plans: ColumnPlan[];
  categories: string[];
  risks: string[];
  labels: string[];
  onBack: () => void;
  onNext: () => void;
}) {
  const { stats, table } = result;
  const outputPlans = plans.filter((p) => p.action !== 'remove');
  const leftovers = useMemo(() => findLeftovers(table), [table]);
  const quasi = outputPlans
    .map((p, outIndex) => ({ p, outIndex }))
    .filter(({ p }) => QUASI_IDENTIFIERS.includes(categories[p.index] as never))
    .map(({ outIndex }) => outIndex);
  const combo = useMemo(() => combinationRisk(table, quasi), [table, quasi.join(',')]);
  const keptHighRisk = plans.filter((p) => p.action === 'keep' && risks[p.index] === 'high');
  const keptFreeText = plans.filter((p) => p.action === 'keep' && categories[p.index] === 'freeText');
  const nothingChanged = stats.pseudonymized === 0 && stats.removed === 0 && stats.generalized === 0;

  return (
    <div className="stack">
      <div className="stats">
        <Stat n={table.rows.length} label="rows" />
        <Stat n={stats.pseudonymized} label="columns replaced with codes" />
        <Stat n={stats.tokens} label="codes created" />
        <Stat n={stats.removed} label="columns removed" />
        <Stat n={stats.generalized} label="dates reduced to year" />
        <Stat n={stats.scrubbedMentions + stats.redactedPatterns} label="names/details hidden in text" />
      </div>

      {nothingChanged && (
        <Notice tone="danger" title="Nothing has been anonymized">
          <p>Every column is set to “Keep as is”. Go back and choose what to replace or remove.</p>
        </Notice>
      )}
      {leftovers.length > 0 && (
        <Notice tone="danger" title="Contact details or ID numbers are still in the data">
          <ul>
            {leftovers.map((l) => (
              <li key={l.column + l.kind}>
                “{l.column}”: {l.count} {l.kind}
                {l.count === 1 ? '' : 's'} (e.g. {l.example})
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '0.5rem' }}>Go back and remove these columns, or turn on “Hide email addresses…”.</p>
        </Notice>
      )}
      {keptHighRisk.length > 0 && (
        <Notice tone="warning" title="You are keeping high-risk columns">
          <ul>
            {keptHighRisk.map((p) => (
              <li key={p.index}>
                {p.header} ({labels[p.index]})
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '0.5rem' }}>Only keep these if the analysis truly needs them and the sharing is approved.</p>
        </Notice>
      )}
      {combo && combo.uniqueRows > 0 && (
        <Notice tone="warning" title="Some students could still be singled out">
          <p>
            {combo.uniqueRows} of {combo.totalRows} rows ({Math.round((combo.uniqueRows / combo.totalRows) * 100)}%)
            are the only row with their combination of <strong>{combo.columns.join(' + ')}</strong>
            {combo.smallGroupRows > combo.uniqueRows &&
              `, and ${combo.smallGroupRows} rows are in groups smaller than ${combo.threshold}`}
            . Someone who knows the class could work out who they are. Consider removing one of these columns or keeping
            only what the analysis needs.
          </p>
        </Notice>
      )}
      {keptFreeText.length > 0 && (
        <Notice tone="warning" title="Read the free-text columns yourself">
          <p>
            {keptFreeText.map((p) => `“${p.header}”`).join(', ')} may still mention people, places or events that
            identify a student. The tool only catches names it knows about from this file.
          </p>
        </Notice>
      )}
      {stats.yearFailures > 0 && (
        <Notice tone="warning" title="Some dates could not be read">
          <p>{stats.yearFailures} values in “year only” columns had no recognisable year and were left blank.</p>
        </Notice>
      )}

      <div>
        <h3>Preview of what will be shared</h3>
        <p className="small muted">
          Codes are highlighted. Check the column headings too: they are shared with the AI.
        </p>
        <DataPreview table={table} maxRows={10} highlight />
      </div>

      <div className="row">
        <button className="btn btn--secondary" onClick={onBack}>
          <BackIcon /> Back to columns
        </button>
        <span className="spacer" />
        <button className="btn" onClick={onNext} disabled={nothingChanged}>
          Next: checklist <NextIcon />
        </button>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <div className="stat__number">{n.toLocaleString()}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

/* -------------------------------------------------------------- Download */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function Download({
  result,
  plans,
  sourceFormat,
  onKeyReady,
  onBack,
  onStartOver,
  goToReidentify,
}: {
  result: AnonymizeResult;
  plans: ColumnPlan[];
  sourceFormat: LoadedFile['format'];
  onKeyReady: (key: KeyData) => void;
  onBack: () => void;
  onStartOver: () => void;
  goToReidentify: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [format, setFormat] = useState<'csv' | 'xlsx'>(sourceFormat === 'xlsx' ? 'xlsx' : 'csv');
  const [keySaved, setKeySaved] = useState(false);
  const [dataSaved, setDataSaved] = useState(false);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const batch = result.key.batch ?? 'DATA';
  // A neutral name: the original file name might itself contain a student's name.
  const dataName = `anonymized-data-${today()}-${batch}.${format}`;
  const keyName = `PRIVATE-reidentification-key-${today()}-${batch}.json`;

  const allChecked = ANONYMIZE_CHECKLIST.every((i) => checked.has(i.id));
  const passphraseProblem =
    passphrase && passphrase.length < 8
      ? 'Use at least 8 characters.'
      : passphrase && passphrase !== confirm
        ? 'The two passphrases do not match.'
        : null;

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
      const text = await serializeKey(result.key, passphrase || undefined);
      downloadFile(text, keyName, 'application/json');
      setKeySaved(true);
      onKeyReady(result.key);
    } finally {
      setWorking(false);
    }
  }

  async function saveData() {
    setWorking(true);
    try {
      if (format === 'xlsx') {
        const data = await tablesToXlsx([{ name: 'Anonymized', table: result.table }]);
        downloadFile(data, dataName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else {
        downloadFile(tableToDelimited(result.table), dataName, 'text/csv;charset=utf-8');
      }
      setDataSaved(true);
      onKeyReady(result.key);
    } finally {
      setWorking(false);
    }
  }

  const prompt = aiPromptSnippet(
    result.key.columns,
    plans.filter((p) => p.action === 'remove').map((p) => p.header),
  );

  return (
    <div className="stack">
      <div className="card">
        <h3>Before you share anything, confirm each point</h3>
        <p className="small muted">
          The downloads unlock once every box is ticked. The tool cannot check these for you, so this is where your
          judgement counts.
        </p>
        <Checklist items={ANONYMIZE_CHECKLIST} checked={checked} onToggle={toggle} />
      </div>

      <div className="grid-2">
        <div className="card stack">
          <div>
            <div className="eyebrow">Keep private</div>
            <h3>
              <KeyIcon /> 1. Save the key file
            </h3>
            <p className="small">
              The key links each code back to the real student. Without it you cannot put names back into the AI’s
              results. <strong>Never upload it to an AI tool.</strong> Store it in school-approved storage.
            </p>
          </div>
          <label className="field">
            Passphrase (recommended)
            <input
              type="password"
              value={passphrase}
              autoComplete="new-password"
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Locks the key file"
            />
          </label>
          {passphrase && (
            <label className="field">
              Type the passphrase again
              <input
                type="password"
                value={confirm}
                autoComplete="new-password"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}
          {passphraseProblem && <p className="small" style={{ color: 'var(--risk-high)' }}>{passphraseProblem}</p>}
          <p className="small muted">
            If you forget the passphrase, the key cannot be opened. Nobody can recover it.
          </p>
          <div>
            <button
              className="btn btn--secondary"
              onClick={saveKey}
              disabled={!allChecked || !!passphraseProblem || working}
            >
              <DownloadIcon /> Download key file
            </button>
            {keySaved && <p className="small" style={{ marginTop: '0.5rem' }}>✓ Saved as {keyName}</p>}
          </div>
        </div>

        <div className="card stack">
          <div>
            <div className="eyebrow">Share with the AI</div>
            <h3>2. Download the anonymized file</h3>
            <p className="small">This is the only file to upload to your approved AI tool.</p>
          </div>
          <label className="field">
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'xlsx')}>
              <option value="csv">CSV (works with every AI tool)</option>
              <option value="xlsx">Excel (.xlsx)</option>
            </select>
          </label>
          <p className="small muted">
            Saved as <code>{dataName}</code>. The name is neutral on purpose, because file names can identify students
            too. Batch code {batch} links it to the matching key.
          </p>
          <div>
            <button className="btn" onClick={saveData} disabled={!allChecked || working}>
              <DownloadIcon /> Download anonymized file
            </button>
            {dataSaved && <p className="small" style={{ marginTop: '0.5rem' }}>✓ Saved as {dataName}</p>}
          </div>
          {dataSaved && !keySaved && (
            <Notice tone="warning" title="You have not saved the key yet">
              <p>Without the key file you will not be able to put the names back after this page is closed.</p>
            </Notice>
          )}
        </div>
      </div>

      <div className="card stack">
        <div>
          <h3>3. Paste these instructions into the AI with your file</h3>
          <p className="small muted">They tell the AI to keep the codes intact so the results can be matched back.</p>
        </div>
        <pre className="snippet">{prompt}</pre>
        <div className="row">
          <button
            className="btn btn--secondary btn--small"
            onClick={async () => {
              setCopied(await copyText(prompt));
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <CopyIcon /> {copied ? 'Copied' : 'Copy instructions'}
          </button>
        </div>
      </div>

      <Notice title="When the AI has finished">
        <p>
          Download or copy the AI’s results, then use <strong>Re-identify results</strong> to swap the codes back to
          real names. The key stays in this tab until you close or refresh it.
        </p>
        <button className="btn btn--gold btn--small" onClick={goToReidentify}>
          Go to Re-identify results <NextIcon />
        </button>
      </Notice>

      <div className="row">
        <button className="btn btn--secondary" onClick={onBack}>
          <BackIcon /> Back to review
        </button>
        <span className="spacer" />
        <button className="btn btn--secondary" onClick={onStartOver}>
          Anonymize another file
        </button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { fileErrorText, useI18n } from '../i18n';
import { anonymize, validatePlans, type AnonymizeResult } from '../lib/anonymize';
import { cellToString } from '../lib/cells';
import { suggestAll } from '../lib/detect';
import { copyText, downloadFile } from '../lib/download';
import {
  guessHeaderRow,
  readSpreadsheet,
  sheetToTable,
  tableToDelimited,
  tablesToXlsx,
  UnsupportedFileError,
} from '../lib/fileio';
import { serializeKey } from '../lib/keyfile';
import { ANONYMIZE_CHECKLIST } from '../lib/policy';
import { combinationRisk, findLeftovers, QUASI_IDENTIFIERS } from '../lib/risk';
import { SAMPLE_CSV, SAMPLE_FILE_NAME } from '../lib/sample';
import type { Category, ColumnPlan, KeyData, LoadedFile, Risk } from '../lib/types';
import { Checklist } from './Checklist';
import { ColumnPlanner } from './ColumnPlanner';
import { DataPreview } from './DataPreview';
import { FileDrop } from './FileDrop';
import { GettingStarted } from './GettingStarted';
import { BackIcon, CopyIcon, DownloadIcon, KeyIcon, NextIcon } from './Icons';
import { Notice } from './Notice';
import { Stepper } from './Stepper';

const ACCEPT = '.csv,.tsv,.tab,.txt,.xlsx,.xlsm,.xls';
const MAX_BYTES = 50 * 1024 * 1024;

interface Props {
  onKeyReady: (key: KeyData) => void;
  goToReidentify: () => void;
  openTutorial: () => void;
}

export function AnonymizeFlow({ onKeyReady, goToReidentify, openTutorial }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [busy, setBusy] = useState(false);
  // Kept as the error itself, so its message follows the chosen language.
  const [error, setError] = useState<unknown>(null);
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
      if (buffer.byteLength > MAX_BYTES) {
        throw new UnsupportedFileError('tooLarge', 'This file is larger than 50 MB. Split it into smaller files first.');
      }
      const file = await readSpreadsheet(fileName, buffer);
      setLoaded(file);
      setSheetIndex(0);
      setHeaderRow(guessHeaderRow(file.sheets[0].grid));
      setResult(null);
    } catch (e) {
      setLoaded(null);
      setError(e);
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
      <div className="eyebrow">{t.anonymize.eyebrow}</div>
      <h2 id="anon-heading">{t.anonymize.heading}</h2>
      <p className="lead">{t.anonymize.lead}</p>
      <Stepper steps={t.anonymize.steps} current={step} />

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
            title={busy ? t.anonymize.reading : t.anonymize.dropTitle}
            hint={t.anonymize.dropHint}
            onFile={async (file) => load(file.name, await file.arrayBuffer())}
          />
          {error !== null && (
            <Notice tone="danger" title={t.common.fileUnusable}>
              <p>{fileErrorText(t, error)}</p>
            </Notice>
          )}
          {loaded && table && (
            <div className="card stack">
              <div className="row">
                <div>
                  <div className="eyebrow">{t.anonymize.file}</div>
                  <strong>
                    <bdi>{loaded.fileName}</bdi>
                  </strong>
                </div>
                <span className="badge badge--neutral">{t.anonymize.detected(t.anonymize.formats[loaded.format])}</span>
              </div>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                {loaded.sheets.length > 1 && (
                  <label className="field">
                    {t.anonymize.sheet}
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
                          {t.anonymize.sheetOption(s.name, s.grid.length)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  {t.anonymize.headerRow}
                  <select value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
                    {loaded.sheets[sheetIndex].grid.slice(0, 15).map((row, i) => (
                      <option key={i} value={i}>
                        {t.anonymize.headerRowOption(
                          i + 1,
                          row
                            .map(cellToString)
                            .filter(Boolean)
                            .slice(0, 4)
                            .join(', ')
                            .slice(0, 60) || t.common.empty,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {loaded.sheets.length > 1 && <p className="small muted">{t.anonymize.otherSheets}</p>}
              <DataPreview table={table} maxRows={5} />
              <div className="row">
                <button className="btn btn--secondary" onClick={startOver}>
                  {t.anonymize.chooseAnother}
                </button>
                <span className="spacer" />
                <button className="btn" onClick={() => setStep(1)} disabled={table.headers.length === 0}>
                  {t.anonymize.nextColumns} <NextIcon />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 1 && table && (
        <div className="stack">
          <Notice tone="gold" title={t.anonymize.suggestionsTitle}>
            <p>{t.guide.disclaimer}</p>
          </Notice>
          <div className="row">
            <span className="small muted">
              {t.anonymize.columnSummary(
                suggestions.filter((s) => s.risk === 'high').length,
                suggestions.filter((s) => s.risk === 'medium').length,
                table.headers.length,
                table.rows.length,
              )}
            </span>
            <span className="spacer" />
            <button className="btn btn--secondary btn--small" onClick={() => setPlans(suggestedPlans)}>
              {t.anonymize.resetSuggestions}
            </button>
          </div>
          <ColumnPlanner table={table} suggestions={suggestions} plans={plans} onChange={setPlans} />
          <div className="card card--tint stack">
            <label className="check">
              <input type="checkbox" checked={scrubMentions} onChange={(e) => setScrubMentions(e.target.checked)} />
              <span>
                <strong>{t.anonymize.scrubTitle}</strong>
                <br />
                <span className="small muted">{t.anonymize.scrubHelp}</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={redactPatterns} onChange={(e) => setRedactPatterns(e.target.checked)} />
              <span>
                <strong>{t.anonymize.redactTitle}</strong>
                <br />
                <span className="small muted">{t.anonymize.redactHelp}</span>
              </span>
            </label>
          </div>
          {planErrors.length > 0 && (
            <Notice tone="danger" title={t.anonymize.fixFirst}>
              <ul>
                {planErrors.map((e, i) => (
                  <li key={i}>{t.anonymize.planError(e)}</li>
                ))}
              </ul>
            </Notice>
          )}
          <div className="row">
            <button className="btn btn--secondary" onClick={() => setStep(0)}>
              <BackIcon /> {t.common.back}
            </button>
            <span className="spacer" />
            <button className="btn" onClick={goToReview} disabled={planErrors.length > 0}>
              {t.anonymize.nextReview} <NextIcon />
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
  onBack,
  onNext,
}: {
  result: AnonymizeResult;
  plans: ColumnPlan[];
  categories: Category[];
  risks: Risk[];
  onBack: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const { stats, table } = result;
  const outputPlans = plans.filter((p) => p.action !== 'remove');
  const leftovers = useMemo(() => findLeftovers(table), [table]);
  const quasi = outputPlans
    .map((p, outIndex) => ({ p, outIndex }))
    .filter(({ p }) => QUASI_IDENTIFIERS.includes(categories[p.index]))
    .map(({ outIndex }) => outIndex);
  const combo = useMemo(() => combinationRisk(table, quasi), [table, quasi.join(',')]);
  const keptHighRisk = plans.filter((p) => p.action === 'keep' && risks[p.index] === 'high');
  const keptFreeText = plans.filter((p) => p.action === 'keep' && categories[p.index] === 'freeText');
  const nothingChanged = stats.pseudonymized === 0 && stats.removed === 0 && stats.generalized === 0;

  return (
    <div className="stack">
      <div className="stats">
        <Stat n={table.rows.length} label={t.review.stats.rows} />
        <Stat n={stats.pseudonymized} label={t.review.stats.pseudonymized} />
        <Stat n={stats.tokens} label={t.review.stats.tokens} />
        <Stat n={stats.removed} label={t.review.stats.removed} />
        <Stat n={stats.generalized} label={t.review.stats.generalized} />
        <Stat n={stats.scrubbedMentions + stats.redactedPatterns} label={t.review.stats.hidden} />
      </div>

      {nothingChanged && (
        <Notice tone="danger" title={t.review.nothingTitle}>
          <p>{t.review.nothingText}</p>
        </Notice>
      )}
      {leftovers.length > 0 && (
        <Notice tone="danger" title={t.review.leftoversTitle}>
          <ul>
            {leftovers.map((l) => (
              <li key={l.column + l.kind}>{t.review.leftover(l)}</li>
            ))}
          </ul>
          <p style={{ marginTop: '0.5rem' }}>{t.review.leftoversFix}</p>
        </Notice>
      )}
      {keptHighRisk.length > 0 && (
        <Notice tone="warning" title={t.review.keptHighRiskTitle}>
          <ul>
            {keptHighRisk.map((p) => (
              <li key={p.index}>
                <bdi>{p.header}</bdi> ({t.categories[categories[p.index]].label})
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '0.5rem' }}>{t.review.keptHighRiskText}</p>
        </Notice>
      )}
      {combo && combo.uniqueRows > 0 && (
        <Notice tone="warning" title={t.review.comboTitle}>
          <p>
            {t.review.combo(
              combo.uniqueRows,
              combo.totalRows,
              <strong>
                <bdi>{combo.columns.join(' + ')}</bdi>
              </strong>,
              combo.smallGroupRows,
              combo.threshold,
            )}
          </p>
        </Notice>
      )}
      {keptFreeText.length > 0 && (
        <Notice tone="warning" title={t.review.freeTextTitle}>
          <p>{t.review.freeText(keptFreeText.map((p) => p.header))}</p>
        </Notice>
      )}
      {stats.yearFailures > 0 && (
        <Notice tone="warning" title={t.review.yearFailuresTitle}>
          <p>{t.review.yearFailures(stats.yearFailures)}</p>
        </Notice>
      )}

      <div>
        <h3>{t.review.previewHeading}</h3>
        <p className="small muted">{t.review.previewHelp}</p>
        <DataPreview table={table} maxRows={10} highlight />
      </div>

      <div className="row">
        <button className="btn btn--secondary" onClick={onBack}>
          <BackIcon /> {t.review.backColumns}
        </button>
        <span className="spacer" />
        <button className="btn" onClick={onNext} disabled={nothingChanged}>
          {t.review.nextChecklist} <NextIcon />
        </button>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  const { t } = useI18n();
  return (
    <div className="stat">
      <div className="stat__number">{t.formatNumber(n)}</div>
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
  const { t } = useI18n();
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
      ? t.download.passphraseShort
      : passphrase && passphrase !== confirm
        ? t.download.passphraseMismatch
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

  // In the chosen language, on the assumption that the conversation with the AI is too.
  const prompt = t.aiPrompt(
    result.key.columns,
    plans.filter((p) => p.action === 'remove').map((p) => p.header),
  );

  return (
    <div className="stack">
      <div className="card">
        <h3>{t.checklist.heading}</h3>
        <p className="small muted">{t.checklist.help}</p>
        <Checklist items={ANONYMIZE_CHECKLIST} checked={checked} onToggle={toggle} />
      </div>

      <div className="grid-2">
        <div className="card stack">
          <div>
            <div className="eyebrow">{t.download.keyEyebrow}</div>
            <h3>
              <KeyIcon /> {t.download.keyHeading}
            </h3>
            <p className="small">{t.download.keyText((text) => <strong>{text}</strong>)}</p>
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
              <input
                type="password"
                value={confirm}
                autoComplete="new-password"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}
          {passphraseProblem && <p className="small" style={{ color: 'var(--risk-high)' }}>{passphraseProblem}</p>}
          <p className="small muted">{t.download.passphraseWarning}</p>
          <div>
            <button
              className="btn btn--secondary"
              onClick={saveKey}
              disabled={!allChecked || !!passphraseProblem || working}
            >
              <DownloadIcon /> {t.download.downloadKey}
            </button>
            {keySaved && <p className="small" style={{ marginTop: '0.5rem' }}>{t.download.savedAs(keyName)}</p>}
          </div>
        </div>

        <div className="card stack">
          <div>
            <div className="eyebrow">{t.download.dataEyebrow}</div>
            <h3>{t.download.dataHeading}</h3>
            <p className="small">{t.download.dataText}</p>
          </div>
          <label className="field">
            {t.download.format}
            <select value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'xlsx')}>
              <option value="csv">{t.download.formatCsv}</option>
              <option value="xlsx">{t.download.formatXlsx}</option>
            </select>
          </label>
          <p className="small muted">{t.download.dataName(<code>{dataName}</code>, batch)}</p>
          <div>
            <button className="btn" onClick={saveData} disabled={!allChecked || working}>
              <DownloadIcon /> {t.download.downloadData}
            </button>
            {dataSaved && <p className="small" style={{ marginTop: '0.5rem' }}>{t.download.savedAs(dataName)}</p>}
          </div>
          {dataSaved && !keySaved && (
            <Notice tone="warning" title={t.download.keyNotSavedTitle}>
              <p>{t.download.keyNotSavedText}</p>
            </Notice>
          )}
        </div>
      </div>

      <div className="card stack">
        <div>
          <h3>{t.download.promptHeading}</h3>
          <p className="small muted">{t.download.promptHelp}</p>
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
            <CopyIcon /> {copied ? t.common.copied : t.download.copyPrompt}
          </button>
        </div>
      </div>

      <Notice title={t.download.finishedTitle}>
        <p>{t.download.finishedText((text) => <strong>{text}</strong>)}</p>
        <button className="btn btn--gold btn--small" onClick={goToReidentify}>
          {t.download.goReidentify} <NextIcon />
        </button>
      </Notice>

      <div className="row">
        <button className="btn btn--secondary" onClick={onBack}>
          <BackIcon /> {t.download.backReview}
        </button>
        <span className="spacer" />
        <button className="btn btn--secondary" onClick={onStartOver}>
          {t.download.another}
        </button>
      </div>
    </div>
  );
}

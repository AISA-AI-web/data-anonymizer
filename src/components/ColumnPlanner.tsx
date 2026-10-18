import { useI18n, type Messages } from '../i18n';
import { cellToString, isEmpty } from '../lib/cells';
import type { Suggestion } from '../lib/detect';
import type { Action, ColumnPlan, Table } from '../lib/types';

const ACTIONS: Action[] = ['keep', 'pseudonymize', 'remove', 'year'];

function reason(t: Messages, s: Suggestion): string {
  const parts = [t.categories[s.category].reason];
  if (s.empty) parts.unshift(t.columns.reasonEmpty);
  if (s.basis === 'values') parts.unshift(t.columns.reasonFromValues);
  if (s.notDates) parts.push(t.columns.reasonNotDates);
  return parts.join(' ');
}

function samples(table: Table, index: number, empty: string): string {
  const seen = new Set<string>();
  for (const row of table.rows) {
    const cell = row[index];
    if (isEmpty(cell)) continue;
    const text = cellToString(cell).trim();
    seen.add(text.length > 28 ? text.slice(0, 27) + '…' : text);
    if (seen.size === 3) break;
  }
  return seen.size ? [...seen].join(' · ') : empty;
}

interface Props {
  table: Table;
  suggestions: Suggestion[];
  plans: ColumnPlan[];
  onChange: (plans: ColumnPlan[]) => void;
}

export function ColumnPlanner({ table, suggestions, plans, onChange }: Props) {
  const { t } = useI18n();
  const update = (index: number, patch: Partial<ColumnPlan>) =>
    onChange(plans.map((p) => (p.index === index ? { ...p, ...patch } : p)));

  return (
    <div className="table-wrap">
      <table className="columns-table">
        <thead>
          <tr>
            <th>{t.columns.column}</th>
            <th>{t.columns.thinks}</th>
            <th>{t.columns.todo}</th>
            <th>{t.columns.prefix}</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => {
            const s = suggestions[plan.index];
            const changed = plan.action !== s.action;
            const canYear = s.dateLike || plan.action === 'year';
            const id = `col-${plan.index}`;
            const sample = samples(table, plan.index, t.common.empty);
            return (
              <tr key={plan.index} className={changed ? 'changed' : undefined}>
                <td>
                  <div className="colname" id={`${id}-name`} dir="auto">
                    {plan.header}
                  </div>
                  <div className="samples" title={sample} dir="auto">
                    {sample}
                  </div>
                </td>
                <td>
                  <div className="row" style={{ gap: '0.4rem' }}>
                    <span className={`badge badge--${s.risk}`}>{t.columns.risks[s.risk]}</span>
                    <span className="badge badge--neutral">{t.categories[s.category].label}</span>
                  </div>
                  <div className="reason">
                    {reason(t, s)}
                    {changed && (
                      <>
                        {' '}
                        <strong>{t.columns.suggested(s.action)}</strong>
                      </>
                    )}
                  </div>
                </td>
                <td>
                  <select
                    aria-labelledby={`${id}-name`}
                    value={plan.action}
                    onChange={(e) => update(plan.index, { action: e.target.value as Action })}
                  >
                    {ACTIONS.filter((a) => a !== 'year' || canYear).map((a) => (
                      <option key={a} value={a}>
                        {t.columns.actions[a]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {plan.action === 'pseudonymize' ? (
                    <label className="field-inline">
                      <span className="visually-hidden">{t.columns.prefixFor(plan.header)}</span>
                      <input
                        type="text"
                        dir="ltr"
                        value={plan.prefix}
                        maxLength={8}
                        spellCheck={false}
                        onChange={(e) =>
                          update(plan.index, { prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })
                        }
                      />
                      <span className="token">{plan.prefix || '???'}-001</span>
                    </label>
                  ) : (
                    <span className="muted small">–</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

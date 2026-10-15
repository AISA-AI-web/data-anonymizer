import { cellToString, isEmpty } from '../lib/cells';
import type { Suggestion } from '../lib/detect';
import type { Action, ColumnPlan, Table } from '../lib/types';

const ACTION_LABELS: Record<Action, string> = {
  keep: 'Keep as is',
  pseudonymize: 'Replace with codes (reversible)',
  remove: 'Remove column',
  year: 'Keep year only',
};

const RISK_LABELS = { high: 'High risk', medium: 'Check', low: 'Low risk' } as const;

function samples(table: Table, index: number): string {
  const seen = new Set<string>();
  for (const row of table.rows) {
    const cell = row[index];
    if (isEmpty(cell)) continue;
    const text = cellToString(cell).trim();
    seen.add(text.length > 28 ? text.slice(0, 27) + '…' : text);
    if (seen.size === 3) break;
  }
  return seen.size ? [...seen].join(' · ') : '(empty)';
}

interface Props {
  table: Table;
  suggestions: Suggestion[];
  plans: ColumnPlan[];
  onChange: (plans: ColumnPlan[]) => void;
}

export function ColumnPlanner({ table, suggestions, plans, onChange }: Props) {
  const update = (index: number, patch: Partial<ColumnPlan>) =>
    onChange(plans.map((p) => (p.index === index ? { ...p, ...patch } : p)));

  return (
    <div className="table-wrap">
      <table className="columns-table">
        <thead>
          <tr>
            <th>Column</th>
            <th>What the tool thinks</th>
            <th>What to do</th>
            <th>Code prefix</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => {
            const s = suggestions[plan.index];
            const changed = plan.action !== s.action;
            const canYear = s.dateLike || plan.action === 'year';
            const id = `col-${plan.index}`;
            return (
              <tr key={plan.index} className={changed ? 'changed' : undefined}>
                <td>
                  <div className="colname" id={`${id}-name`}>
                    {plan.header}
                  </div>
                  <div className="samples" title={samples(table, plan.index)}>
                    {samples(table, plan.index)}
                  </div>
                </td>
                <td>
                  <div className="row" style={{ gap: '0.4rem' }}>
                    <span className={`badge badge--${s.risk}`}>{RISK_LABELS[s.risk]}</span>
                    <span className="badge badge--neutral">{s.label}</span>
                  </div>
                  <div className="reason">
                    {s.reason}
                    {changed && (
                      <>
                        {' '}
                        <strong>Suggested: {ACTION_LABELS[s.action].toLowerCase()}.</strong>
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
                    {(Object.keys(ACTION_LABELS) as Action[])
                      .filter((a) => a !== 'year' || canYear)
                      .map((a) => (
                        <option key={a} value={a}>
                          {ACTION_LABELS[a]}
                        </option>
                      ))}
                  </select>
                </td>
                <td>
                  {plan.action === 'pseudonymize' ? (
                    <label className="field-inline">
                      <span className="visually-hidden">Code prefix for {plan.header}</span>
                      <input
                        type="text"
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

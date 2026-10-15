import { cellToString } from '../lib/cells';
import type { Table } from '../lib/types';

const TOKEN_RE = /^[A-Z][A-Z0-9]{1,7}-\d{3,}$/;
const MARKER_RE = /(\[(?:NAME|EMAIL|PHONE|ID NUMBER)\]|\b[A-Z][A-Z0-9]{1,7}-\d{3,}\b)/g;

/** Renders a cell, highlighting codes and redaction markers so the user can see what changed. */
function renderCell(text: string, highlight: boolean) {
  if (!highlight || !text) return text;
  if (TOKEN_RE.test(text)) return <span className="token">{text}</span>;
  const parts = text.split(MARKER_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className={part.startsWith('[') ? 'redacted' : 'token'}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function DataPreview({ table, maxRows = 8, highlight = false }: { table: Table; maxRows?: number; highlight?: boolean }) {
  const rows = table.rows.slice(0, maxRows);
  return (
    <div>
      <div className="table-wrap">
        <table className="preview">
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const text = cellToString(cell);
                  return (
                    <td key={c} title={text}>
                      {renderCell(text, highlight)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ marginTop: '0.4rem' }}>
        Showing {rows.length} of {table.rows.length} rows · {table.headers.length} columns
      </p>
    </div>
  );
}

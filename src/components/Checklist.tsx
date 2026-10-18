import { useI18n } from '../i18n';
import type { ChecklistItem } from '../lib/policy';

interface Props {
  items: ChecklistItem[];
  checked: Set<string>;
  onToggle: (id: string) => void;
}

export function Checklist({ items, checked, onToggle }: Props) {
  const { t } = useI18n();
  const groups = [...new Set(items.map((i) => i.group))];
  const done = items.filter((i) => checked.has(i.id)).length;
  return (
    <div>
      <div className="row" style={{ marginBottom: '0.5rem' }}>
        <span className="small muted">{t.checklist.progress(done, items.length)}</span>
      </div>
      <div className="progress" aria-hidden="true">
        <div style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <div style={{ marginTop: '1rem' }}>
        {groups.map((group) => (
          <fieldset key={group} className="checklist-group">
            <legend className="eyebrow">{t.checklist.groups[group]}</legend>
            <ul className="checklist">
              {items
                .filter((i) => i.group === group)
                .map((item) => (
                  <li key={item.id}>
                    <label className="check">
                      <input type="checkbox" checked={checked.has(item.id)} onChange={() => onToggle(item.id)} />
                      <span>{t.checklist.items[item.id]}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

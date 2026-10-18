import { useI18n } from '../i18n';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const { t } = useI18n();
  return (
    <ol className="stepper" aria-label={t.common.progress}>
      {steps.map((label, i) => (
        <li key={label} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="num">{i < current ? '✓' : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((label, i) => (
        <li key={label} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="num">{i < current ? '✓' : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

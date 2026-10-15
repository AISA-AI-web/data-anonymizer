import type { ReactNode } from 'react';

type Tone = 'info' | 'gold' | 'warning' | 'danger' | 'success';

export function Notice({ tone = 'info', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <div className={`notice${tone === 'info' ? '' : ` notice--${tone}`}`} role={tone === 'danger' ? 'alert' : undefined}>
      {title && <div className="notice__title">{title}</div>}
      {children}
    </div>
  );
}

import { ReactNode } from 'react';

interface Props { title: string; children: ReactNode; error?: string; }

export function PanelShell({ title, children, error }: Props) {
  return (
    <div className="bg-jarvis-grid/30 border border-jarvis-grid rounded p-4 flex flex-col gap-3">
      <div className="text-xs tracking-widest text-text-dim uppercase">{title}</div>
      {error
        ? <div className="text-xs text-critical">{error}</div>
        : children}
    </div>
  );
}

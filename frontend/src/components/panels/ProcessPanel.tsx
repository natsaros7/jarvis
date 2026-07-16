import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function ProcessPanel({ scan }: Props) {
  const load = scan.metrics['load1m'] as number ?? 0;

  const procs = Array.from({ length: 5 }, (_, i) => ({
    name: (scan.metrics[`proc${i}_name`] as string) ?? '',
    cpu: (scan.metrics[`proc${i}_cpu`] as string) ?? '0',
  })).filter(p => p.name);

  return (
    <PanelShell title="Process">
      <ArcMeter score={scan.score} label="load avg" value={load.toFixed(2)} />
      <div className="text-xs text-text-dim space-y-0.5">
        {procs.slice(0, 4).map((p, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="truncate max-w-[80px]">{p.name}</span>
            <span className="shrink-0">{p.cpu}% CPU</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

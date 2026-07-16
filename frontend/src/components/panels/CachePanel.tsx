import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function CachePanel({ scan }: Props) {
  const totalGB = scan.metrics['totalGB'] as number ?? 0;
  const items = Object.entries(scan.metrics)
    .filter(([k]) => k !== 'totalGB')
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 4);

  return (
    <PanelShell title="Caches">
      <ArcMeter score={scan.score} label="total" value={`${totalGB} GB`} />
      <div className="text-xs text-text-dim space-y-0.5">
        {items.map(([key, val]) => (
          <div key={key} className="flex justify-between">
            <span>{key.replace('GB', '')}</span>
            <span>{(val as number).toFixed(2)} GB</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

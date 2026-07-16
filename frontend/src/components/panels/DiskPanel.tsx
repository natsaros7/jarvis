import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function DiskPanel({ scan }: Props) {
  const freeGB = scan.metrics['freeGB'] as number ?? 0;
  const totalGB = scan.metrics['totalGB'] as number ?? 0;
  return (
    <PanelShell title="Disk" error={scan.error && scan.error !== 'DAEMON_OFFLINE' ? scan.error : undefined}>
      <ArcMeter score={scan.score} label="free" value={`${freeGB} GB`} />
      <div className="text-xs text-text-dim text-center">{totalGB} GB total</div>
    </PanelShell>
  );
}

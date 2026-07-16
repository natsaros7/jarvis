import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function DockerPanel({ scan }: Props) {
  const isDaemonDown = scan.error === 'DAEMON_OFFLINE';
  const buildGB = scan.metrics['buildReclaimableGB'] as number ?? 0;
  const imageGB = scan.metrics['imageReclaimableGB'] as number ?? 0;
  const volumeGB = scan.metrics['volumeReclaimableGB'] as number ?? 0;
  const totalGB = parseFloat((buildGB + imageGB + volumeGB).toFixed(2));

  if (isDaemonDown) {
    return (
      <PanelShell title="Docker">
        <div className="text-xs text-warning text-center tracking-widest">DAEMON OFFLINE</div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="Docker">
      <ArcMeter score={scan.score} label="reclaimable" value={`${totalGB} GB`} />
      <div className="text-xs text-text-dim space-y-0.5">
        <div className="flex justify-between"><span>Build cache</span><span>{buildGB} GB</span></div>
        <div className="flex justify-between"><span>Images</span><span>{imageGB} GB</span></div>
        <div className="flex justify-between"><span>Volumes</span><span>{volumeGB} GB</span></div>
      </div>
    </PanelShell>
  );
}

import type { CategoryScan, RemediationAction } from '../types.js';
import { type ExecFn, defaultExec, linearScore } from './utils.js';

// Score: 100 at 0 GB reclaimable, 0 at ≥20 GB reclaimable
function scoreDocker(reclaimableGB: number): number {
  return linearScore(-reclaimableGB, -20, 0);
}

function parseReclaimable(line: string): number {
  // e.g. "11.32GB (31%)" → bytes
  const match = line.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return val * 1024 ** 3;
  if (unit === 'MB') return val * 1024 ** 2;
  if (unit === 'KB') return val * 1024;
  return val;
}

export async function scanDocker(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  try {
    await exec('docker info'); // throws if daemon is down
    const { stdout } = await exec('docker system df');
    const lines = stdout.trim().split('\n');

    let imageReclaimable = 0;
    let buildReclaimable = 0;
    let volumeReclaimable = 0;

    for (const line of lines) {
      if (line.startsWith('Images')) imageReclaimable = parseReclaimable(line.split(/\s{2,}/)[3] ?? '');
      if (line.startsWith('Build Cache')) buildReclaimable = parseReclaimable(line.split(/\s{2,}/)[3] ?? '');
      if (line.startsWith('Local Volumes')) volumeReclaimable = parseReclaimable(line.split(/\s{2,}/)[3] ?? '');
    }

    const totalReclaimable = imageReclaimable + buildReclaimable + volumeReclaimable;
    const totalGB = totalReclaimable / 1024 ** 3;

    const actions: RemediationAction[] = [];
    if (buildReclaimable > 0)
      actions.push({ id: 'docker-builder-prune', label: 'Prune Docker build cache', command: 'docker builder prune -af', estimatedReclaimBytes: buildReclaimable, category: 'docker' });
    if (imageReclaimable > 0)
      // -af: all unused images, not just dangling — matches what docker system df reports as reclaimable
      actions.push({ id: 'docker-image-prune', label: 'Prune unused images', command: 'docker image prune -af', estimatedReclaimBytes: imageReclaimable, category: 'docker' });
    if (volumeReclaimable > 0)
      actions.push({ id: 'docker-volume-prune', label: 'Prune unused volumes', command: 'docker volume prune -f', estimatedReclaimBytes: volumeReclaimable, category: 'docker' });

    return {
      category: 'docker',
      score: scoreDocker(totalGB),
      metrics: {
        imageReclaimableGB: parseFloat((imageReclaimable / 1024 ** 3).toFixed(2)),
        buildReclaimableGB: parseFloat((buildReclaimable / 1024 ** 3).toFixed(2)),
        volumeReclaimableGB: parseFloat((volumeReclaimable / 1024 ** 3).toFixed(2)),
      },
      actions,
    };
  } catch (e) {
    // "Cannot connect to the Docker daemon" — daemon not running. Broad 'daemon' substring
    // would also match "Error response from daemon: ..." (a live-daemon error), so check precisely.
    const isDaemonDown = String(e).includes('Cannot connect to the Docker daemon') || String(e).includes('Is the docker daemon running');
    return { category: 'docker', score: isDaemonDown ? 100 : 0, metrics: { daemonOnline: isDaemonDown ? 0 : 1 }, actions: [], error: isDaemonDown ? 'DAEMON_OFFLINE' : String(e) };
  }
}

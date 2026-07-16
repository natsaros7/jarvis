import type { CategoryScan, RemediationAction } from '../types.js';
import { type ExecFn, defaultExec, HOME, linearScore } from './utils.js';

const BUILD_PATTERNS = [
  `${HOME}/Developer/projects/crrd/*/target`,
  `${HOME}/Developer/projects/crrd/crrd-nssim/load-tests/target`,
  `${HOME}/Developer/projects/crrd/crrd-ui/dist`,
  `${HOME}/Developer/projects/etias/*/target`,
  `${HOME}/Developer/projects/personal/*/target`,
  `${HOME}/Developer/projects/personal/*/*/target`,
  `${HOME}/Developer/projects/personal/*/dist`,
  `${HOME}/Developer/projects/personal/*/*/dist`,
  `${HOME}/Developer/projects/personal/rbnbook/frontend/.next`,
  `${HOME}/Developer/projects/personal/signal/.worktrees/*/target`,
];

// Score: 100 at ≤0.2 GB, 0 at ≥5 GB
function scoreBuilds(totalGB: number): number {
  return linearScore(-totalGB, -5, -0.2);
}

export async function scanBuilds(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  const actions: RemediationAction[] = [];
  let totalBytes = 0;

  for (const pattern of BUILD_PATTERNS) {
    try {
      const { stdout } = await exec(`du -sk ${pattern} 2>/dev/null`);
      for (const line of stdout.trim().split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split(/\s+/);
        const kb = parseInt(parts[0], 10);
        const path = parts.slice(1).join(' ');
        if (!kb || !path) continue;
        const bytes = kb * 1024;
        totalBytes += bytes;
        actions.push({
          id: `build-${Buffer.from(path).toString('base64').slice(0, 12)}`,
          label: path.replace(HOME, '~'),
          command: `rm -rf "${path}"`,
          estimatedReclaimBytes: bytes,
          category: 'builds',
        });
      }
    } catch { /* glob matched nothing */ }
  }

  // Sort largest first
  actions.sort((a, b) => b.estimatedReclaimBytes - a.estimatedReclaimBytes);

  return {
    category: 'builds',
    score: scoreBuilds(totalBytes / 1024 ** 3),
    metrics: { totalGB: parseFloat((totalBytes / 1024 ** 3).toFixed(2)), dirCount: actions.length },
    actions,
  };
}

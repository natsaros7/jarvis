import type { CategoryScan, RemediationAction } from '../types.js';
import { type ExecFn, defaultExec, HOME, linearScore } from './utils.js';

const CACHE_DIRS: { id: string; label: string; path: string; command: string }[] = [
  { id: 'jetbrains', label: 'JetBrains caches', path: `${HOME}/Library/Caches/JetBrains`, command: `rm -rf "${HOME}/Library/Caches/JetBrains/"*` },
  { id: 'homebrew', label: 'Homebrew cache', path: `${HOME}/Library/Caches/Homebrew`, command: 'brew cleanup --prune=all' },
  { id: 'playwright', label: 'Playwright browsers', path: `${HOME}/Library/Caches/ms-playwright`, command: `rm -rf "${HOME}/Library/Caches/ms-playwright" "${HOME}/Library/Caches/ms-playwright-go"` },
  { id: 'pip', label: 'pip cache', path: `${HOME}/Library/Caches/pip`, command: 'pip cache purge' },
  { id: 'pnpm', label: 'pnpm cache', path: `${HOME}/Library/Caches/pnpm`, command: `rm -rf "${HOME}/Library/Caches/pnpm"` },
  { id: 'colima', label: 'colima cache', path: `${HOME}/Library/Caches/colima`, command: `rm -rf "${HOME}/Library/Caches/colima"` },
];

// Score: 100 at ≤0.5 GB total, 0 at ≥15 GB total
function scoreCaches(totalGB: number): number {
  return linearScore(-totalGB, -15, -0.5);
}

export async function scanCaches(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  const actions: RemediationAction[] = [];
  let totalBytes = 0;
  const metrics: Record<string, number> = {};

  for (const dir of CACHE_DIRS) {
    try {
      const { stdout } = await exec(`du -sk "${dir.path}" 2>/dev/null || echo "0"`);
      const kb = parseInt(stdout.trim().split(/\s+/)[0], 10) || 0;
      const bytes = kb * 1024;
      totalBytes += bytes;
      metrics[dir.id + 'GB'] = parseFloat((bytes / 1024 ** 3).toFixed(3));
      if (bytes > 10 * 1024 * 1024) // only surface if > 10 MB
        actions.push({ id: dir.id, label: dir.label, command: dir.command, estimatedReclaimBytes: bytes, category: 'caches' });
    } catch { /* skip inaccessible dirs */ }
  }

  return {
    category: 'caches',
    score: scoreCaches(totalBytes / 1024 ** 3),
    metrics: { totalGB: parseFloat((totalBytes / 1024 ** 3).toFixed(2)), ...metrics },
    actions,
  };
}

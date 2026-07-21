import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { CategoryScan, RemediationAction } from '../types.js';
import { type ExecFn, defaultExec, HOME, linearScore } from './utils.js';

// Score: 100 at ≤0.2 GB, 0 at ≥5 GB
function scoreBuilds(totalGB: number): number {
  return linearScore(-totalGB, -5, -0.2);
}

interface PurgeConfig { gitRoots?: string[]; gitScanDepth?: number; }

async function loadConfig(): Promise<PurgeConfig> {
  try {
    const raw = await readFile(join(HOME, '.config', 'purge', 'config.json'), 'utf-8');
    return JSON.parse(raw) as PurgeConfig;
  } catch { return {}; }
}

const DEFAULT_ROOTS = [
  join(HOME, 'Developer'),
  join(HOME, 'Code'),
  join(HOME, 'Projects'),
  join(HOME, 'dev'),
  join(HOME, 'src'),
  join(HOME, 'work'),
];

// Build output dirs to look for inside repo roots
const BUILD_DIR_NAMES = new Set(['target', 'dist', 'build', '.next', 'out', '__pycache__', '.gradle']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'Library', 'Applications', '.Trash', '.cache', '.npm']);

async function existsDir(p: string): Promise<boolean> {
  try { const s = await stat(p); return s.isDirectory(); } catch { return false; }
}

// Walk up to maxDepth, collect dirs named in BUILD_DIR_NAMES that are inside a git repo
async function findBuildDirs(root: string, maxDepth: number, depth = 0): Promise<string[]> {
  if (depth > maxDepth) return [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const isRepo = entries.some(e => e.name === '.git');
    const found: string[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      if (isRepo && BUILD_DIR_NAMES.has(e.name)) {
        found.push(join(root, e.name));
      } else if (!BUILD_DIR_NAMES.has(e.name)) {
        const nested = await findBuildDirs(join(root, e.name), maxDepth, depth + 1);
        found.push(...nested);
      }
    }
    return found;
  } catch { return []; }
}

export async function scanBuilds(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  const config = await loadConfig();

  let roots: string[];
  if (config.gitRoots?.length) {
    roots = config.gitRoots.map(r => r.replace(/^~/, HOME));
  } else {
    roots = (await Promise.all(DEFAULT_ROOTS.map(async r => (await existsDir(r)) ? r : null)))
      .filter((r): r is string => r !== null);
  }

  const maxDepth = (config.gitScanDepth ?? 5) + 1; // one extra level to find build dirs inside repos

  const allDirLists = await Promise.all(roots.map(r => findBuildDirs(r, maxDepth)));
  const buildDirs = [...new Set(allDirLists.flat())];

  const actions: RemediationAction[] = [];
  let totalBytes = 0;

  await Promise.all(
    buildDirs.map(async dir => {
      try {
        const { stdout } = await exec(`du -sk "${dir}" 2>/dev/null`);
        const kb = parseInt(stdout.trim().split(/\s+/)[0], 10) || 0;
        if (!kb) return;
        const bytes = kb * 1024;
        totalBytes += bytes;
        actions.push({
          id: `build-${Buffer.from(dir).toString('base64').slice(0, 16)}`,
          label: dir.replace(HOME, '~'),
          command: `rm -rf "${dir}"`,
          estimatedReclaimBytes: bytes,
          category: 'builds',
        });
      } catch { /* du failed */ }
    })
  );

  actions.sort((a, b) => b.estimatedReclaimBytes - a.estimatedReclaimBytes);

  return {
    category: 'builds',
    score: scoreBuilds(totalBytes / 1024 ** 3),
    metrics: { totalGB: parseFloat((totalBytes / 1024 ** 3).toFixed(2)), dirCount: actions.length },
    actions,
  };
}

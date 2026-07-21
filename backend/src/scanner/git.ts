import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { GitFinding, GitScan } from '../types.js';
import { type ExecFn, defaultExec, HOME } from './utils.js';

// ─── Config ──────────────────────────────────────────────────────────────────
// ~/.config/purge/config.json can override defaults:
//   { "gitRoots": ["~/Code", "~/Work"], "gitScanDepth": 3 }

interface PurgeConfig {
  gitRoots?: string[];
  gitScanDepth?: number;
}

async function loadConfig(): Promise<PurgeConfig> {
  try {
    const raw = await readFile(join(HOME, '.config', 'purge', 'config.json'), 'utf-8');
    return JSON.parse(raw) as PurgeConfig;
  } catch {
    return {};
  }
}

// ─── Repo discovery ───────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Library', 'Applications', '.Trash',
  'Music', 'Movies', 'Pictures', '.cache', '.npm', '.gradle',
  '.m2', 'vendor', '__pycache__', '.venv', 'venv', 'dist', 'build',
]);

// Default candidate roots — we only scan directories that actually exist.
const DEFAULT_ROOTS = [
  join(HOME, 'Developer'),
  join(HOME, 'Code'),
  join(HOME, 'Projects'),
  join(HOME, 'dev'),
  join(HOME, 'src'),
  join(HOME, 'work'),
];

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

async function discoverRepos(root: string, maxDepth: number, depth = 0): Promise<string[]> {
  if (depth > maxDepth) return [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    if (entries.some(e => e.name === '.git')) return [root]; // this IS a repo — don't recurse further
    const subdirs = entries.filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'));
    const nested = await Promise.all(subdirs.map(e => discoverRepos(join(root, e.name), maxDepth, depth + 1)));
    return nested.flat();
  } catch {
    return [];
  }
}

// ─── Finders ─────────────────────────────────────────────────────────────────

const STALE_DAYS        = 30;
const LARGE_FILE_BYTES  = 10 * 1024 * 1024; // 10 MB
const OLD_WORKTREE_DAYS = 7;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

const DAY_MS = 86_400_000;

async function staleBranches(repoPath: string, exec: ExecFn): Promise<GitFinding[]> {
  try {
    const repo = basename(repoPath);
    // Merge target: the repo's default branch (origin/HEAD → e.g. origin/main).
    const { stdout: headOut } = await exec(
      `git -C "${repoPath}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null`
    ).catch(() => ({ stdout: '' }));
    const base = headOut.trim() || 'origin/main';
    // symbolic-ref returns a full ref (refs/remotes/origin/main) — shorten for display + self-compare.
    const baseName = base.replace(/^refs\/remotes\/origin\//, '').replace(/^origin\//, '');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_DAYS);

    // LOCAL branches already merged into the default branch. %(HEAD) is "*" for the checked-out one.
    const { stdout } = await exec(
      `git -C "${repoPath}" branch --merged ${base} --format="%(HEAD)|%(refname:short)|%(committerdate:iso)" 2>/dev/null`
    );

    return stdout.trim().split('\n')
      .filter(Boolean)
      .flatMap(line => {
        const [head, branch, ...rest] = line.split('|');
        if (head === '*') return [];                                  // never the checked-out branch
        if (!branch || /^(main|master|develop|dev)$/.test(branch)) return []; // never protected branches
        if (branch === baseName) return [];                           // never the default branch itself
        const date = new Date(rest.join('|'));
        if (isNaN(date.getTime()) || date >= cutoff) return [];
        const days = Math.floor((Date.now() - date.getTime()) / DAY_MS);
        return [{
          type: 'stale-branch' as const,
          repo,
          path: repoPath.replace(HOME, '~'),
          detail: `${branch} · merged into ${baseName}, ${days}d since last commit (${isoDate(date)})`,
          // -d (safe): git refuses if the branch isn't fully merged. Local only — never touches the remote.
          // No quotes: /api/git-clean uses execFile (no shell) and rejects quote chars.
          cleanCommand: `git -C ${repoPath} branch -d ${branch}`,
        }];
      });
  } catch { return []; }
}

async function largeUntracked(repoPath: string, exec: ExecFn): Promise<GitFinding[]> {
  try {
    const repo = basename(repoPath);
    const { stdout } = await exec(
      `git -C "${repoPath}" ls-files --others --exclude-standard 2>/dev/null`
    );
    const findings: GitFinding[] = [];
    await Promise.all(
      stdout.trim().split('\n').filter(Boolean).map(async file => {
        const fullPath = join(repoPath, file);
        try {
          const s = await stat(fullPath);
          if (s.size >= LARGE_FILE_BYTES) {
            findings.push({
              type: 'large-untracked',
              repo,
              path: fullPath.replace(HOME, '~'),
              detail: `${(s.size / 1024 / 1024).toFixed(1)} MB · untracked, not in .gitignore · ${file}`,
              cleanCommand: `rm ${fullPath}`,
            });
          }
        } catch { /* file gone */ }
      })
    );
    return findings;
  } catch { return []; }
}

async function oldWorktrees(repoPath: string): Promise<GitFinding[]> {
  const repo = basename(repoPath);
  const worktreeBase = join(repoPath, '.claude', 'worktrees');
  try {
    const entries = await readdir(worktreeBase, { withFileTypes: true });
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - OLD_WORKTREE_DAYS);
    const findings: GitFinding[] = [];
    await Promise.all(
      entries.filter(e => e.isDirectory()).map(async e => {
        const fullPath = join(worktreeBase, e.name);
        try {
          const s = await stat(fullPath);
          if (s.mtime < cutoff) {
            findings.push({
              type: 'old-worktree',
              repo,
              path: fullPath.replace(HOME, '~'),
              detail: `${e.name} · worktree idle ${Math.floor((Date.now() - s.mtime.getTime()) / DAY_MS)}d (since ${isoDate(s.mtime)})`,
              cleanCommand: `rm -rf ${fullPath}`,
            });
          }
        } catch { /* gone */ }
      })
    );
    return findings;
  } catch { return []; }
}

// ─── Main export ─────────────────────────────────────────────────────────────

const MAX_FINDINGS_PER_TYPE = 50;

export async function scanGit(exec: ExecFn = defaultExec): Promise<GitScan> {
  try {
    const config = await loadConfig();

    // Resolve roots: config wins, otherwise use whichever defaults actually exist.
    let roots: string[];
    if (config.gitRoots?.length) {
      roots = config.gitRoots.map(r => r.replace(/^~/, HOME));
    } else {
      roots = (await Promise.all(DEFAULT_ROOTS.map(async r => (await exists(r)) ? r : null)))
        .filter((r): r is string => r !== null);
    }

    // Repos commonly sit 3–4 levels deep (e.g. ~/Developer/projects/personal/<repo>).
    const maxDepth = config.gitScanDepth ?? 5;

    // Discover all repos under all roots
    const repoLists = await Promise.all(roots.map(r => discoverRepos(r, maxDepth)));
    const repos = [...new Set(repoLists.flat())]; // deduplicate

    // Scan all repos in parallel
    const perRepo = await Promise.all(
      repos.map(p => Promise.all([
        staleBranches(p, exec),
        largeUntracked(p, exec),
        oldWorktrees(p),
      ]))
    );

    const stale: GitFinding[] = [];
    const untracked: GitFinding[] = [];
    const worktrees: GitFinding[] = [];

    for (const [s, u, w] of perRepo) {
      stale.push(...s);
      untracked.push(...u);
      worktrees.push(...w);
    }

    const findings = [
      ...stale.slice(0, MAX_FINDINGS_PER_TYPE),
      ...untracked.slice(0, MAX_FINDINGS_PER_TYPE),
      ...worktrees.slice(0, MAX_FINDINGS_PER_TYPE),
    ];

    const truncated = stale.length > MAX_FINDINGS_PER_TYPE || untracked.length > MAX_FINDINGS_PER_TYPE || worktrees.length > MAX_FINDINGS_PER_TYPE;
    const note = truncated ? `capped at ${MAX_FINDINGS_PER_TYPE}/type` : undefined;
    const rootNames = roots.map(r => r.replace(HOME, '~')).join(', ');
    const discoveryNote = `scanned ${repos.length} repos in ${rootNames}`;

    return {
      findings,
      error: [note, discoveryNote].filter(Boolean).join(' · ') || undefined,
    };
  } catch (e) {
    return { findings: [], error: String(e) };
  }
}

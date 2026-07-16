import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { GitFinding, GitScan } from '../types.js';
import { type ExecFn, defaultExec, HOME } from './utils.js';

const PROJECT_ROOTS = [
  `${HOME}/Developer/projects/crrd`,
  `${HOME}/Developer/projects/etias`,
  `${HOME}/Developer/projects/personal`,
];

const STALE_DAYS = 30;
const LARGE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const OLD_WORKTREE_DAYS = 7;

export async function scanGit(exec: ExecFn = defaultExec): Promise<GitScan> {
  const findings: GitFinding[] = [];

  for (const root of PROJECT_ROOTS) {
    let projects: string[] = [];
    try {
      const entries = await readdir(root, { withFileTypes: true });
      projects = entries.filter(e => e.isDirectory()).map(e => join(root, e.name));
    } catch { continue; }

    for (const projectPath of projects) {
      // Stale branches
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - STALE_DAYS);
        const { stdout } = await exec(
          `git -C "${projectPath}" branch -r --merged HEAD --format="%(refname:short) %(committerdate:iso)" 2>/dev/null`
        );
        for (const line of stdout.trim().split('\n')) {
          if (!line.trim() || line.includes('HEAD') || line.includes('main') || line.includes('master')) continue;
          const parts = line.trim().split(' ');
          const branch = parts[0];
          const dateStr = parts.slice(1).join(' ');
          if (new Date(dateStr) < cutoff) {
            findings.push({
              type: 'stale-branch',
              path: projectPath.replace(HOME, '~'),
              detail: branch,
              cleanCommand: `git -C "${projectPath}" push origin --delete ${branch.replace('origin/', '')}`,
            });
          }
        }
      } catch { /* not a git repo or no remote */ }

      // Large untracked files
      try {
        const { stdout } = await exec(`git -C "${projectPath}" ls-files --others --exclude-standard 2>/dev/null`);
        for (const file of stdout.trim().split('\n')) {
          if (!file.trim()) continue;
          const fullPath = join(projectPath, file);
          try {
            const s = await stat(fullPath);
            if (s.size >= LARGE_FILE_BYTES) {
              findings.push({
                type: 'large-untracked',
                path: fullPath.replace(HOME, '~'),
                detail: `${(s.size / 1024 / 1024).toFixed(1)} MB`,
                cleanCommand: `rm -f "${fullPath}"`,
              });
            }
          } catch { /* file gone */ }
        }
      } catch { /* skip */ }

      // Old worktrees
      const worktreeBase = join(projectPath, '.claude', 'worktrees');
      try {
        const entries = await readdir(worktreeBase, { withFileTypes: true });
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - OLD_WORKTREE_DAYS);
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          const s = await stat(join(worktreeBase, e.name));
          if (s.mtime < cutoff) {
            findings.push({
              type: 'old-worktree',
              path: join(worktreeBase, e.name).replace(HOME, '~'),
              detail: `last modified ${s.mtime.toLocaleDateString()}`,
              cleanCommand: `rm -rf "${join(worktreeBase, e.name)}"`,
            });
          }
        }
      } catch { /* no worktrees dir */ }
    }
  }

  return { findings };
}

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
const MAX_FINDINGS_PER_TYPE = 50;

async function getProjectDirs(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => join(root, e.name));
  } catch { return []; }
}

async function staleBranches(projectPath: string, exec: ExecFn): Promise<GitFinding[]> {
  try {
    // Only flag branches merged into origin/main or origin/master — avoids catching
    // everything merged into an arbitrary feature branch checked out locally.
    const { stdout: defaultBranchOut } = await exec(
      `git -C "${projectPath}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null`
    ).catch(() => ({ stdout: '' }));
    const defaultRef = defaultBranchOut.trim(); // e.g. refs/remotes/origin/main
    const base = defaultRef || 'origin/main';

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_DAYS);
    const { stdout } = await exec(
      `git -C "${projectPath}" branch -r --merged ${base} --format="%(refname:short)|%(committerdate:iso)" 2>/dev/null`
    );
    const findings: GitFinding[] = [];
    for (const line of stdout.trim().split('\n')) {
      if (!line.trim()) continue;
      const [branch, ...dateParts] = line.split('|');
      if (!branch || branch.includes('HEAD') || /\/(main|master|develop|dev)$/.test(branch)) continue;
      const dateStr = dateParts.join('|');
      if (!dateStr || new Date(dateStr) >= cutoff) continue;
      findings.push({
        type: 'stale-branch',
        path: projectPath.replace(HOME, '~'),
        detail: branch.trim(),
        cleanCommand: `git -C "${projectPath}" push origin --delete ${branch.trim().replace('origin/', '')}`,
      });
    }
    return findings;
  } catch { return []; }
}

async function largeUntracked(projectPath: string, exec: ExecFn): Promise<GitFinding[]> {
  try {
    const { stdout } = await exec(`git -C "${projectPath}" ls-files --others --exclude-standard 2>/dev/null`);
    const findings: GitFinding[] = [];
    await Promise.all(
      stdout.trim().split('\n').filter(Boolean).map(async file => {
        const fullPath = join(projectPath, file);
        try {
          const s = await stat(fullPath);
          if (s.size >= LARGE_FILE_BYTES) {
            findings.push({
              type: 'large-untracked',
              path: fullPath.replace(HOME, '~'),
              detail: `${(s.size / 1024 / 1024).toFixed(1)} MB`,
              cleanCommand: `rm "${fullPath}"`,
            });
          }
        } catch { /* file gone */ }
      })
    );
    return findings;
  } catch { return []; }
}

async function oldWorktrees(projectPath: string): Promise<GitFinding[]> {
  const worktreeBase = join(projectPath, '.claude', 'worktrees');
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
              path: fullPath.replace(HOME, '~'),
              detail: `last modified ${s.mtime.toLocaleDateString()}`,
              cleanCommand: `rm -rf "${fullPath}"`,
            });
          }
        } catch { /* gone */ }
      })
    );
    return findings;
  } catch { return []; }
}

export async function scanGit(exec: ExecFn = defaultExec): Promise<GitScan> {
  try {
    const allRoots = await Promise.all(PROJECT_ROOTS.map(getProjectDirs));
    const allProjects = allRoots.flat();

    // Run all projects in parallel
    const perProject = await Promise.all(
      allProjects.map(p => Promise.all([
        staleBranches(p, exec),
        largeUntracked(p, exec),
        oldWorktrees(p),
      ]))
    );

    const stale: GitFinding[] = [];
    const untracked: GitFinding[] = [];
    const worktrees: GitFinding[] = [];

    for (const [s, u, w] of perProject) {
      stale.push(...s);
      untracked.push(...u);
      worktrees.push(...w);
    }

    // Cap per type to avoid overwhelming the UI
    const findings = [
      ...stale.slice(0, MAX_FINDINGS_PER_TYPE),
      ...untracked.slice(0, MAX_FINDINGS_PER_TYPE),
      ...worktrees.slice(0, MAX_FINDINGS_PER_TYPE),
    ];

    const truncated = stale.length > MAX_FINDINGS_PER_TYPE ||
      untracked.length > MAX_FINDINGS_PER_TYPE ||
      worktrees.length > MAX_FINDINGS_PER_TYPE;

    return {
      findings,
      ...(truncated ? { error: `Results capped at ${MAX_FINDINGS_PER_TYPE} per type (showing ${findings.length} of ${stale.length + untracked.length + worktrees.length})` } : {}),
    };
  } catch (e) {
    return { findings: [], error: String(e) };
  }
}

import { useState } from 'react';
import { GitFinding, GitScan } from '../../types';
import { GitBranch, File, FolderOpen, CaretDown, CaretUp } from '@phosphor-icons/react';
import { runGitClean } from '../../lib/api';

interface Props { git: GitScan; }

const PAGE_SIZE = 10;

const ICONS: Record<GitFinding['type'], React.ElementType> = {
  'stale-branch': GitBranch,
  'large-untracked': File,
  'old-worktree': FolderOpen,
};

const TYPE_LABELS: Record<GitFinding['type'], string> = {
  'stale-branch': 'STALE BRANCHES',
  'large-untracked': 'LARGE UNTRACKED',
  'old-worktree': 'OLD WORKTREES',
};

const CRITERIA: Record<GitFinding['type'], string> = {
  'stale-branch': 'Merged into origin/main or origin/master, last commit >30 days ago',
  'large-untracked': 'Untracked file >10 MB not in .gitignore',
  'old-worktree': '.claude/worktree not modified in >7 days',
};

function FindingRow({ finding, onDone }: { finding: GitFinding; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const Icon = ICONS[finding.type];

  const handleClean = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    setBusy(true);
    await runGitClean(finding.cleanCommand);
    onDone();
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-warning/10 last:border-0">
      <Icon size={13} className="text-warning/60 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-dim font-mono truncate">{finding.detail}</div>
        <div className="text-xs text-text-dim/60 truncate">{finding.path}</div>
      </div>
      <button
        onClick={handleClean}
        disabled={busy}
        className="shrink-0 text-xs px-2 py-0.5 border rounded transition-colors disabled:opacity-30"
        style={{ borderColor: confirmed ? '#ef4444' : '#f59e0b', color: confirmed ? '#ef4444' : '#f59e0b' }}
      >
        {busy ? '...' : confirmed ? 'CONFIRM' : 'CLEAN'}
      </button>
    </div>
  );
}

function TypeSection({ type, findings }: { type: GitFinding['type']; findings: GitFinding[] }) {
  const [visible, setVisible] = useState<GitFinding[]>(findings);
  const [page, setPage] = useState(0);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (visible.length === 0) return null;

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const pageItems = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const removeFinding = (f: GitFinding) => {
    setVisible(prev => {
      const next = prev.filter(x => x !== f);
      // Clamp page if last item on page was removed
      const newTotalPages = Math.ceil(next.length / PAGE_SIZE);
      if (page >= newTotalPages && page > 0) setPage(newTotalPages - 1);
      return next;
    });
  };

  const handleBulkClean = async () => {
    if (!bulkConfirm) { setBulkConfirm(true); return; }
    await Promise.all(visible.map(f => runGitClean(f.cleanCommand)));
    setVisible([]);
    setBulkConfirm(false);
  };

  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-1.5 text-warning/80 text-xs tracking-wider hover:text-warning transition-colors">
          {collapsed ? <CaretDown size={11} /> : <CaretUp size={11} />}
          {TYPE_LABELS[type]}
          <span className="text-text-dim ml-1">×{visible.length}</span>
        </button>
        <span className="text-text-dim/50 text-xs flex-1 truncate">{CRITERIA[type]}</span>
        {visible.length > 1 && !collapsed && (
          <button
            onClick={handleBulkClean}
            className="text-xs px-2 py-0.5 border rounded transition-colors shrink-0"
            style={{ borderColor: bulkConfirm ? '#ef4444' : '#f59e0b44', color: bulkConfirm ? '#ef4444' : '#f59e0b88' }}
          >
            {bulkConfirm ? `CONFIRM DELETE ALL ${visible.length}` : `CLEAN ALL`}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="pl-2 border-l border-warning/10">
            {pageItems.map(f => (
              <FindingRow
                key={`${f.type}:${f.path}:${f.detail}`}
                finding={f}
                onDone={() => removeFinding(f)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3 mt-2 pl-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs text-text-dim disabled:opacity-30 hover:text-warning transition-colors"
              >
                ← prev
              </button>
              <span className="text-xs text-text-dim">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="text-xs text-text-dim disabled:opacity-30 hover:text-warning transition-colors"
              >
                next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function GitPanel({ git }: Props) {
  const byType: Record<GitFinding['type'], GitFinding[]> = {
    'stale-branch': git.findings.filter(f => f.type === 'stale-branch'),
    'large-untracked': git.findings.filter(f => f.type === 'large-untracked'),
    'old-worktree': git.findings.filter(f => f.type === 'old-worktree'),
  };

  const totalCount = git.findings.length;

  return (
    <div className="mt-6 rounded border border-warning/20 bg-[#09080a] p-4">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-xs tracking-widest text-warning font-bold">{'// GIT HYGIENE'}</span>
        {totalCount > 0 && (
          <span className="text-xs text-text-dim">{totalCount} findings</span>
        )}
        {git.error && <span className="text-xs text-warning/60 truncate">{git.error}</span>}
      </div>

      {git.findings.length === 0 && !git.error && (
        <div className="text-xs text-text-dim">No findings — git hygiene nominal.</div>
      )}

      {(Object.entries(byType) as [GitFinding['type'], GitFinding[]][]).map(([type, findings]) => (
        <TypeSection key={type} type={type} findings={findings} />
      ))}
    </div>
  );
}

import { useState } from 'react';
import { GitFinding, GitScan } from '../../types';
import { GitBranch, File, FolderOpen } from '@phosphor-icons/react';

interface Props { git: GitScan; }

const ICONS: Record<GitFinding['type'], React.ElementType> = {
  'stale-branch': GitBranch,
  'large-untracked': File,
  'old-worktree': FolderOpen,
};

const LABELS: Record<GitFinding['type'], string> = {
  'stale-branch': 'Stale branch',
  'large-untracked': 'Large untracked',
  'old-worktree': 'Old worktree',
};

function FindingRow({ finding }: { finding: GitFinding }) {
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState(false);
  const Icon = ICONS[finding.type];

  const handleClean = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    await fetch('/api/git-clean', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: finding.cleanCommand }),
    });
    setDone(true);
  };

  if (done) return null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-warning/10 last:border-0">
      <Icon size={14} className="text-warning shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-warning">{LABELS[finding.type]}</div>
        <div className="text-xs text-text-dim truncate">{finding.path}</div>
        <div className="text-xs text-text-dim">{finding.detail}</div>
      </div>
      <button
        onClick={handleClean}
        className="shrink-0 text-xs px-2 py-1 border rounded transition-colors"
        style={{ borderColor: confirmed ? '#ef4444' : '#f59e0b', color: confirmed ? '#ef4444' : '#f59e0b' }}
      >
        {confirmed ? 'CONFIRM' : 'CLEAN'}
      </button>
    </div>
  );
}

export function GitPanel({ git }: Props) {
  const byType: Record<GitFinding['type'], GitFinding[]> = {
    'stale-branch': git.findings.filter(f => f.type === 'stale-branch'),
    'large-untracked': git.findings.filter(f => f.type === 'large-untracked'),
    'old-worktree': git.findings.filter(f => f.type === 'old-worktree'),
  };

  return (
    <div className="border-t border-warning/20 mt-4 pt-4">
      <div className="flex items-center gap-4 mb-3">
        <span className="text-xs tracking-widest text-warning font-bold">{'// GIT HYGIENE'}</span>
        <span className="text-xs text-text-dim">
          {(Object.entries(byType) as [GitFinding['type'], GitFinding[]][])
            .map(([t, f]) => f.length > 0 ? `${t.replace('-', ' ')} ×${f.length}` : null)
            .filter(Boolean)
            .join('  ·  ')}
        </span>
      </div>
      {git.error && <div className="text-xs text-critical">{git.error}</div>}
      {git.findings.length === 0 && !git.error && (
        <div className="text-xs text-text-dim">No findings — git hygiene nominal.</div>
      )}
      <div>
        {git.findings.map((f, i) => <FindingRow key={i} finding={f} />)}
      </div>
    </div>
  );
}

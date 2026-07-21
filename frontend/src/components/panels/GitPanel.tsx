import { useState } from 'react';
import { GitFinding, GitScan } from '../../types';
import { GitBranch, File, FolderOpen, CaretDown, CaretRight, GitMerge } from '@phosphor-icons/react';
import { runGitClean } from '../../lib/api';
import { COLORS } from '../../theme';

interface Props { git: GitScan; }

const ICONS: Record<GitFinding['type'], React.ElementType> = {
  'stale-branch':    GitBranch,
  'large-untracked': File,
  'old-worktree':    FolderOpen,
};
const TYPE_LABEL: Record<GitFinding['type'], string> = {
  'stale-branch':    'stale branch',
  'large-untracked': 'large file',
  'old-worktree':    'old worktree',
};

function severity(f: GitFinding): string {
  if (f.type === 'large-untracked') return COLORS.crit;
  if (f.type === 'stale-branch')    return COLORS.warn;
  return COLORS.textDim;
}

function FindingRow({ finding, onDone }: { finding: GitFinding; onDone: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const Icon = ICONS[finding.type];
  const color = severity(finding);

  const handleClean = async () => {
    if (phase === 'idle')    { setPhase('confirm'); return; }
    if (phase === 'confirm') {
      setPhase('busy');
      await runGitClean(finding.cleanCommand);
      onDone();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginLeft: 22, borderLeft: `1px solid ${COLORS.line}` }}>
      <Icon size={16} color={color} weight="duotone" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finding.detail}</div>
        <div style={{ fontSize: 12, color: COLORS.textMute }}>{TYPE_LABEL[finding.type]}</div>
      </div>
      <button
        onClick={handleClean} disabled={phase === 'busy'}
        className="mono"
        style={{
          flexShrink: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
          padding: '8px 16px', minHeight: 38, minWidth: 84, borderRadius: 7, textAlign: 'center',
          cursor: phase === 'busy' ? 'default' : 'pointer',
          border: `1.5px solid ${phase === 'confirm' ? COLORS.crit : color}`,
          color: phase === 'confirm' ? COLORS.crit : color,
          background: 'transparent', opacity: phase === 'busy' ? 0.5 : 1, transition: 'all 0.15s',
        }}
      >
        {phase === 'busy' ? '···' : phase === 'confirm' ? 'CONFIRM' : 'CLEAN'}
      </button>
    </div>
  );
}

function RepoGroup({ repo, findings }: { repo: string; findings: GitFinding[] }) {
  const [visible, setVisible] = useState<GitFinding[]>(findings);
  const [collapsed, setCollapsed] = useState(false);
  const [bulk, setBulk] = useState<'idle' | 'confirm' | 'busy'>('idle');

  if (visible.length === 0) return null;

  const removeFinding = (f: GitFinding) => setVisible(prev => prev.filter(x => x !== f));

  const badgeColor = visible.some(f => f.type === 'large-untracked') ? COLORS.crit
    : visible.some(f => f.type === 'stale-branch') ? COLORS.warn : COLORS.textDim;

  const handleCleanAll = async () => {
    if (bulk === 'idle')    { setBulk('confirm'); return; }
    if (bulk === 'confirm') {
      setBulk('busy');
      await Promise.allSettled(visible.map(f => runGitClean(f.cleanCommand)));
      setVisible([]);
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0' }}
        >
          {collapsed
            ? <CaretRight size={14} color={COLORS.textDim} />
            : <CaretDown  size={14} color={COLORS.primary} />}
          <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: collapsed ? COLORS.textDim : COLORS.primary, letterSpacing: '0.04em' }}>
            {repo}
          </span>
          <span style={{ fontSize: 12, padding: '2px 9px', borderRadius: 6, border: `1px solid ${badgeColor}`, color: badgeColor }}>
            {visible.length}
          </span>
        </button>
        {visible.length > 1 && (
          <button
            onClick={handleCleanAll} disabled={bulk === 'busy'}
            className="mono"
            style={{
              flexShrink: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              padding: '7px 14px', minHeight: 36, borderRadius: 7, cursor: bulk === 'busy' ? 'default' : 'pointer',
              border: `1.5px solid ${bulk === 'confirm' ? COLORS.crit : COLORS.line}`,
              color: bulk === 'confirm' ? COLORS.crit : COLORS.textDim,
              background: 'transparent', opacity: bulk === 'busy' ? 0.5 : 1, transition: 'all 0.15s',
            }}
          >
            {bulk === 'busy' ? '···' : bulk === 'confirm' ? `CONFIRM — CLEAN ${visible.length}` : 'CLEAN ALL'}
          </button>
        )}
      </div>

      {!collapsed && visible.map(f => (
        <FindingRow key={`${f.type}:${f.path}:${f.detail}`} finding={f} onDone={() => removeFinding(f)} />
      ))}
    </div>
  );
}

export function GitPanel({ git }: Props) {
  const repoMap = new Map<string, GitFinding[]>();
  for (const f of git.findings) {
    const key = f.repo || 'unknown';
    if (!repoMap.has(key)) repoMap.set(key, []);
    repoMap.get(key)!.push(f);
  }
  const repos = [...repoMap.entries()].sort((a, b) => b[1].length - a[1].length);

  const discoveryNote = git.error?.includes('scanned') ? git.error : undefined;
  const otherError    = git.error && !git.error.includes('scanned') ? git.error : undefined;
  const hasFindings   = git.findings.length > 0;

  return (
    <div style={{ background: '#14201f', borderRadius: 20, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(0,224,172,0.10)' }}>
          <GitMerge size={22} color={hasFindings ? COLORS.warn : COLORS.primary} weight="duotone" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, letterSpacing: '0.01em' }}>Git Hygiene</h3>
        {hasFindings && (
          <span style={{ fontSize: 14, color: COLORS.warn, fontWeight: 600 }}>
            {git.findings.length} finding{git.findings.length !== 1 ? 's' : ''} across {repos.length} repo{repos.length !== 1 ? 's' : ''}
          </span>
        )}
        {discoveryNote && <span style={{ fontSize: 12, color: COLORS.textMute, marginLeft: 'auto' }}>{discoveryNote}</span>}
        {otherError && <span style={{ fontSize: 13, color: COLORS.warn, marginLeft: 'auto' }}>{otherError}</span>}
      </div>

      {!hasFindings && (
        <div style={{ fontSize: 15, color: COLORS.textMute, fontStyle: 'italic' }}>No findings — git hygiene nominal</div>
      )}

      {repos.map(([repo, findings]) => (
        <RepoGroup key={repo} repo={repo} findings={findings} />
      ))}
    </div>
  );
}

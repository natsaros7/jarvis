import { useState } from 'react';
import { Sparkle, Copy, Check } from '@phosphor-icons/react';
import { AISuggestion } from '../../types';
import { COLORS } from '../../theme';
import { runSuggestion } from '../../lib/api';

interface Props {
  suggestion: AISuggestion;
  onLog?: (text: string) => void;
  onDone?: () => void;
}

const AI = '#A78BFA';

const RISK: Record<AISuggestion['risk'], { fg: string; bg: string }> = {
  low:    { fg: COLORS.primary, bg: 'rgba(0,224,172,0.14)' },
  medium: { fg: COLORS.warn,    bg: 'rgba(255,194,75,0.14)' },
  high:   { fg: COLORS.crit,    bg: 'rgba(255,92,134,0.14)' },
};

export function AITile({ suggestion: s, onLog, onDone }: Props) {
  const [state, setState] = useState<'idle' | 'confirm' | 'running' | 'done'>('idle');
  const [copied, setCopied] = useState(false);
  const risk = RISK[s.risk];

  const handleRun = async () => {
    if (state === 'idle')    { setState('confirm'); return; }
    if (state === 'confirm') {
      const ts = Date.now();
      setState('running');
      onLog?.(`AI: running "${s.title}"`);
      const res = await runSuggestion(s.id);
      setState(res.ok ? 'done' : 'idle');
      if (res.ok) {
        const gb = ((res.reclaimedBytes ?? 0) / 1024 ** 3).toFixed(2);
        onLog?.(`AI: done "${s.title}" — ~${gb} GB in ${((Date.now() - ts) / 1000).toFixed(1)}s`);
        setTimeout(() => onDone?.(), 1200);
      } else {
        onLog?.(`AI: failed "${s.title}"`);
      }
    }
  };

  const copy = () => { if (s.command) { navigator.clipboard.writeText(s.command); setCopied(true); setTimeout(() => setCopied(false), 1400); } };

  const runLabel = state === 'idle' ? 'RUN' : state === 'confirm' ? 'CONFIRM' : state === 'running' ? '···' : '✓ DONE';
  const runColor = state === 'confirm' ? COLORS.warn : state === 'done' ? COLORS.primary : AI;

  return (
    <div style={{
      background: '#161228', borderRadius: 20, padding: 22,
      display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
      borderTop: `2px solid ${AI}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <Sparkle size={16} color={AI} weight="fill" />
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: risk.bg, color: risk.fg, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {s.risk}
        </span>
        <span style={{ fontSize: 12, color: COLORS.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.category}</span>
        {s.estimatedGB ? <span className="mono" style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 800, color: AI }}>~{s.estimatedGB} GB</span> : null}
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, lineHeight: 1.25 }}>{s.title}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: COLORS.textDim, flex: 1 }}>{s.detail}</div>

      {s.command && (
        <code className="mono" style={{ fontSize: 12, color: COLORS.textDim, background: '#0a1315', padding: '9px 11px', borderRadius: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {s.command}
        </code>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {s.runnable ? (
          <button
            onClick={handleRun} disabled={state === 'running'}
            className="mono"
            style={{
              flex: 1, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', padding: '10px', borderRadius: 8,
              cursor: state === 'running' ? 'default' : 'pointer', border: `1.5px solid ${runColor}`, color: runColor,
              background: 'transparent', opacity: state === 'running' ? 0.6 : 1, transition: 'all 0.15s',
            }}
          >
            {runLabel}
          </button>
        ) : (
          <span style={{ flex: 1, fontSize: 12, color: COLORS.textMute, fontStyle: 'italic', alignSelf: 'center' }}>
            {s.command ? 'manual — review before running' : 'advisory'}
          </span>
        )}
        {s.command && (
          <button
            onClick={copy}
            className="mono"
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
              padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${copied ? COLORS.primary : COLORS.line}`, color: copied ? COLORS.primary : COLORS.textDim,
              background: 'transparent', transition: 'all 0.15s',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

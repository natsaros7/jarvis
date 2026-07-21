import { useState, useEffect } from 'react';
import { runAction } from '../../lib/api';
import { RemediationAction } from '../../types';
import { COLORS } from '../../theme';

interface Props {
  action: RemediationAction;
  onDone: () => void;
  onLog?: (text: string) => void;
}

export function ActionButton({ action, onDone, onLog }: Props) {
  const [state, setState] = useState<'idle' | 'confirm' | 'running' | 'done'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [startTs, setStartTs] = useState(0);

  useEffect(() => {
    if (state !== 'running') { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTs) / 1000)), 250);
    return () => clearInterval(id);
  }, [state, startTs]);

  const handleClick = async () => {
    if (state === 'idle') { setState('confirm'); return; }
    if (state === 'confirm') {
      const ts = Date.now();
      setStartTs(ts);
      setState('running');
      onLog?.(`Executing: ${action.label}`);
      const res = await runAction(action.category, action.id);
      setState(res.ok ? 'done' : 'idle');
      if (res.ok) {
        const gb = ((res.reclaimedBytes ?? 0) / 1024 ** 3).toFixed(2);
        const secs = ((Date.now() - ts) / 1000).toFixed(1);
        onLog?.(`Done: ${action.label} — +${gb} GB reclaimed in ${secs}s`);
        setTimeout(onDone, 1200);
      } else {
        onLog?.(`Failed: ${action.label}`);
      }
    }
  };

  const gb = (action.estimatedReclaimBytes / 1024 ** 3).toFixed(2);

  const btn = {
    idle:    { border: COLORS.primary, color: COLORS.primary },
    confirm: { border: COLORS.warn,    color: COLORS.warn },
    running: { border: COLORS.line,    color: COLORS.textDim },
    done:    { border: COLORS.primaryDk, color: COLORS.primary },
  }[state];

  const label = state === 'idle' ? 'RUN'
    : state === 'confirm'  ? 'CONFIRM'
    : state === 'running'  ? `···${elapsed > 0 ? ` ${elapsed}s` : ''}`
    : '✓ DONE';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', background: COLORS.surface2, borderRadius: 8 }}>
      <span style={{ fontSize: 14, color: COLORS.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {action.label}
      </span>
      <span className="mono" style={{ fontSize: 13, color: COLORS.textDim, flexShrink: 0 }}>{gb} GB</span>
      <button
        onClick={handleClick}
        disabled={state === 'running'}
        className="mono"
        style={{
          flexShrink: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
          padding: '9px 16px', minHeight: 40, minWidth: 84, borderRadius: 7, textAlign: 'center',
          cursor: state === 'running' ? 'default' : 'pointer',
          border: `1.5px solid ${btn.border}`, color: btn.color,
          background: 'transparent', transition: 'all 0.15s', opacity: state === 'running' ? 0.6 : 1,
        }}
      >
        {label}
      </button>
    </div>
  );
}

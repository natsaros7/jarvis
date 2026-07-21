import { COLORS, scoreColor } from '../../theme';

/**
 * The bento hero number for a tile — one big meaningful value, small unit, small sub.
 * This is what each tile leads with (e.g. "208 GB free of 460").
 */
export function BigValue({ value, unit, sub, score }: { value: string | number; unit?: string; sub?: string; score?: number }) {
  const color = score !== undefined ? scoreColor(score) : COLORS.text;
  return (
    <div style={{ marginTop: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="mono" style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color }}>
          {value}
        </span>
        {unit && <span className="mono" style={{ fontSize: 18, fontWeight: 700, color, opacity: 0.7 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 14, color: COLORS.textDim, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/** Rounded status pill (e.g. DAEMON OFFLINE). */
export function Pill({ text, tone }: { text: string; tone: 'warn' | 'clean' | 'crit' }) {
  const map = {
    warn:  { bg: 'rgba(255,194,75,0.16)', fg: COLORS.warn },
    clean: { bg: 'rgba(0,224,172,0.16)',  fg: COLORS.primary },
    crit:  { bg: 'rgba(255,92,134,0.16)', fg: COLORS.crit },
  }[tone];
  return (
    <span style={{ fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 999, letterSpacing: '0.05em', background: map.bg, color: map.fg }}>
      {text}
    </span>
  );
}

/** Explains why a tile has no actions (indicator / read-only). */
export function NoAction({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: COLORS.textMute, marginTop: 10 }}>{text}</div>;
}

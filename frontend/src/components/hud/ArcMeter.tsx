import { motion } from 'framer-motion';
import { scoreColor } from '../../theme';

// Re-export so existing imports (`from '../hud/ArcMeter'`) keep working.
export { scoreColor };

interface Props { score: number; label: string; value: string; size?: number; }

export function ArcMeter({ score, label, value, size = 90 }: Props) {
  const r = (size / 2) - 9;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  const trackColor = score >= 80
    ? 'rgba(0,214,165,0.08)'
    : score >= 50
    ? 'rgba(255,184,0,0.08)'
    : 'rgba(255,76,122,0.08)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={5} />
          <motion.circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={5}
            strokeLinecap="butt"
            strokeDasharray={`${circ}`}
            strokeDashoffset={circ - dash}
            animate={{ strokeDashoffset: circ - dash, stroke: color }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color,
          fontFamily: 'JetBrains Mono, monospace',
          textShadow: `0 0 12px ${color}88`,
        }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(0,214,165,0.35)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color, textShadow: `0 0 8px ${color}66` }}>{value}</div>
    </div>
  );
}

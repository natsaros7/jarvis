import { motion } from 'framer-motion';

interface Props { score: number; label: string; value: string; size?: number; }

function arcColor(score: number): string {
  if (score >= 80) return '#00c8ff';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function ArcMeter({ score, label, value, size = 100 }: Props) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = arcColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0d1f35" strokeWidth={6} />
        {/* Arc */}
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ - dash}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          animate={{ strokeDashoffset: circ - dash, stroke: color }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size * 0.22} fontFamily="JetBrains Mono">
          {score}
        </text>
      </svg>
      <div className="text-xs text-text-dim tracking-widest uppercase">{label}</div>
      <div className="text-xs font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

import { motion } from 'framer-motion';

type Phase = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'EVALUATING' | 'REPLANNING' | 'COMPLETE' | 'FAILED';

interface Props { score: number; phase: Phase; }

function orbColor(score: number): string {
  if (score >= 80) return '#00c8ff';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function JarvisOrb({ score, phase }: Props) {
  const color = orbColor(score);
  const isActive = phase !== 'IDLE' && phase !== 'COMPLETE';

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 opacity-30"
        style={{ borderColor: color }}
        animate={{ rotate: isActive ? 360 : 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute inset-4 rounded-full border opacity-50"
        style={{ borderColor: color }}
        animate={{ rotate: isActive ? -360 : 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
      />
      {/* Core */}
      <motion.div
        className="absolute inset-8 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`, border: `1px solid ${color}` }}
        animate={{ opacity: [0.7, 1, 0.7], scale: phase === 'EXECUTING' ? [1, 1.05, 1] : 1 }}
        transition={{ duration: phase === 'EXECUTING' ? 0.8 : 3, repeat: Infinity }}
      />
      {/* Score */}
      <div className="relative z-10 text-center">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-text-dim tracking-widest mt-1">OVERALL</div>
      </div>
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';

type Phase = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'EVALUATING' | 'REPLANNING' | 'COMPLETE' | 'FAILED';

const MESSAGES: Record<Phase, string | null> = {
  IDLE: null,
  PLANNING: '// BUILDING REMEDIATION PLAN',
  EXECUTING: '// REMEDIATION IN PROGRESS',
  EVALUATING: '// EVALUATING SUBSYSTEMS',
  REPLANNING: '// TARGET UNRESPONSIVE — REPLANNING',
  COMPLETE: '// ALL SYSTEMS NOMINAL',
  FAILED: '// SUBSYSTEM FAILURE — SEE LOG',
};

const COLORS: Partial<Record<Phase, string>> = {
  COMPLETE: '#00D6A5',
  FAILED: '#FF4C7A',
  REPLANNING: '#FFB800',
};

interface Props { phase: Phase; }

export function AlertBanner({ phase }: Props) {
  const message = MESSAGES[phase];
  const color = COLORS[phase] ?? '#00D6A5';
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={phase}
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            textAlign: 'center', padding: '8px 0',
            fontSize: 11, letterSpacing: '0.28em', fontWeight: 700,
            color, borderBottom: `1px solid ${color}33`,
            background: `${color}0d`,
            textShadow: `0 0 12px ${color}66`,
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

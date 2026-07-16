import { AnimatePresence, motion } from 'framer-motion';

type Phase = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'EVALUATING' | 'REPLANNING' | 'COMPLETE' | 'FAILED';

const MESSAGES: Record<Phase, string | null> = {
  IDLE: null,
  PLANNING: 'INITIATING DIAGNOSTIC SEQUENCE',
  EXECUTING: 'REMEDIATION IN PROGRESS',
  EVALUATING: 'EVALUATING SUBSYSTEMS',
  REPLANNING: 'TARGET UNRESPONSIVE — REPLANNING',
  COMPLETE: 'ALL SYSTEMS NOMINAL',
  FAILED: 'SUBSYSTEM FAILURE — SEE LOG',
};

const COLORS: Partial<Record<Phase, string>> = {
  COMPLETE: '#10b981',
  FAILED: '#ef4444',
  REPLANNING: '#f59e0b',
};

interface Props { phase: Phase; }

export function AlertBanner({ phase }: Props) {
  const message = MESSAGES[phase];
  const color = COLORS[phase] ?? '#00c8ff';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={phase}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full text-center py-2 text-xs tracking-[0.3em] font-bold border-b"
          style={{ color, borderColor: `${color}44`, background: `${color}11` }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

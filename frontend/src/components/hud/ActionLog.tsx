import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

const TYPE_COLORS = { info: '#00c8ff', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };

interface Props { entries: LogEntry[]; }

export function ActionLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="h-48 overflow-y-auto bg-jarvis-grid/50 rounded border border-jarvis-grid p-3 space-y-1">
      <AnimatePresence initial={false}>
        {entries.map(entry => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs flex gap-2"
          >
            <span className="text-text-dim shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
            </span>
            <span style={{ color: TYPE_COLORS[entry.type] }}>{'>'}</span>
            <span style={{ color: TYPE_COLORS[entry.type] }}>{entry.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

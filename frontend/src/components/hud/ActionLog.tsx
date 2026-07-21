import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

const LOG_COLORS = { info: '#9dc4bb', success: '#00E0AC', warning: '#FFC24B', error: '#FF5C86' };
const PREFIX = { info: '›', success: '✓', warning: '⚠', error: '✗' };

interface Props { entries: LogEntry[]; }

export function ActionLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries.length]);

  return (
    <div style={{ background: '#0a1315', borderRadius: 20, padding: '20px 24px' }}>
      <div style={{ fontSize: 13, letterSpacing: '0.2em', color: '#6b8f88', marginBottom: 12, textTransform: 'uppercase' }}>Activity</div>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {entries.length === 0 && (
          <div style={{ fontSize: 14, color: '#6b8f88', fontStyle: 'italic' }}>Awaiting input</div>
        )}
        <AnimatePresence initial={false}>
          {entries.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="mono"
              style={{ display: 'flex', gap: 12, fontSize: 14, padding: '4px 0', alignItems: 'baseline' }}
            >
              <span style={{ color: '#6b8f88', flexShrink: 0 }}>
                {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
              </span>
              <span style={{ color: LOG_COLORS[entry.type], flexShrink: 0, fontWeight: 700, width: 14 }}>
                {PREFIX[entry.type]}
              </span>
              <span style={{ color: LOG_COLORS[entry.type] }}>{entry.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

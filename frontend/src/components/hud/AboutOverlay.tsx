import { motion, AnimatePresence } from 'framer-motion';
import { X, HardDrives, Cube, Package, Hammer, Gauge, GitMerge, Lightning, ShieldCheck } from '@phosphor-icons/react';
import { COLORS } from '../../theme';

interface Props { open: boolean; onClose: () => void; }

const FEATURES = [
  { icon: HardDrives, name: 'Disk',    desc: 'Free-space indicator for your boot volume.' },
  { icon: Cube,       name: 'Docker',  desc: 'Reclaim dangling images, build cache, and unused volumes.' },
  { icon: Package,    name: 'Caches',  desc: 'Clear JetBrains, Homebrew, pip, pnpm, Playwright & colima caches.' },
  { icon: Hammer,     name: 'Builds',  desc: 'Auto-discover and remove stale build output across your repos.' },
  { icon: Gauge,      name: 'Process', desc: 'Live load average and top CPU consumers (read-only).' },
  { icon: GitMerge,   name: 'Git Hygiene', desc: 'Stale branches, large untracked files, and old worktrees — grouped by repo.' },
];

const HOW = [
  { icon: Lightning,   text: 'Each category scores 0–100 and scans independently — panels fill in live as data arrives.' },
  { icon: Cube,        text: 'Fix one category at a time (with per-action control), or hit Auto-Fix All to remediate everything.' },
  { icon: ShieldCheck, text: 'Commands run server-side only; destructive actions need a two-step confirm. Source code is never touched.' },
];

export function AboutOverlay({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(680px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 32 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.12em', color: COLORS.primary }}>PURGE</div>
                <div style={{ fontSize: 15, color: COLORS.textDim, marginTop: 4 }}>Reclaim your dev machine.</div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textDim, padding: 4 }}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <p style={{ fontSize: 15, lineHeight: 1.6, color: COLORS.text, margin: '18px 0 26px' }}>
              An on-demand macOS health dashboard. It scans six dimensions of your machine,
              scores each one, and lets you reclaim space — per category or all at once.
            </p>

            {/* What it monitors */}
            <div style={{ fontSize: 13, letterSpacing: '0.2em', color: COLORS.textMute, textTransform: 'uppercase', marginBottom: 14 }}>
              What it monitors
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 30 }}>
              {FEATURES.map(f => (
                <div key={f.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(0,224,172,0.10)', flexShrink: 0 }}>
                    <f.icon size={18} color={COLORS.primary} weight="duotone" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{f.name}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.4, color: COLORS.textDim, marginTop: 2 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div style={{ fontSize: 13, letterSpacing: '0.2em', color: COLORS.textMute, textTransform: 'uppercase', marginBottom: 14 }}>
              How it works
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {HOW.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <h.icon size={20} color={COLORS.primary} weight="duotone" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: COLORS.text }}>{h.text}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

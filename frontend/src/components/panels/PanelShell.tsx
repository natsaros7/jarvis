import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icon, Sparkle } from '@phosphor-icons/react';
import { COLORS, scoreColor } from '../../theme';

const AI = '#A78BFA';

interface Props {
  title: string;
  icon: Icon;
  children: ReactNode;
  error?: string;
  score?: number;
  loading?: boolean;
  headerRight?: ReactNode;
  /** number of AI suggestions targeting this category */
  aiCount?: number;
  /** grid-column / grid-row span for the bento layout */
  span?: { col?: number; row?: number };
}

// Flat status-tinted tile backgrounds (bento style).
function tileBg(score: number | undefined, loading: boolean): string {
  if (loading || score === undefined) return '#14201f';
  if (score >= 80) return '#0f2420';
  if (score >= 50) return '#241f10';
  return '#241018';
}

export function PanelShell({ title, icon: IconCmp, children, error, score, loading, headerRight, aiCount, span }: Props) {
  const accent = score !== undefined ? scoreColor(score) : COLORS.primary;

  return (
    <div style={{
      gridColumn: span?.col ? `span ${span.col}` : undefined,
      gridRow: span?.row ? `span ${span.row}` : undefined,
      background: tileBg(score, !!loading),
      borderRadius: 20,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minHeight: 150,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <IconCmp size={20} color={accent} weight="duotone" />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.02em', color: COLORS.textDim }}>{title}</span>
          {!loading && aiCount ? (
            <span title={`${aiCount} AI suggestion${aiCount !== 1 ? 's' : ''}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 999, background: 'rgba(167,139,250,0.16)', color: AI,
            }}>
              <Sparkle size={11} weight="fill" /> {aiCount}
            </span>
          ) : null}
        </div>
        {!loading && headerRight}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {[70, 45].map((w, i) => (
            <motion.div
              key={i}
              style={{ height: 12, background: 'rgba(0,224,172,0.10)', borderRadius: 6, width: `${w}%` }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      ) : error
        ? <div style={{ fontSize: 15, color: COLORS.crit }}>{error}</div>
        : children}
    </div>
  );
}

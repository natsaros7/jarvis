import { motion } from 'framer-motion';
import { COLORS, overallVerdict } from '../../theme';

interface Props {
  score: number;
  loading?: boolean;
  reclaimableGB?: number;
  gitFindings?: number;
}

// The big overall-health tile. Gradient when healthy, flat-tinted otherwise.
export function HeroTile({ score, loading, reclaimableGB = 0, gitFindings = 0 }: Props) {
  const verdict = overallVerdict(score);

  const bg = loading
    ? '#14201f'
    : score >= 80
    ? `radial-gradient(130% 130% at 0% 0%, ${COLORS.primary} 0%, ${COLORS.primaryDk} 55%, #037a5d 100%)`
    : score >= 50
    ? 'linear-gradient(135deg, #FFC24B, #c8901f)'
    : 'linear-gradient(135deg, #FF5C86, #c23458)';
  const fg = loading ? COLORS.textDim : '#04211a';

  const parts: string[] = [];
  if (reclaimableGB > 0.01) parts.push(`${reclaimableGB.toFixed(2)} GB reclaimable`);
  if (gitFindings > 0) parts.push(`${gitFindings} git finding${gitFindings !== 1 ? 's' : ''}`);
  const detail = parts.length ? parts.join(' · ') : 'Everything looks clean';

  return (
    <div style={{
      gridColumn: 'span 2', gridRow: 'span 2',
      background: bg, borderRadius: 24, padding: 32,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: 316, color: fg, overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.75 }}>
        Overall Health
      </div>

      <motion.div
        className="mono"
        animate={{ opacity: loading ? [0.4, 0.8, 0.4] : 1 }}
        transition={loading ? { duration: 1.2, repeat: Infinity } : {}}
        style={{ fontSize: 132, fontWeight: 800, lineHeight: 0.85, letterSpacing: '-0.04em', color: loading ? COLORS.textMute : fg }}
      >
        {loading ? '··' : score}
      </motion.div>

      {!loading && (
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>{verdict.title}</div>
          <div style={{ fontSize: 15, fontWeight: 500, opacity: 0.8, marginTop: 4 }}>{detail}</div>
        </div>
      )}
    </div>
  );
}

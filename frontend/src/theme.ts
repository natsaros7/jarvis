// Central design tokens — restrained Ghost-in-the-Shell slate/teal.
// Import from here; do not scatter hex values across components.

export const COLORS = {
  bg:        '#0d1a1d',
  surface:   '#13262a',
  surface2:  '#182f34',
  line:      'rgba(0,224,172,0.14)',
  lineSoft:  'rgba(0,224,172,0.08)',
  primary:   '#00E0AC',
  primaryDk: '#00b88c',
  warn:      '#FFC24B',
  crit:      '#FF5C86',
  text:      '#e8faf5',  // high-contrast body (>7:1 on bg)
  textDim:   '#9dc4bb',  // secondary (>4.5:1 on bg)
  textMute:  '#6b8f88',  // tertiary / timestamps
} as const;

export function scoreColor(score: number): string {
  if (score >= 80) return COLORS.primary;
  if (score >= 50) return COLORS.warn;
  return COLORS.crit;
}

// Soft translucent track matching the score color.
export function scoreTrack(score: number): string {
  if (score >= 80) return 'rgba(0,224,172,0.10)';
  if (score >= 50) return 'rgba(255,194,75,0.10)';
  return 'rgba(255,92,134,0.10)';
}

export function overallVerdict(score: number): { title: string; sub: string } {
  if (score >= 90) return { title: 'System Healthy',   sub: 'Nothing urgent to clean' };
  if (score >= 70) return { title: 'Minor Cleanup',    sub: 'A few things worth clearing' };
  if (score >= 50) return { title: 'Attention Needed', sub: 'Reclaimable space building up' };
  return { title: 'Cleanup Recommended', sub: 'Several categories need action' };
}

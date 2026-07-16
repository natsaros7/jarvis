import type { CategoryScan } from '../types.js';
import { type ExecFn, defaultExec, linearScore } from './utils.js';

// Score: 100 at ≥100 GB free, 0 at ≤20 GB free
function scoreDisk(freeGB: number): number {
  return linearScore(freeGB, 20, 100);
}

export async function scanDisk(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  try {
    const { stdout } = await exec('df -k /');
    // df -k output line 2: Filesystem 1K-blocks Used Available Use% Mountpoint
    const parts = stdout.trim().split('\n')[1]?.split(/\s+/);
    if (!parts || parts.length < 4) throw new Error('Unexpected df output');
    const availableKB = parseInt(parts[3], 10);
    const totalKB = parseInt(parts[1], 10);
    const freeGB = availableKB / 1024 / 1024;
    const totalGB = totalKB / 1024 / 1024;
    const usedGB = totalGB - freeGB;

    return {
      category: 'disk',
      score: scoreDisk(freeGB),
      metrics: {
        freeGB: parseFloat(freeGB.toFixed(1)),
        usedGB: parseFloat(usedGB.toFixed(1)),
        totalGB: parseFloat(totalGB.toFixed(1)),
      },
      actions: [], // disk has no direct cleanup actions — it's an indicator
    };
  } catch (e) {
    return { category: 'disk', score: 0, metrics: {}, actions: [], error: String(e) };
  }
}

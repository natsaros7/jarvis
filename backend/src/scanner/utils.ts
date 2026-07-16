import { exec as nodeExec } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';

export const execAsync = promisify(nodeExec);
export type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string }>;
export const defaultExec: ExecFn = (cmd) => execAsync(cmd, { timeout: 30_000 });
export const HOME = homedir();

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function linearScore(value: number, worstVal: number, bestVal: number): number {
  const ratio = (value - worstVal) / (bestVal - worstVal);
  return Math.round(clamp(ratio * 100, 0, 100));
}

// Parse "12G", "342M", "1.5T" → bytes
export function parseHumanBytes(s: string): number {
  const match = s.trim().match(/^([\d.]+)\s*([KMGT]?)B?$/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = { '': 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
  return Math.round(val * (multipliers[unit] ?? 1));
}

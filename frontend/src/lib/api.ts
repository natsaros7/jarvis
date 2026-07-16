import { ScanResult, GitScan } from '../types';

export async function fetchScan(): Promise<ScanResult> {
  const res = await fetch('/api/scan');
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
  return res.json();
}

export async function fetchGit(): Promise<GitScan> {
  const res = await fetch('/api/scan/git');
  if (!res.ok) throw new Error(`Git scan failed: ${res.status}`);
  return res.json();
}

export async function triggerRun(): Promise<void> {
  const res = await fetch('/api/run', { method: 'POST' });
  if (res.status === 409) throw new Error('Engine already running');
  if (!res.ok) throw new Error(`Run failed: ${res.status}`);
}

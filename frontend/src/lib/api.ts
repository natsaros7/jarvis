import { ScanResult, GitScan } from '../types';

// Direct to backend — CORS is enabled for localhost:5173.
// Vite proxy can't reliably handle SSE + concurrent fetches on the same HTTP/1.1 target.
const API = 'http://localhost:3001';

export async function fetchScan(): Promise<ScanResult> {
  const res = await fetch(`${API}/api/scan`);
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
  return res.json();
}

export async function fetchGit(): Promise<GitScan> {
  const res = await fetch(`${API}/api/scan/git`);
  if (!res.ok) throw new Error(`Git scan failed: ${res.status}`);
  return res.json();
}

export async function triggerRun(): Promise<void> {
  const res = await fetch(`${API}/api/run`, { method: 'POST' });
  if (res.status === 409) throw new Error('Engine already running');
  if (!res.ok) throw new Error(`Run failed: ${res.status}`);
}

export async function runGitClean(command: string): Promise<boolean> {
  const res = await fetch(`${API}/api/git-clean`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  return res.ok;
}

export const SSE_URL = `${API}/api/events`;

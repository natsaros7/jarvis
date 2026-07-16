import { Router, Request, Response } from 'express';
import { scanDisk } from '../scanner/disk.js';
import { scanDocker } from '../scanner/docker.js';
import { scanCaches } from '../scanner/caches.js';
import { scanBuilds } from '../scanner/builds.js';
import { scanProcess } from '../scanner/process.js';
import { scanGit } from '../scanner/git.js';
import { computeScores } from '../planner.js';
import type { ScanResult, GitScan } from '../types.js';

export const scanRouter = Router();

const CACHE_TTL_MS = 30_000;

let scanCache: { result: ScanResult; ts: number } | null = null;
let scanInFlight: Promise<ScanResult> | null = null;

let gitCache: { result: GitScan; ts: number } | null = null;
let gitInFlight: Promise<GitScan> | null = null;

async function runScan(): Promise<ScanResult> {
  const [disk, docker, caches, builds, process_] = await Promise.all([
    scanDisk(), scanDocker(), scanCaches(), scanBuilds(), scanProcess(),
  ]);
  const categories = [disk, docker, caches, builds, process_];
  return { categories, scores: computeScores(categories), scannedAt: Date.now() };
}

async function runGitScan(): Promise<GitScan> {
  return scanGit();
}

// Fast scan — 5 categories, ~800ms. Cached 30s; concurrent callers share one in-flight request.
scanRouter.get('/', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (scanCache && now - scanCache.ts < CACHE_TTL_MS) {
    res.json(scanCache.result); return;
  }
  if (!scanInFlight) {
    scanInFlight = runScan().then(r => {
      scanCache = { result: r, ts: Date.now() };
      scanInFlight = null;
      return r;
    }).catch(e => { scanInFlight = null; throw e; });
  }
  try {
    res.json(await scanInFlight);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Git scan — slow (~10s). Cached 30s; concurrent callers share one in-flight request.
scanRouter.get('/git', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (gitCache && now - gitCache.ts < CACHE_TTL_MS) {
    res.json(gitCache.result); return;
  }
  if (!gitInFlight) {
    gitInFlight = runGitScan().then(r => {
      gitCache = { result: r, ts: Date.now() };
      gitInFlight = null;
      return r;
    }).catch(e => { gitInFlight = null; throw e; });
  }
  try {
    res.json(await gitInFlight);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

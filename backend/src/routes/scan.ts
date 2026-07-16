import { Router, Request, Response } from 'express';
import { scanDisk } from '../scanner/disk.js';
import { scanDocker } from '../scanner/docker.js';
import { scanCaches } from '../scanner/caches.js';
import { scanBuilds } from '../scanner/builds.js';
import { scanProcess } from '../scanner/process.js';
import { scanGit } from '../scanner/git.js';
import { computeScores } from '../planner.js';
import type { ScanResult } from '../types.js';

export const scanRouter = Router();

scanRouter.get('/', async (_req: Request, res: Response) => {
  const [disk, docker, caches, builds, process_, git] = await Promise.all([
    scanDisk(), scanDocker(), scanCaches(), scanBuilds(), scanProcess(), scanGit(),
  ]);

  const categories = [disk, docker, caches, builds, process_];
  const result: ScanResult = {
    categories,
    git,
    scores: computeScores(categories),
    scannedAt: Date.now(),
  };

  res.json(result);
});

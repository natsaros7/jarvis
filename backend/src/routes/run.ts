import { Router, Request, Response } from 'express';
import { scanDisk } from '../scanner/disk.js';
import { scanDocker } from '../scanner/docker.js';
import { scanCaches } from '../scanner/caches.js';
import { scanBuilds } from '../scanner/builds.js';
import { scanProcess } from '../scanner/process.js';
import { runEngine } from '../evaluator.js';
import { bus, isRunning, setRunning } from '../bus.js';

export const runRouter = Router();

runRouter.post('/', async (_req: Request, res: Response) => {
  if (isRunning) {
    res.status(409).json({ error: 'Engine already running' });
    return;
  }

  setRunning(true);
  res.status(202).json({ message: 'Engine started — connect to /api/events for live updates' });

  try {
    const [disk, docker, caches, builds, process_] = await Promise.all([
      scanDisk(), scanDocker(), scanCaches(), scanBuilds(), scanProcess(),
    ]);
    await runEngine([disk, docker, caches, builds, process_], (event) => bus.broadcast(event));
  } finally {
    setRunning(false);
  }
});

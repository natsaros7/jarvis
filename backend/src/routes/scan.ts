import { Router, Request, Response } from 'express';
import { scanCategory, scanGitHygiene, CATEGORIES } from '../scanner/registry.js';
import { computeScores } from '../planner.js';
import type { Category } from '../types.js';

export const scanRouter = Router();

// GET /api/scan/git?force=1 — must be declared before /:category
scanRouter.get('/git', async (req: Request, res: Response) => {
  try {
    res.json(await scanGitHygiene(req.query['force'] === '1'));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/scan/:category?force=1 — single category, returns CategoryScan
scanRouter.get('/:category', async (req: Request, res: Response) => {
  const category = String(req.params['category'] ?? '');
  if (!CATEGORIES.includes(category as Category)) {
    res.status(400).json({ error: `Unknown category: ${category}` }); return;
  }
  try {
    res.json(await scanCategory(category as Category, req.query['force'] === '1'));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/scan — all categories + scores in one shot (used by the run/plan flow)
scanRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await Promise.all(CATEGORIES.map(c => scanCategory(c)));
    res.json({ categories, scores: computeScores(categories), scannedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

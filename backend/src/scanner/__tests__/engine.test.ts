import { describe, it, expect } from 'vitest';
import type { CategoryScan, JarvisEvent } from '../../types.js';

describe('runEngine', () => {
  it('emits PLANNING then COMPLETE for a plan with no actions', async () => {
    const { runEngine } = await import('../../evaluator.js');

    const scans: CategoryScan[] = [
      { category: 'disk',    score: 90, metrics: {}, actions: [] },
      { category: 'docker',  score: 90, metrics: {}, actions: [] },
      { category: 'caches',  score: 90, metrics: {}, actions: [] },
      { category: 'builds',  score: 90, metrics: {}, actions: [] },
      { category: 'process', score: 90, metrics: {}, actions: [] },
    ];

    const events: JarvisEvent[] = [];
    await runEngine(scans, e => events.push(e));

    expect(events[0].phase).toBe('PLANNING');
    expect(events[events.length - 1].phase).toBe('COMPLETE');
  });
});

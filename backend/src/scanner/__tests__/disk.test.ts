import { describe, it, expect } from 'vitest';
import { scanDisk } from '../disk.js';

const mockDfOutput = `Filesystem    1024-blocks      Used Available Capacity iused      ifree %iused  Mounted on
/dev/disk3s5s1 976490568 345678900 524567890    40%  5555555 2621440000    0%   /`;

describe('scanDisk', () => {
  it('parses df output and returns disk metrics', async () => {
    const mockExec = async (_cmd: string) => ({ stdout: mockDfOutput, stderr: '' });
    const result = await scanDisk(mockExec);
    expect(result.category).toBe('disk');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.actions).toHaveLength(0); // disk has no actions
    expect(result.metrics).toHaveProperty('freeGB');
    expect(result.metrics).toHaveProperty('totalGB');
  });

  it('returns score 0 and error when df fails', async () => {
    const mockExec = async (_cmd: string) => { throw new Error('df failed'); };
    const result = await scanDisk(mockExec);
    expect(result.score).toBe(0);
    expect(result.error).toBeDefined();
  });
});

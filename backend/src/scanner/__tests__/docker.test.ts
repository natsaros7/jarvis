import { describe, it, expect } from 'vitest';
import { scanDocker } from '../docker.js';

const mockDockerDf = `TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          10        3         10GB      5GB (50%)
Containers      2         2         100MB     0B (0%)
Local Volumes   5         2         2GB       1GB (50%)
Build Cache     20        0         8GB       8GB`;

describe('scanDocker', () => {
  it('parses reclaimable values and generates actions', async () => {
    const mockExec = async (cmd: string) => {
      if (cmd === 'docker info') return { stdout: 'ok', stderr: '' };
      return { stdout: mockDockerDf, stderr: '' };
    };
    const result = await scanDocker(mockExec);
    expect(result.category).toBe('docker');
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.actions.find(a => a.id === 'docker-builder-prune')).toBeDefined();
  });

  it('returns score 100 and DAEMON_OFFLINE error when docker is not running', async () => {
    const mockExec = async () => { throw new Error('Cannot connect to the Docker daemon'); };
    const result = await scanDocker(mockExec);
    expect(result.error).toBe('DAEMON_OFFLINE');
    expect(result.score).toBe(100);
  });
});

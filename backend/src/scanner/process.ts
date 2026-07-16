import type { CategoryScan } from '../types.js';
import { type ExecFn, defaultExec, linearScore } from './utils.js';

// Score: 100 at load ≤2.0, 0 at load ≥8.0
function scoreProcess(load1m: number): number {
  return linearScore(-load1m, -8, -2);
}

export async function scanProcess(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  try {
    const [loadOut, psOut] = await Promise.all([
      exec("sysctl -n vm.loadavg | awk '{print $2}'"),
      exec("ps -Ao pid,comm,pcpu,pmem --no-headers 2>/dev/null | sort -k3 -rn | head -5"),
    ]);

    const load1m = parseFloat(loadOut.stdout.trim()) || 0;

    const topProcs = psOut.stdout.trim().split('\n').map(line => {
      const parts = line.trim().split(/\s+/);
      return { pid: parts[0], name: parts[1], cpu: parts[2], mem: parts[3] };
    });

    return {
      category: 'process',
      score: scoreProcess(load1m),
      metrics: { load1m, topProcesses: JSON.stringify(topProcs) },
      actions: [], // process is read-only
    };
  } catch (e) {
    return { category: 'process', score: 50, metrics: {}, actions: [], error: String(e) };
  }
}

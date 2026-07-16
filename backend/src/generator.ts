import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { RemediationTask, JarvisEvent } from './types.js';

const execAsync = promisify(exec);

type Emit = (event: JarvisEvent) => void;

export async function executeTask(task: RemediationTask, emit: Emit): Promise<number> {
  emit({ phase: 'EXECUTING', taskId: task.id, label: task.label, status: 'start' });

  try {
    await execAsync(task.command, { timeout: 60_000 });
    emit({
      phase: 'EXECUTING',
      taskId: task.id,
      label: task.label,
      status: 'done',
      reclaimedBytes: task.estimatedReclaimBytes,
    });
    return task.estimatedReclaimBytes;
  } catch (e) {
    emit({ phase: 'FAILED', taskId: task.id, reason: String(e) });
    return 0;
  }
}

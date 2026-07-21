import { EventEmitter } from 'node:events';
import type { PurgeEvent } from './types.js';

class PurgeBus extends EventEmitter {
  emit(event: 'purge', data: PurgeEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  broadcast(event: PurgeEvent): void {
    this.emit('purge', event);
  }
}

export const bus = new PurgeBus();
export let isRunning = false;
export function setRunning(val: boolean): void {
  isRunning = val;
}

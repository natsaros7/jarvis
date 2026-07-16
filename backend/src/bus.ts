import { EventEmitter } from 'node:events';
import type { JarvisEvent } from './types.js';

class JarvisBus extends EventEmitter {
  emit(event: 'jarvis', data: JarvisEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  broadcast(event: JarvisEvent): void {
    this.emit('jarvis', event);
  }
}

export const bus = new JarvisBus();
export let isRunning = false;
export function setRunning(val: boolean): void {
  isRunning = val;
}

import { Router, Request, Response } from 'express';
import { bus } from '../bus.js';
import type { JarvisEvent } from '../types.js';

export const eventsRouter = Router();

eventsRouter.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: JarvisEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  bus.on('jarvis', send);

  req.on('close', () => {
    bus.off('jarvis', send);
    res.end();
  });
});

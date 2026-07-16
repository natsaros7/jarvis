import express from 'express';
import cors from 'cors';
import { scanRouter } from './routes/scan.js';
import { runRouter } from './routes/run.js';
import { eventsRouter } from './routes/events.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/scan', scanRouter);
app.use('/api/run', runRouter);
app.use('/api/events', eventsRouter);

app.post('/api/git-clean', async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command || typeof command !== 'string') {
    res.status(400).json({ error: 'Missing command' });
    return;
  }
  if (!command.startsWith('rm ') && !command.startsWith('git ')) {
    res.status(403).json({ error: 'Command not allowed' });
    return;
  }
  try {
    const { execAsync } = await import('./scanner/utils.js');
    await execAsync(command);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`JARVIS backend online :${PORT}`));

# JARVIS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a JARVIS-themed macOS system health monitor with a Plan/Generator/Evaluator autonomous remediation loop, streaming live to an Iron Man HUD frontend.

**Architecture:** Node.js + Express backend executes shell commands and broadcasts SSE events; React + Vite frontend renders the HUD. A P/G/E engine scans, plans, executes, and evaluates cleanup tasks autonomously. A global EventEmitter acts as the SSE bus between the run route and connected clients.

**Tech Stack:** Node.js 20+, Express 4, TypeScript 5.7, tsx (dev), Vitest, React 19, Vite 6, Tailwind v4 (@tailwindcss/vite), Framer Motion 12, Phosphor Icons, concurrently (root)

## Global Constraints

- macOS only — uses `df`, `ps`, `top -l`, `brew`, `docker`, `git` CLI
- Node.js ≥ 20, TypeScript strict mode in both workspaces
- Backend port: 3001. Frontend port: 5173. Frontend proxies `/api/*` to backend.
- No always-on daemon — started manually with `npm run dev`
- Git panel is advisory only — never auto-executes cleanup
- P/G/E loop max 2 replan cycles per task before marking FAILED and continuing
- All shell commands run via `child_process.exec` with a 30s timeout
- JARVIS colour tokens: base `#080c14`, grid `#0d1f35`, blue `#00c8ff`, warning `#f59e0b`, critical `#ef4444`, success `#10b981`, font: JetBrains Mono

---

## File Map

```
jarvis/
├── package.json                              ← root workspace + concurrently
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types.ts                          ← all shared backend types
│       ├── index.ts                          ← Express app entry, mounts routes
│       ├── bus.ts                            ← EventEmitter SSE bus singleton
│       ├── scanner/
│       │   ├── disk.ts
│       │   ├── docker.ts
│       │   ├── caches.ts
│       │   ├── builds.ts
│       │   ├── process.ts
│       │   └── git.ts
│       ├── planner.ts
│       ├── generator.ts
│       ├── evaluator.ts
│       └── routes/
│           ├── scan.ts
│           ├── run.ts
│           └── events.ts
├── backend/src/scanner/__tests__/
│   ├── disk.test.ts
│   ├── docker.test.ts
│   └── planner.test.ts
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css                         ← Tailwind v4 @import + @theme tokens
│       ├── types.ts                          ← mirror of backend types (no import)
│       ├── lib/api.ts
│       ├── hooks/
│       │   ├── useSSE.ts
│       │   └── useScan.ts
│       └── components/
│           ├── hud/
│           │   ├── JarvisOrb.tsx
│           │   ├── ArcMeter.tsx
│           │   ├── AlertBanner.tsx
│           │   └── ActionLog.tsx
│           └── panels/
│               ├── DiskPanel.tsx
│               ├── DockerPanel.tsx
│               ├── CachePanel.tsx
│               ├── ProcessPanel.tsx
│               └── GitPanel.tsx
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts` (stub)
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx` (stub)
- Create: `frontend/src/index.css`

**Interfaces:**
- Produces: `npm run dev` at root starts both services. Backend responds `GET /api/health → 200 { ok: true }`. Frontend renders `<h1>JARVIS ONLINE</h1>` at `http://localhost:5173`.

- [ ] **Step 1: Write root package.json**

```json
{
  "name": "jarvis",
  "private": true,
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev": "concurrently -n backend,frontend -c cyan,magenta \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w frontend",
    "lint": "npm run lint -w backend && npm run lint -w frontend",
    "typecheck": "npm run typecheck -w backend && npm run typecheck -w frontend"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Write backend/package.json**

```json
{
  "name": "backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Write backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write backend/src/index.ts stub**

```typescript
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`JARVIS backend online :${PORT}`));
```

- [ ] **Step 5: Write frontend/package.json**

```json
{
  "name": "frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@phosphor-icons/react": "^2.1.10",
    "framer-motion": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 6: Write frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Write frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 8: Write frontend/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>J·A·R·V·I·S</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Write frontend/src/index.css**

```css
@import "tailwindcss";

@theme {
  --color-jarvis-base: #080c14;
  --color-jarvis-grid: #0d1f35;
  --color-stark-blue: #00c8ff;
  --color-stark-blue-dim: #0088aa;
  --color-warning: #f59e0b;
  --color-critical: #ef4444;
  --color-success: #10b981;
  --color-text-primary: #e2e8f0;
  --color-text-dim: #4a6580;
  --font-family-mono: "JetBrains Mono", monospace;
}

* { font-family: var(--font-family-mono); }
body { background: var(--color-jarvis-base); color: var(--color-text-primary); }
```

- [ ] **Step 10: Write frontend/src/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 11: Write frontend/src/App.tsx stub**

```tsx
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-stark-blue text-2xl tracking-widest">JARVIS ONLINE</h1>
    </div>
  );
}
```

- [ ] **Step 12: Install dependencies and verify**

```bash
cd ~/Developer/projects/personal/jarvis
npm install
npm run dev
```

Expected: Two processes start. Terminal shows `JARVIS backend online :3001`. Browser at `http://localhost:5173` shows "JARVIS ONLINE" in cyan on dark background.

Verify backend health:
```bash
curl http://localhost:3001/api/health
# Expected: {"ok":true}
```

- [ ] **Step 13: Commit**

```bash
git add .
git commit -m "feat: scaffold monorepo with backend Express stub and frontend Vite+React+Tailwind"
git push
```

---

## Task 2: Core Types

**Files:**
- Create: `backend/src/types.ts`
- Create: `frontend/src/types.ts`

**Interfaces:**
- Produces: All type contracts used by every subsequent task. Both files are independent — no imports between them.

- [ ] **Step 1: Write backend/src/types.ts**

```typescript
export type Category = 'disk' | 'docker' | 'caches' | 'builds' | 'process';

export interface RemediationAction {
  id: string;
  label: string;
  command: string;
  estimatedReclaimBytes: number;
  category: Category;
}

export interface CategoryScan {
  category: Category;
  score: number; // 0–100
  metrics: Record<string, number | string>;
  actions: RemediationAction[];
  error?: string;
}

export interface GitFinding {
  type: 'stale-branch' | 'large-untracked' | 'old-worktree';
  path: string;
  detail: string;
  cleanCommand: string;
}

export interface GitScan {
  findings: GitFinding[];
  error?: string;
}

export interface CategoryScores {
  disk: number;
  docker: number;
  caches: number;
  builds: number;
  process: number;
  overall: number;
}

export interface RemediationTask {
  id: string;
  label: string;
  command: string;
  estimatedReclaimBytes: number;
  category: Category;
  status: 'pending' | 'executing' | 'pass' | 'fail';
  actualReclaimBytes: number;
  replanCount: number;
}

export interface RemediationPlan {
  tasks: RemediationTask[];
  scores: CategoryScores;
  createdAt: number;
}

export interface CompleteSummary {
  totalReclaimedBytes: number;
  passCount: number;
  failCount: number;
  newScores: CategoryScores;
  durationMs: number;
}

export type JarvisEvent =
  | { phase: 'PLANNING'; scores: CategoryScores }
  | { phase: 'EXECUTING'; taskId: string; label: string; status: 'start' | 'done'; reclaimedBytes?: number }
  | { phase: 'EVALUATING'; category: Category; passed: boolean; newScore: number }
  | { phase: 'REPLANNING'; cycle: number; tasksRemaining: number }
  | { phase: 'COMPLETE'; summary: CompleteSummary }
  | { phase: 'FAILED'; taskId: string; reason: string };

export interface ScanResult {
  categories: CategoryScan[];
  git: GitScan;
  scores: CategoryScores;
  scannedAt: number;
}
```

- [ ] **Step 2: Write frontend/src/types.ts** (mirror — no imports from backend)

Copy the exact same content as `backend/src/types.ts`. Both files must stay in sync manually — they are intentionally duplicated to avoid build coupling between workspaces.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npm run typecheck -w backend
npm run typecheck -w frontend
```

Expected: Both exit 0 with no output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/types.ts frontend/src/types.ts
git commit -m "feat: add shared type contracts for scanner, P/G/E engine, and SSE events"
git push
```

---

## Task 3: Scanner Modules

**Files:**
- Create: `backend/src/scanner/disk.ts`
- Create: `backend/src/scanner/docker.ts`
- Create: `backend/src/scanner/caches.ts`
- Create: `backend/src/scanner/builds.ts`
- Create: `backend/src/scanner/process.ts`
- Create: `backend/src/scanner/git.ts`
- Create: `backend/src/scanner/__tests__/disk.test.ts`
- Create: `backend/src/scanner/__tests__/docker.test.ts`
- Create: `backend/src/scanner/__tests__/scoring.test.ts`

**Interfaces:**
- Consumes: `backend/src/types.ts` — `CategoryScan`, `GitScan`, `RemediationAction`, `GitFinding`
- Produces: `scanDisk(exec?)`, `scanDocker(exec?)`, `scanCaches(exec?)`, `scanBuilds(exec?)`, `scanProcess(exec?)`, `scanGit(exec?)` — all async, all accept optional `ExecFn` for testing

- [ ] **Step 1: Write the shared exec helper and scoring utilities used by all scanners**

Create `backend/src/scanner/utils.ts`:

```typescript
import { exec as nodeExec } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';

export const execAsync = promisify(nodeExec);
export type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string }>;
export const defaultExec: ExecFn = (cmd) => execAsync(cmd, { timeout: 30_000 });
export const HOME = homedir();

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function linearScore(value: number, worstVal: number, bestVal: number): number {
  const ratio = (value - worstVal) / (bestVal - worstVal);
  return Math.round(clamp(ratio * 100, 0, 100));
}

// Parse "12G", "342M", "1.5T" → bytes
export function parseHumanBytes(s: string): number {
  const match = s.trim().match(/^([\d.]+)\s*([KMGT]?)B?$/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = { '': 1, K: 1024, M: 1024**2, G: 1024**3, T: 1024**4 };
  return Math.round(val * (multipliers[unit] ?? 1));
}
```

- [ ] **Step 2: Write failing tests for scoring utilities**

Create `backend/src/scanner/__tests__/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { linearScore, parseHumanBytes, clamp } from '../utils.js';

describe('linearScore', () => {
  it('returns 100 at best value', () => {
    expect(linearScore(100, 20, 100)).toBe(100);
  });
  it('returns 0 at worst value', () => {
    expect(linearScore(20, 20, 100)).toBe(0);
  });
  it('returns 50 at midpoint', () => {
    expect(linearScore(60, 20, 100)).toBe(50);
  });
  it('clamps below 0', () => {
    expect(linearScore(0, 20, 100)).toBe(0);
  });
  it('clamps above 100', () => {
    expect(linearScore(200, 20, 100)).toBe(100);
  });
});

describe('parseHumanBytes', () => {
  it('parses GB', () => expect(parseHumanBytes('1.5G')).toBe(1_610_612_736));
  it('parses MB', () => expect(parseHumanBytes('512M')).toBe(536_870_912));
  it('parses KB', () => expect(parseHumanBytes('100K')).toBe(102_400));
  it('returns 0 for invalid', () => expect(parseHumanBytes('??')).toBe(0));
});
```

- [ ] **Step 3: Run tests — expect FAIL (utils.ts not yet importable)**

```bash
npm run test -w backend
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 4: Run tests — expect PASS after utils.ts is written**

```bash
npm run test -w backend
```

Expected: All scoring tests PASS.

- [ ] **Step 5: Write backend/src/scanner/disk.ts**

```typescript
import { CategoryScan, RemediationAction } from '../types.js';
import { ExecFn, defaultExec, HOME, linearScore } from './utils.js';

// Score: 100 at ≥100 GB free, 0 at ≤20 GB free
function scoreDisk(freeGB: number): number {
  return linearScore(freeGB, 20, 100);
}

export async function scanDisk(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  try {
    const { stdout } = await exec('df -k /');
    // df -k output line 2: Filesystem 1K-blocks Used Available Use% Mountpoint
    const parts = stdout.trim().split('\n')[1]?.split(/\s+/);
    if (!parts || parts.length < 4) throw new Error('Unexpected df output');
    const availableKB = parseInt(parts[3], 10);
    const totalKB = parseInt(parts[1], 10);
    const freeGB = availableKB / 1024 / 1024;
    const totalGB = totalKB / 1024 / 1024;
    const usedGB = totalGB - freeGB;

    return {
      category: 'disk',
      score: scoreDisk(freeGB),
      metrics: {
        freeGB: parseFloat(freeGB.toFixed(1)),
        usedGB: parseFloat(usedGB.toFixed(1)),
        totalGB: parseFloat(totalGB.toFixed(1)),
      },
      actions: [], // disk has no direct cleanup actions — it's an indicator
    };
  } catch (e) {
    return { category: 'disk', score: 0, metrics: {}, actions: [], error: String(e) };
  }
}
```

- [ ] **Step 6: Write backend/src/scanner/docker.ts**

```typescript
import { CategoryScan, RemediationAction } from '../types.js';
import { ExecFn, defaultExec, linearScore } from './utils.js';

// Score: 100 at 0 GB reclaimable, 0 at ≥20 GB reclaimable
function scoreDocker(reclaimableGB: number): number {
  return linearScore(-reclaimableGB, -20, 0);
}

function parseReclaimable(line: string): number {
  // e.g. "11.32GB (31%)" → bytes
  const match = line.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return val * 1024 ** 3;
  if (unit === 'MB') return val * 1024 ** 2;
  if (unit === 'KB') return val * 1024;
  return val;
}

export async function scanDocker(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  try {
    await exec('docker info'); // throws if daemon is down
    const { stdout } = await exec('docker system df');
    const lines = stdout.trim().split('\n');

    let imageReclaimable = 0;
    let buildReclaimable = 0;
    let volumeReclaimable = 0;

    for (const line of lines) {
      if (line.startsWith('Images')) imageReclaimable = parseReclaimable(line.split(/\s{2,}/)[3] ?? '');
      if (line.startsWith('Build Cache')) buildReclaimable = parseReclaimable(line.split(/\s{2,}/)[3] ?? '');
      if (line.startsWith('Local Volumes')) volumeReclaimable = parseReclaimable(line.split(/\s{2,}/)[3] ?? '');
    }

    const totalReclaimable = imageReclaimable + buildReclaimable + volumeReclaimable;
    const totalGB = totalReclaimable / 1024 ** 3;

    const actions: RemediationAction[] = [];
    if (buildReclaimable > 0)
      actions.push({ id: 'docker-builder-prune', label: 'Prune Docker build cache', command: 'docker builder prune -af', estimatedReclaimBytes: buildReclaimable, category: 'docker' });
    if (imageReclaimable > 0)
      actions.push({ id: 'docker-image-prune', label: 'Prune dangling images', command: 'docker image prune -f', estimatedReclaimBytes: imageReclaimable, category: 'docker' });
    if (volumeReclaimable > 0)
      actions.push({ id: 'docker-volume-prune', label: 'Prune unused volumes', command: 'docker volume prune -f', estimatedReclaimBytes: volumeReclaimable, category: 'docker' });

    return {
      category: 'docker',
      score: scoreDocker(totalGB),
      metrics: { imageReclaimableGB: parseFloat((imageReclaimable / 1024 ** 3).toFixed(2)), buildReclaimableGB: parseFloat((buildReclaimable / 1024 ** 3).toFixed(2)), volumeReclaimableGB: parseFloat((volumeReclaimable / 1024 ** 3).toFixed(2)) },
      actions,
    };
  } catch (e) {
    const isDaemonDown = String(e).includes('Cannot connect') || String(e).includes('daemon');
    return { category: 'docker', score: isDaemonDown ? 100 : 0, metrics: { daemonOnline: isDaemonDown ? 0 : 1 }, actions: [], error: isDaemonDown ? 'DAEMON_OFFLINE' : String(e) };
  }
}
```

- [ ] **Step 7: Write backend/src/scanner/caches.ts**

```typescript
import { CategoryScan, RemediationAction } from '../types.js';
import { ExecFn, defaultExec, HOME, linearScore } from './utils.js';

const CACHE_DIRS: { id: string; label: string; path: string; command: string }[] = [
  { id: 'jetbrains', label: 'JetBrains caches', path: `${HOME}/Library/Caches/JetBrains`, command: `rm -rf "${HOME}/Library/Caches/JetBrains/"*` },
  { id: 'homebrew', label: 'Homebrew cache', path: `${HOME}/Library/Caches/Homebrew`, command: 'brew cleanup --prune=all' },
  { id: 'playwright', label: 'Playwright browsers', path: `${HOME}/Library/Caches/ms-playwright`, command: `rm -rf "${HOME}/Library/Caches/ms-playwright" "${HOME}/Library/Caches/ms-playwright-go"` },
  { id: 'pip', label: 'pip cache', path: `${HOME}/Library/Caches/pip`, command: 'pip cache purge' },
  { id: 'pnpm', label: 'pnpm cache', path: `${HOME}/Library/Caches/pnpm`, command: `rm -rf "${HOME}/Library/Caches/pnpm"` },
  { id: 'colima', label: 'colima cache', path: `${HOME}/Library/Caches/colima`, command: `rm -rf "${HOME}/Library/Caches/colima"` },
];

// Score: 100 at ≤0.5 GB total, 0 at ≥15 GB total
function scoreCaches(totalGB: number): number {
  return linearScore(-totalGB, -15, -0.5);
}

export async function scanCaches(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  const actions: RemediationAction[] = [];
  let totalBytes = 0;
  const metrics: Record<string, number> = {};

  for (const dir of CACHE_DIRS) {
    try {
      const { stdout } = await exec(`du -sk "${dir.path}" 2>/dev/null || echo "0"`);
      const kb = parseInt(stdout.trim().split(/\s+/)[0], 10) || 0;
      const bytes = kb * 1024;
      totalBytes += bytes;
      metrics[dir.id + 'GB'] = parseFloat((bytes / 1024 ** 3).toFixed(3));
      if (bytes > 10 * 1024 * 1024) // only surface if > 10 MB
        actions.push({ id: dir.id, label: dir.label, command: dir.command, estimatedReclaimBytes: bytes, category: 'caches' });
    } catch { /* skip inaccessible dirs */ }
  }

  return {
    category: 'caches',
    score: scoreCaches(totalBytes / 1024 ** 3),
    metrics: { totalGB: parseFloat((totalBytes / 1024 ** 3).toFixed(2)), ...metrics },
    actions,
  };
}
```

- [ ] **Step 8: Write backend/src/scanner/builds.ts**

```typescript
import { CategoryScan, RemediationAction } from '../types.js';
import { ExecFn, defaultExec, HOME, linearScore } from './utils.js';

const BUILD_PATTERNS = [
  `${HOME}/Developer/projects/crrd/*/target`,
  `${HOME}/Developer/projects/crrd/crrd-nssim/load-tests/target`,
  `${HOME}/Developer/projects/crrd/crrd-ui/dist`,
  `${HOME}/Developer/projects/etias/*/target`,
  `${HOME}/Developer/projects/personal/*/target`,
  `${HOME}/Developer/projects/personal/*/*/target`,
  `${HOME}/Developer/projects/personal/*/dist`,
  `${HOME}/Developer/projects/personal/*/*/dist`,
  `${HOME}/Developer/projects/personal/rbnbook/frontend/.next`,
  `${HOME}/Developer/projects/personal/signal/.worktrees/*/target`,
];

// Score: 100 at ≤0.2 GB, 0 at ≥5 GB
function scoreBuilds(totalGB: number): number {
  return linearScore(-totalGB, -5, -0.2);
}

export async function scanBuilds(exec: ExecFn = defaultExec): Promise<CategoryScan> {
  const actions: RemediationAction[] = [];
  let totalBytes = 0;

  for (const pattern of BUILD_PATTERNS) {
    try {
      const { stdout } = await exec(`du -sk ${pattern} 2>/dev/null`);
      for (const line of stdout.trim().split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split(/\s+/);
        const kb = parseInt(parts[0], 10);
        const path = parts.slice(1).join(' ');
        if (!kb || !path) continue;
        const bytes = kb * 1024;
        totalBytes += bytes;
        actions.push({ id: `build-${Buffer.from(path).toString('base64').slice(0, 12)}`, label: path.replace(HOME, '~'), command: `rm -rf "${path}"`, estimatedReclaimBytes: bytes, category: 'builds' });
      }
    } catch { /* glob matched nothing */ }
  }

  // Sort largest first
  actions.sort((a, b) => b.estimatedReclaimBytes - a.estimatedReclaimBytes);

  return {
    category: 'builds',
    score: scoreBuilds(totalBytes / 1024 ** 3),
    metrics: { totalGB: parseFloat((totalBytes / 1024 ** 3).toFixed(2)), dirCount: actions.length },
    actions,
  };
}
```

- [ ] **Step 9: Write backend/src/scanner/process.ts**

```typescript
import { CategoryScan } from '../types.js';
import { ExecFn, defaultExec, linearScore } from './utils.js';

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
```

- [ ] **Step 10: Write backend/src/scanner/git.ts**

```typescript
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { GitFinding, GitScan } from '../types.js';
import { ExecFn, defaultExec, HOME } from './utils.js';

const PROJECT_ROOTS = [
  `${HOME}/Developer/projects/crrd`,
  `${HOME}/Developer/projects/etias`,
  `${HOME}/Developer/projects/personal`,
];

const STALE_DAYS = 30;
const LARGE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const OLD_WORKTREE_DAYS = 7;

export async function scanGit(exec: ExecFn = defaultExec): Promise<GitScan> {
  const findings: GitFinding[] = [];

  for (const root of PROJECT_ROOTS) {
    let projects: string[] = [];
    try {
      const entries = await readdir(root, { withFileTypes: true });
      projects = entries.filter(e => e.isDirectory()).map(e => join(root, e.name));
    } catch { continue; }

    for (const projectPath of projects) {
      // Stale branches
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - STALE_DAYS);
        const { stdout } = await exec(
          `git -C "${projectPath}" branch -r --merged HEAD --format="%(refname:short) %(committerdate:iso)" 2>/dev/null`
        );
        for (const line of stdout.trim().split('\n')) {
          if (!line.trim() || line.includes('HEAD') || line.includes('main') || line.includes('master')) continue;
          const parts = line.trim().split(' ');
          const branch = parts[0];
          const dateStr = parts.slice(1).join(' ');
          if (new Date(dateStr) < cutoff) {
            findings.push({ type: 'stale-branch', path: projectPath.replace(HOME, '~'), detail: branch, cleanCommand: `git -C "${projectPath}" push origin --delete ${branch.replace('origin/', '')}` });
          }
        }
      } catch { /* not a git repo or no remote */ }

      // Large untracked files
      try {
        const { stdout } = await exec(`git -C "${projectPath}" ls-files --others --exclude-standard 2>/dev/null`);
        for (const file of stdout.trim().split('\n')) {
          if (!file.trim()) continue;
          const fullPath = join(projectPath, file);
          try {
            const s = await stat(fullPath);
            if (s.size >= LARGE_FILE_BYTES) {
              findings.push({ type: 'large-untracked', path: fullPath.replace(HOME, '~'), detail: `${(s.size / 1024 / 1024).toFixed(1)} MB`, cleanCommand: `rm -f "${fullPath}"` });
            }
          } catch { /* file gone */ }
        }
      } catch { /* skip */ }

      // Old worktrees
      const worktreeBase = join(projectPath, '.claude', 'worktrees');
      try {
        const entries = await readdir(worktreeBase, { withFileTypes: true });
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - OLD_WORKTREE_DAYS);
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          const s = await stat(join(worktreeBase, e.name));
          if (s.mtime < cutoff) {
            findings.push({ type: 'old-worktree', path: join(worktreeBase, e.name).replace(HOME, '~'), detail: `last modified ${s.mtime.toLocaleDateString()}`, cleanCommand: `rm -rf "${join(worktreeBase, e.name)}"` });
          }
        }
      } catch { /* no worktrees dir */ }
    }
  }

  return { findings };
}
```

- [ ] **Step 11: Write backend/src/scanner/__tests__/docker.test.ts**

```typescript
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
```

- [ ] **Step 12: Run all backend tests**

```bash
npm run test -w backend
```

Expected: All tests PASS.

- [ ] **Step 13: Commit**

```bash
git add backend/src/scanner/
git commit -m "feat: add scanner modules for disk, docker, caches, builds, process, git"
git push
```

---

## Task 4: Planner

**Files:**
- Create: `backend/src/planner.ts`
- Create: `backend/src/scanner/__tests__/planner.test.ts`

**Interfaces:**
- Consumes: `CategoryScan[]` from scanner modules; `CategoryScores`, `RemediationPlan`, `RemediationTask` from `types.ts`
- Produces: `buildPlan(scans: CategoryScan[]): RemediationPlan`, `computeScores(scans: CategoryScan[]): CategoryScores`

- [ ] **Step 1: Write failing test for planner**

Create `backend/src/scanner/__tests__/planner.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildPlan, computeScores } from '../planner.js';
import { CategoryScan } from '../types.js';

const mockScans: CategoryScan[] = [
  { category: 'disk', score: 80, metrics: {}, actions: [] },
  { category: 'docker', score: 40, metrics: {}, actions: [
    { id: 'docker-builder-prune', label: 'Prune build cache', command: 'docker builder prune -af', estimatedReclaimBytes: 9 * 1024**3, category: 'docker' },
    { id: 'docker-image-prune', label: 'Prune images', command: 'docker image prune -f', estimatedReclaimBytes: 1 * 1024**3, category: 'docker' },
  ]},
  { category: 'caches', score: 60, metrics: {}, actions: [
    { id: 'jetbrains', label: 'JetBrains', command: 'rm -rf ~/Library/Caches/JetBrains/*', estimatedReclaimBytes: 7 * 1024**3, category: 'caches' },
  ]},
  { category: 'builds', score: 90, metrics: {}, actions: [] },
  { category: 'process', score: 70, metrics: {}, actions: [] },
];

describe('computeScores', () => {
  it('weights scores correctly', () => {
    const scores = computeScores(mockScans);
    // disk*0.35 + docker*0.25 + caches*0.20 + process*0.15 + builds*0.05
    // 80*0.35 + 40*0.25 + 60*0.20 + 70*0.15 + 90*0.05
    // 28 + 10 + 12 + 10.5 + 4.5 = 65
    expect(scores.overall).toBe(65);
    expect(scores.disk).toBe(80);
  });
});

describe('buildPlan', () => {
  it('sorts tasks by estimatedReclaimBytes descending', () => {
    const plan = buildPlan(mockScans);
    expect(plan.tasks[0].estimatedReclaimBytes).toBeGreaterThanOrEqual(plan.tasks[1].estimatedReclaimBytes);
  });

  it('initialises all tasks as pending with replanCount 0', () => {
    const plan = buildPlan(mockScans);
    plan.tasks.forEach(t => {
      expect(t.status).toBe('pending');
      expect(t.replanCount).toBe(0);
      expect(t.actualReclaimBytes).toBe(0);
    });
  });

  it('excludes categories with no actions', () => {
    const plan = buildPlan(mockScans);
    expect(plan.tasks.length).toBe(3); // docker×2 + caches×1
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -w backend
```

Expected: FAIL — "Cannot find module planner.js"

- [ ] **Step 3: Write backend/src/planner.ts**

```typescript
import { CategoryScan, CategoryScores, RemediationPlan, RemediationTask } from './types.js';

const WEIGHTS: Record<string, number> = {
  disk: 0.35,
  docker: 0.25,
  caches: 0.20,
  process: 0.15,
  builds: 0.05,
};

export function computeScores(scans: CategoryScan[]): CategoryScores {
  const byCategory = Object.fromEntries(scans.map(s => [s.category, s.score]));
  const overall = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [cat, w]) => sum + (byCategory[cat] ?? 0) * w, 0)
  );
  return {
    disk: byCategory['disk'] ?? 0,
    docker: byCategory['docker'] ?? 0,
    caches: byCategory['caches'] ?? 0,
    builds: byCategory['builds'] ?? 0,
    process: byCategory['process'] ?? 0,
    overall,
  };
}

export function buildPlan(scans: CategoryScan[]): RemediationPlan {
  const allActions = scans.flatMap(s => s.actions);
  // Sort by estimated reclaim descending — biggest wins first
  allActions.sort((a, b) => b.estimatedReclaimBytes - a.estimatedReclaimBytes);

  const tasks: RemediationTask[] = allActions.map(action => ({
    ...action,
    status: 'pending',
    actualReclaimBytes: 0,
    replanCount: 0,
  }));

  return { tasks, scores: computeScores(scans), createdAt: Date.now() };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -w backend
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/planner.ts backend/src/scanner/__tests__/planner.test.ts
git commit -m "feat: add planner — scores categories and builds ordered remediation task list"
git push
```

---

## Task 5: Generator, Evaluator & SSE Bus

**Files:**
- Create: `backend/src/bus.ts`
- Create: `backend/src/generator.ts`
- Create: `backend/src/evaluator.ts`
- Create: `backend/src/scanner/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `RemediationPlan`, `RemediationTask`, `JarvisEvent`, `CategoryScores` from `types.ts`; `buildPlan`, `computeScores` from `planner.ts`; scanner functions
- Produces: `bus` (EventEmitter), `runEngine(plan, emit)` — the full P/G/E loop

- [ ] **Step 1: Write backend/src/bus.ts**

```typescript
import { EventEmitter } from 'node:events';
import { JarvisEvent } from './types.js';

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
export function setRunning(val: boolean): void { isRunning = val; }
```

- [ ] **Step 2: Write backend/src/generator.ts**

```typescript
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { RemediationTask, JarvisEvent } from './types.js';

const execAsync = promisify(exec);

type Emit = (event: JarvisEvent) => void;

export async function executeTask(task: RemediationTask, emit: Emit): Promise<number> {
  emit({ phase: 'EXECUTING', taskId: task.id, label: task.label, status: 'start' });

  try {
    await execAsync(task.command, { timeout: 60_000 });
    // Re-scan to get actual reclaim is done by evaluator
    emit({ phase: 'EXECUTING', taskId: task.id, label: task.label, status: 'done', reclaimedBytes: task.estimatedReclaimBytes });
    return task.estimatedReclaimBytes;
  } catch (e) {
    emit({ phase: 'FAILED', taskId: task.id, reason: String(e) });
    return 0;
  }
}
```

- [ ] **Step 3: Write backend/src/evaluator.ts**

```typescript
import { Category, CategoryScan, JarvisEvent, RemediationTask } from './types.js';
import { scanDisk } from './scanner/disk.js';
import { scanDocker } from './scanner/docker.js';
import { scanCaches } from './scanner/caches.js';
import { scanBuilds } from './scanner/builds.js';
import { scanProcess } from './scanner/process.js';
import { buildPlan, computeScores } from './planner.js';

type Emit = (event: JarvisEvent) => void;

const SCORE_IMPROVEMENT_THRESHOLD = 2; // points
const MAX_REPLAN_CYCLES = 2;

async function rescanCategory(category: Category): Promise<CategoryScan> {
  switch (category) {
    case 'disk': return scanDisk();
    case 'docker': return scanDocker();
    case 'caches': return scanCaches();
    case 'builds': return scanBuilds();
    case 'process': return scanProcess();
  }
}

export async function runEngine(
  initialScans: CategoryScan[],
  emit: Emit
): Promise<void> {
  const { buildPlan: _build, computeScores: _compute } = await import('./planner.js');

  let currentScans = [...initialScans];
  let plan = buildPlan(currentScans);
  const startTime = Date.now();
  let totalReclaimed = 0;
  let passCount = 0;
  let failCount = 0;

  emit({ phase: 'PLANNING', scores: plan.scores });

  const { executeTask } = await import('./generator.js');

  let taskIndex = 0;
  while (taskIndex < plan.tasks.length) {
    const task = plan.tasks[taskIndex];

    const prevScan = currentScans.find(s => s.category === task.category);
    const prevScore = prevScan?.score ?? 0;

    await executeTask(task, emit);

    // Evaluate
    const freshScan = await rescanCategory(task.category);
    const improved = freshScan.score >= prevScore + SCORE_IMPROVEMENT_THRESHOLD;

    emit({ phase: 'EVALUATING', category: task.category, passed: improved, newScore: freshScan.score });

    if (improved) {
      totalReclaimed += task.estimatedReclaimBytes;
      passCount++;
      // Update currentScans with fresh data
      currentScans = currentScans.map(s => s.category === task.category ? freshScan : s);
      taskIndex++;
    } else {
      task.replanCount++;
      if (task.replanCount > MAX_REPLAN_CYCLES) {
        emit({ phase: 'FAILED', taskId: task.id, reason: `Score did not improve after ${MAX_REPLAN_CYCLES} replan cycles` });
        failCount++;
        taskIndex++;
      } else {
        // Replan remaining tasks
        currentScans = currentScans.map(s => s.category === task.category ? freshScan : s);
        const remaining = plan.tasks.slice(taskIndex);
        const newPlan = buildPlan(currentScans);
        // Merge replan counts
        plan.tasks = [
          ...plan.tasks.slice(0, taskIndex),
          ...newPlan.tasks.map(t => ({
            ...t,
            replanCount: remaining.find(r => r.id === t.id)?.replanCount ?? 0,
          })),
        ];
        emit({ phase: 'REPLANNING', cycle: task.replanCount, tasksRemaining: plan.tasks.length - taskIndex });
      }
    }
  }

  const finalScores = computeScores(currentScans);
  emit({
    phase: 'COMPLETE',
    summary: { totalReclaimedBytes: totalReclaimed, passCount, failCount, newScores: finalScores, durationMs: Date.now() - startTime },
  });
}
```

- [ ] **Step 4: Write engine test**

Create `backend/src/scanner/__tests__/engine.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { CategoryScan, JarvisEvent } from '../types.js';

// Minimal smoke test — verifies the engine emits PLANNING and COMPLETE
describe('runEngine', () => {
  it('emits PLANNING then COMPLETE for a plan with no actions', async () => {
    const { runEngine } = await import('../evaluator.js');

    const scans: CategoryScan[] = [
      { category: 'disk', score: 90, metrics: {}, actions: [] },
      { category: 'docker', score: 90, metrics: {}, actions: [] },
      { category: 'caches', score: 90, metrics: {}, actions: [] },
      { category: 'builds', score: 90, metrics: {}, actions: [] },
      { category: 'process', score: 90, metrics: {}, actions: [] },
    ];

    const events: JarvisEvent[] = [];
    const emit = (e: JarvisEvent) => events.push(e);

    await runEngine(scans, emit);

    expect(events[0].phase).toBe('PLANNING');
    expect(events[events.length - 1].phase).toBe('COMPLETE');
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test -w backend
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/bus.ts backend/src/generator.ts backend/src/evaluator.ts backend/src/scanner/__tests__/engine.test.ts
git commit -m "feat: add P/G/E engine — bus, generator, evaluator with replan loop"
git push
```

---

## Task 6: Backend Routes & Server Assembly

**Files:**
- Create: `backend/src/routes/scan.ts`
- Create: `backend/src/routes/run.ts`
- Create: `backend/src/routes/events.ts`
- Modify: `backend/src/index.ts`

**Interfaces:**
- Consumes: all scanner modules, `runEngine`, `bus`, `isRunning`, `setRunning`, `buildPlan`, `computeScores`
- Produces: `GET /api/scan → ScanResult`, `POST /api/run → 202 | 409`, `GET /api/events → SSE stream`

- [ ] **Step 1: Write backend/src/routes/events.ts**

```typescript
import { Router, Request, Response } from 'express';
import { bus } from '../bus.js';
import { JarvisEvent } from '../types.js';

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
```

- [ ] **Step 2: Write backend/src/routes/scan.ts**

```typescript
import { Router, Request, Response } from 'express';
import { scanDisk } from '../scanner/disk.js';
import { scanDocker } from '../scanner/docker.js';
import { scanCaches } from '../scanner/caches.js';
import { scanBuilds } from '../scanner/builds.js';
import { scanProcess } from '../scanner/process.js';
import { scanGit } from '../scanner/git.js';
import { computeScores } from '../planner.js';
import { ScanResult } from '../types.js';

export const scanRouter = Router();

scanRouter.get('/', async (_req: Request, res: Response) => {
  const [disk, docker, caches, builds, process_, git] = await Promise.all([
    scanDisk(), scanDocker(), scanCaches(), scanBuilds(), scanProcess(), scanGit(),
  ]);

  const categories = [disk, docker, caches, builds, process_];
  const result: ScanResult = {
    categories,
    git,
    scores: computeScores(categories),
    scannedAt: Date.now(),
  };

  res.json(result);
});
```

- [ ] **Step 3: Write backend/src/routes/run.ts**

```typescript
import { Router, Request, Response } from 'express';
import { scanDisk } from '../scanner/disk.js';
import { scanDocker } from '../scanner/docker.js';
import { scanCaches } from '../scanner/caches.js';
import { scanBuilds } from '../scanner/builds.js';
import { scanProcess } from '../scanner/process.js';
import { runEngine } from '../evaluator.js';
import { bus, isRunning, setRunning } from '../bus.js';

export const runRouter = Router();

runRouter.post('/', async (_req: Request, res: Response) => {
  if (isRunning) {
    res.status(409).json({ error: 'Engine already running' });
    return;
  }

  setRunning(true);
  res.status(202).json({ message: 'Engine started — connect to /api/events for live updates' });

  try {
    const [disk, docker, caches, builds, process_] = await Promise.all([
      scanDisk(), scanDocker(), scanCaches(), scanBuilds(), scanProcess(),
    ]);
    await runEngine([disk, docker, caches, builds, process_], (event) => bus.broadcast(event));
  } finally {
    setRunning(false);
  }
});
```

- [ ] **Step 4: Update backend/src/index.ts to mount all routes**

```typescript
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

const PORT = 3001;
app.listen(PORT, () => console.log(`JARVIS backend online :${PORT}`));
```

- [ ] **Step 5: Verify all routes respond**

```bash
npm run dev -w backend &
sleep 3
curl -s http://localhost:3001/api/health | grep '"ok":true'
curl -s http://localhost:3001/api/scan | grep '"scannedAt"'
```

Expected: Both grep matches succeed.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/ backend/src/index.ts
git commit -m "feat: add Express routes — scan, run, events SSE"
git push
```

---

## Task 7: Frontend Foundation (hooks + api)

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useSSE.ts`
- Create: `frontend/src/hooks/useScan.ts`

**Interfaces:**
- Consumes: `frontend/src/types.ts` — `ScanResult`, `JarvisEvent`
- Produces: `fetchScan(): Promise<ScanResult>`, `triggerRun(): Promise<void>`, `useSSE(onEvent)`, `useScan()` returning `{ scan, loading, error, refetch }`

- [ ] **Step 1: Write frontend/src/lib/api.ts**

```typescript
import { ScanResult } from '../types';

export async function fetchScan(): Promise<ScanResult> {
  const res = await fetch('/api/scan');
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
  return res.json();
}

export async function triggerRun(): Promise<void> {
  const res = await fetch('/api/run', { method: 'POST' });
  if (res.status === 409) throw new Error('Engine already running');
  if (!res.ok) throw new Error(`Run failed: ${res.status}`);
}
```

- [ ] **Step 2: Write frontend/src/hooks/useSSE.ts**

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { JarvisEvent } from '../types';

export function useSSE(onEvent: (event: JarvisEvent) => void) {
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retries = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const es = new EventSource('/api/events');
    esRef.current = es;

    es.onopen = () => { setConnected(true); retries.current = 0; };

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as JarvisEvent;
        onEventRef.current(event);
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      if (retries.current < 5) {
        retries.current++;
        setTimeout(connect, 2000 * retries.current);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);

  return { connected };
}
```

- [ ] **Step 3: Write frontend/src/hooks/useScan.ts**

```typescript
import { useState, useCallback, useEffect } from 'react';
import { ScanResult } from '../types';
import { fetchScan } from '../lib/api';

export function useScan() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchScan();
      setScan(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { scan, loading, error, refetch };
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck -w frontend
```

Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ frontend/src/hooks/
git commit -m "feat: add frontend api client and useSSE/useScan hooks"
git push
```

---

## Task 8: JARVIS HUD Core Components

**Files:**
- Create: `frontend/src/components/hud/JarvisOrb.tsx`
- Create: `frontend/src/components/hud/ArcMeter.tsx`
- Create: `frontend/src/components/hud/AlertBanner.tsx`
- Create: `frontend/src/components/hud/ActionLog.tsx`

**Interfaces:**
- Consumes: `JarvisEvent['phase']`, score numbers, Framer Motion
- Produces: `<JarvisOrb score={n} phase={p} />`, `<ArcMeter score={n} label={s} value={s} />`, `<AlertBanner phase={p} />`, `<ActionLog entries={LogEntry[]} />`

- [ ] **Step 1: Write frontend/src/components/hud/JarvisOrb.tsx**

```tsx
import { motion } from 'framer-motion';

type Phase = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'EVALUATING' | 'REPLANNING' | 'COMPLETE' | 'FAILED';

interface Props { score: number; phase: Phase; }

function orbColor(score: number): string {
  if (score >= 80) return '#00c8ff';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function JarvisOrb({ score, phase }: Props) {
  const color = orbColor(score);
  const isActive = phase !== 'IDLE' && phase !== 'COMPLETE';

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 opacity-30"
        style={{ borderColor: color }}
        animate={{ rotate: isActive ? 360 : 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute inset-4 rounded-full border opacity-50"
        style={{ borderColor: color }}
        animate={{ rotate: isActive ? -360 : 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
      />
      {/* Core */}
      <motion.div
        className="absolute inset-8 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`, border: `1px solid ${color}` }}
        animate={{ opacity: [0.7, 1, 0.7], scale: phase === 'EXECUTING' ? [1, 1.05, 1] : 1 }}
        transition={{ duration: phase === 'EXECUTING' ? 0.8 : 3, repeat: Infinity }}
      />
      {/* Score */}
      <div className="relative z-10 text-center">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-text-dim tracking-widest mt-1">OVERALL</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write frontend/src/components/hud/ArcMeter.tsx**

```tsx
import { motion } from 'framer-motion';

interface Props { score: number; label: string; value: string; size?: number; }

function arcColor(score: number): string {
  if (score >= 80) return '#00c8ff';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function ArcMeter({ score, label, value, size = 100 }: Props) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = arcColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0d1f35" strokeWidth={6} />
        {/* Arc */}
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ - dash}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          animate={{ strokeDashoffset: circ - dash, stroke: color }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size * 0.22} fontFamily="JetBrains Mono">
          {score}
        </text>
      </svg>
      <div className="text-xs text-text-dim tracking-widest uppercase">{label}</div>
      <div className="text-xs font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Write frontend/src/components/hud/AlertBanner.tsx**

```tsx
import { AnimatePresence, motion } from 'framer-motion';

type Phase = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'EVALUATING' | 'REPLANNING' | 'COMPLETE' | 'FAILED';

const MESSAGES: Record<Phase, string | null> = {
  IDLE: null,
  PLANNING: 'INITIATING DIAGNOSTIC SEQUENCE',
  EXECUTING: 'REMEDIATION IN PROGRESS',
  EVALUATING: 'EVALUATING SUBSYSTEMS',
  REPLANNING: 'TARGET UNRESPONSIVE — REPLANNING',
  COMPLETE: 'ALL SYSTEMS NOMINAL',
  FAILED: 'SUBSYSTEM FAILURE — SEE LOG',
};

const COLORS: Partial<Record<Phase, string>> = {
  COMPLETE: '#10b981',
  FAILED: '#ef4444',
  REPLANNING: '#f59e0b',
};

interface Props { phase: Phase; }

export function AlertBanner({ phase }: Props) {
  const message = MESSAGES[phase];
  const color = COLORS[phase] ?? '#00c8ff';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={phase}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full text-center py-2 text-xs tracking-[0.3em] font-bold border-b"
          style={{ color, borderColor: `${color}44`, background: `${color}11` }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Write frontend/src/components/hud/ActionLog.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

const TYPE_COLORS = { info: '#00c8ff', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };

interface Props { entries: LogEntry[]; }

export function ActionLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="h-48 overflow-y-auto bg-jarvis-grid/50 rounded border border-jarvis-grid p-3 space-y-1">
      <AnimatePresence initial={false}>
        {entries.map(entry => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs flex gap-2"
          >
            <span className="text-text-dim shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
            </span>
            <span style={{ color: TYPE_COLORS[entry.type] }}>{'>'}</span>
            <span style={{ color: TYPE_COLORS[entry.type] }}>{entry.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck -w frontend
```

Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/hud/
git commit -m "feat: add JARVIS HUD core components — Orb, ArcMeter, AlertBanner, ActionLog"
git push
```

---

## Task 9: System Panel Components

**Files:**
- Create: `frontend/src/components/panels/DiskPanel.tsx`
- Create: `frontend/src/components/panels/DockerPanel.tsx`
- Create: `frontend/src/components/panels/CachePanel.tsx`
- Create: `frontend/src/components/panels/ProcessPanel.tsx`

**Interfaces:**
- Consumes: `CategoryScan` from `types.ts`; `ArcMeter` from hud
- Produces: `<DiskPanel scan={CategoryScan} />` etc. — each panel renders its ArcMeter + key metrics

- [ ] **Step 1: Write a shared PanelShell component**

Create `frontend/src/components/panels/PanelShell.tsx`:

```tsx
import { ReactNode } from 'react';

interface Props { title: string; children: ReactNode; error?: string; }

export function PanelShell({ title, children, error }: Props) {
  return (
    <div className="bg-jarvis-grid/30 border border-jarvis-grid rounded p-4 flex flex-col gap-3">
      <div className="text-xs tracking-widest text-text-dim uppercase">{title}</div>
      {error
        ? <div className="text-xs text-critical">{error}</div>
        : children}
    </div>
  );
}
```

- [ ] **Step 2: Write frontend/src/components/panels/DiskPanel.tsx**

```tsx
import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function DiskPanel({ scan }: Props) {
  const freeGB = scan.metrics['freeGB'] as number ?? 0;
  const totalGB = scan.metrics['totalGB'] as number ?? 0;
  return (
    <PanelShell title="Disk" error={scan.error && scan.error !== 'DAEMON_OFFLINE' ? scan.error : undefined}>
      <ArcMeter score={scan.score} label="free" value={`${freeGB} GB`} />
      <div className="text-xs text-text-dim text-center">{totalGB} GB total</div>
    </PanelShell>
  );
}
```

- [ ] **Step 3: Write frontend/src/components/panels/DockerPanel.tsx**

```tsx
import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function DockerPanel({ scan }: Props) {
  const isDaemonDown = scan.error === 'DAEMON_OFFLINE';
  const buildGB = scan.metrics['buildReclaimableGB'] as number ?? 0;
  const imageGB = scan.metrics['imageReclaimableGB'] as number ?? 0;
  const volumeGB = scan.metrics['volumeReclaimableGB'] as number ?? 0;
  const totalGB = parseFloat((buildGB + imageGB + volumeGB).toFixed(2));

  if (isDaemonDown) {
    return (
      <PanelShell title="Docker">
        <div className="text-xs text-warning text-center tracking-widest">DAEMON OFFLINE</div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="Docker">
      <ArcMeter score={scan.score} label="reclaimable" value={`${totalGB} GB`} />
      <div className="text-xs text-text-dim space-y-0.5">
        <div className="flex justify-between"><span>Build cache</span><span>{buildGB} GB</span></div>
        <div className="flex justify-between"><span>Images</span><span>{imageGB} GB</span></div>
        <div className="flex justify-between"><span>Volumes</span><span>{volumeGB} GB</span></div>
      </div>
    </PanelShell>
  );
}
```

- [ ] **Step 4: Write frontend/src/components/panels/CachePanel.tsx**

```tsx
import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function CachePanel({ scan }: Props) {
  const totalGB = scan.metrics['totalGB'] as number ?? 0;
  const items = Object.entries(scan.metrics)
    .filter(([k]) => k !== 'totalGB')
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 4);

  return (
    <PanelShell title="Caches">
      <ArcMeter score={scan.score} label="total" value={`${totalGB} GB`} />
      <div className="text-xs text-text-dim space-y-0.5">
        {items.map(([key, val]) => (
          <div key={key} className="flex justify-between">
            <span>{key.replace('GB', '')}</span>
            <span>{(val as number).toFixed(2)} GB</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
```

- [ ] **Step 5: Write frontend/src/components/panels/ProcessPanel.tsx**

```tsx
import { CategoryScan } from '../../types';
import { ArcMeter } from '../hud/ArcMeter';
import { PanelShell } from './PanelShell';

interface Props { scan: CategoryScan; }

export function ProcessPanel({ scan }: Props) {
  const load = scan.metrics['load1m'] as number ?? 0;
  let procs: { pid: string; name: string; cpu: string; mem: string }[] = [];
  try { procs = JSON.parse(scan.metrics['topProcesses'] as string ?? '[]'); } catch { /* ignore */ }

  return (
    <PanelShell title="Process">
      <ArcMeter score={scan.score} label="load avg" value={`${load.toFixed(2)}`} />
      <div className="text-xs text-text-dim space-y-0.5">
        {procs.slice(0, 4).map((p) => (
          <div key={p.pid} className="flex justify-between gap-2">
            <span className="truncate max-w-[80px]">{p.name}</span>
            <span className="shrink-0">{p.cpu}% CPU</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
```

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck -w frontend
```

Expected: Exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/panels/
git commit -m "feat: add system panel components — disk, docker, caches, process"
git push
```

---

## Task 10: Git Panel + App Assembly

**Files:**
- Create: `frontend/src/components/panels/GitPanel.tsx`
- Modify: `frontend/src/App.tsx` (full implementation)

**Interfaces:**
- Consumes: all panels, all hud components, `useScan`, `useSSE`, `triggerRun`, `GitScan`, `JarvisEvent`, `LogEntry`
- Produces: complete running JARVIS HUD at `http://localhost:5173`

- [ ] **Step 1: Write frontend/src/components/panels/GitPanel.tsx**

```tsx
import { useState } from 'react';
import { GitFinding, GitScan } from '../../types';
import { GitBranch, File, FolderOpen } from '@phosphor-icons/react';

interface Props { git: GitScan; }

const ICONS = { 'stale-branch': GitBranch, 'large-untracked': File, 'old-worktree': FolderOpen };
const LABELS = { 'stale-branch': 'Stale branch', 'large-untracked': 'Large untracked', 'old-worktree': 'Old worktree' };

function FindingRow({ finding }: { finding: GitFinding }) {
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState(false);
  const Icon = ICONS[finding.type];

  const handleClean = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    await fetch('/api/git-clean', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: finding.cleanCommand }) });
    setDone(true);
  };

  if (done) return null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-warning/10 last:border-0">
      <Icon size={14} className="text-warning shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-warning">{LABELS[finding.type]}</div>
        <div className="text-xs text-text-dim truncate">{finding.path}</div>
        <div className="text-xs text-text-dim">{finding.detail}</div>
      </div>
      <button
        onClick={handleClean}
        className="shrink-0 text-xs px-2 py-1 border rounded transition-colors"
        style={{ borderColor: confirmed ? '#ef4444' : '#f59e0b', color: confirmed ? '#ef4444' : '#f59e0b' }}
      >
        {confirmed ? 'CONFIRM' : 'CLEAN'}
      </button>
    </div>
  );
}

export function GitPanel({ git }: Props) {
  const byType = {
    'stale-branch': git.findings.filter(f => f.type === 'stale-branch'),
    'large-untracked': git.findings.filter(f => f.type === 'large-untracked'),
    'old-worktree': git.findings.filter(f => f.type === 'old-worktree'),
  };

  return (
    <div className="border-t border-warning/20 mt-4 pt-4">
      <div className="flex items-center gap-4 mb-3">
        <span className="text-xs tracking-widest text-warning font-bold">{'// GIT HYGIENE'}</span>
        <span className="text-xs text-text-dim">
          {Object.entries(byType).map(([t, f]) => f.length > 0 ? `${t.replace('-', ' ')} ×${f.length}` : null).filter(Boolean).join('  ·  ')}
        </span>
      </div>
      {git.error && <div className="text-xs text-critical">{git.error}</div>}
      {git.findings.length === 0 && !git.error && (
        <div className="text-xs text-text-dim">No findings — git hygiene nominal.</div>
      )}
      <div>
        {git.findings.map((f, i) => <FindingRow key={i} finding={f} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add git-clean route to backend**

Add to `backend/src/index.ts` after existing routes:

```typescript
app.post('/api/git-clean', async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command || typeof command !== 'string') { res.status(400).json({ error: 'Missing command' }); return; }
  // Safety: only allow rm and git commands
  if (!command.startsWith('rm ') && !command.startsWith('git ')) { res.status(403).json({ error: 'Command not allowed' }); return; }
  try {
    const { execAsync } = await import('./scanner/utils.js');
    await execAsync(command);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
```

- [ ] **Step 3: Write the full frontend/src/App.tsx**

```tsx
import { useState, useCallback } from 'react';
import { JarvisEvent, ScanResult, CategoryScan } from './types';
import { useScan } from './hooks/useScan';
import { useSSE } from './hooks/useSSE';
import { triggerRun } from './lib/api';
import { JarvisOrb } from './components/hud/JarvisOrb';
import { AlertBanner } from './components/hud/AlertBanner';
import { ActionLog, LogEntry } from './components/hud/ActionLog';
import { DiskPanel } from './components/panels/DiskPanel';
import { DockerPanel } from './components/panels/DockerPanel';
import { CachePanel } from './components/panels/CachePanel';
import { ProcessPanel } from './components/panels/ProcessPanel';
import { GitPanel } from './components/panels/GitPanel';
import { ArrowsClockwise, Play } from '@phosphor-icons/react';

type Phase = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'EVALUATING' | 'REPLANNING' | 'COMPLETE' | 'FAILED';

function categoryToLabel(c: string): string {
  return { disk: 'Disk', docker: 'Docker', caches: 'Cache', builds: 'Builds', process: 'Process' }[c] ?? c;
}

export default function App() {
  const { scan, loading, refetch } = useScan();
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [liveScan, setLiveScan] = useState<ScanResult | null>(null);

  const addLog = useCallback((text: string, type: LogEntry['type']) => {
    setLog(prev => [...prev.slice(-99), { id: `${Date.now()}-${Math.random()}`, text, type, timestamp: Date.now() }]);
  }, []);

  const handleEvent = useCallback((event: JarvisEvent) => {
    switch (event.phase) {
      case 'PLANNING':
        setPhase('PLANNING');
        addLog('Diagnostic scan complete — building remediation plan', 'info');
        break;
      case 'EXECUTING':
        setPhase('EXECUTING');
        if (event.status === 'start') addLog(`Executing: ${event.label}`, 'info');
        if (event.status === 'done') addLog(`Done: ${event.label} — ${event.reclaimedBytes ? `+${(event.reclaimedBytes / 1024 ** 3).toFixed(2)} GB reclaimed` : 'complete'}`, 'success');
        break;
      case 'EVALUATING':
        setPhase('EVALUATING');
        addLog(`Evaluating ${categoryToLabel(event.category)}: ${event.passed ? `PASS (score ${event.newScore})` : 'FAIL — replanning'}`, event.passed ? 'success' : 'warning');
        break;
      case 'REPLANNING':
        setPhase('REPLANNING');
        addLog(`Replanning — cycle ${event.cycle}, ${event.tasksRemaining} tasks remaining`, 'warning');
        break;
      case 'COMPLETE':
        setPhase('COMPLETE');
        addLog(`All systems processed — ${(event.summary.totalReclaimedBytes / 1024 ** 3).toFixed(2)} GB reclaimed, ${event.summary.passCount} pass, ${event.summary.failCount} fail`, 'success');
        refetch();
        setTimeout(() => setPhase('IDLE'), 5000);
        break;
      case 'FAILED':
        setPhase('FAILED');
        addLog(`Task failed: ${event.reason}`, 'error');
        break;
    }
  }, [addLog, refetch]);

  useSSE(handleEvent);

  const handleInitiate = async () => {
    if (phase !== 'IDLE') return;
    setLog([]);
    addLog('Initiating JARVIS diagnostic sequence...', 'info');
    await triggerRun();
  };

  const displayScan = liveScan ?? scan;
  const scores = displayScan?.scores;
  const cats = displayScan?.categories ?? [];
  const getByCat = (cat: string): CategoryScan =>
    cats.find(c => c.category === cat) ?? { category: cat as any, score: 0, metrics: {}, actions: [] };

  const isRunning = phase !== 'IDLE' && phase !== 'COMPLETE';

  return (
    <div className="min-h-screen bg-jarvis-base text-text-primary">
      {/* Holographic grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-5"
        style={{ backgroundImage: 'linear-gradient(#00c8ff 1px, transparent 1px), linear-gradient(90deg, #00c8ff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-jarvis-grid">
          <div className="text-stark-blue tracking-[0.5em] font-bold text-sm">J·A·R·V·I·S</div>
          <div className="text-text-dim text-xs tracking-widest">SYSTEM DIAGNOSTICS</div>
          <div className="flex gap-2">
            <button onClick={refetch} disabled={isRunning} className="p-2 border border-jarvis-grid rounded hover:border-stark-blue transition-colors disabled:opacity-30">
              <ArrowsClockwise size={14} className="text-text-dim" />
            </button>
            <button onClick={handleInitiate} disabled={isRunning} className="flex items-center gap-2 px-4 py-2 border border-stark-blue text-stark-blue text-xs tracking-widest rounded hover:bg-stark-blue/10 transition-colors disabled:opacity-30">
              <Play size={12} weight="fill" />
              {isRunning ? phase : 'INITIATE'}
            </button>
          </div>
        </header>

        <AlertBanner phase={phase} />

        {/* Main HUD */}
        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-stark-blue tracking-widest text-sm animate-pulse">
              SCANNING SUBSYSTEMS...
            </div>
          ) : (
            <>
              <div className="flex gap-6">
                {/* Orb */}
                <div className="flex items-start justify-center pt-4">
                  <JarvisOrb score={scores?.overall ?? 0} phase={phase} />
                </div>

                {/* Panels + Log */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="grid grid-cols-4 gap-3">
                    <DiskPanel scan={getByCat('disk')} />
                    <DockerPanel scan={getByCat('docker')} />
                    <CachePanel scan={getByCat('caches')} />
                    <ProcessPanel scan={getByCat('process')} />
                  </div>
                  <ActionLog entries={log} />
                </div>
              </div>

              {/* Git section */}
              {displayScan?.git && <GitPanel git={displayScan.git} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Final typecheck and run**

```bash
npm run typecheck
npm run dev
```

Open `http://localhost:5173`. Expected: Full JARVIS HUD renders with arc meters, orb, and git panel. Click INITIATE — engine runs, log streams live.

- [ ] **Step 5: Commit and push**

```bash
git add frontend/src/App.tsx frontend/src/components/panels/GitPanel.tsx backend/src/index.ts
git commit -m "feat: complete JARVIS HUD — App assembly, git panel, full P/G/E integration"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ On-demand (`npm run dev`)
- ✅ Full auto P/G/E loop (Tasks 4–6)
- ✅ 5 monitored categories + git advisory (Tasks 3, 9, 10)
- ✅ SSE streaming (Tasks 5–7)
- ✅ JARVIS HUD — Orb, ArcMeter, AlertBanner, ActionLog (Task 8)
- ✅ Git panel visually separate, amber accent, manual confirm (Task 10)
- ✅ Max 2 replan cycles (Task 5 evaluator.ts)
- ✅ Docker daemon-offline handling (Task 3 docker.ts)
- ✅ Health scoring with weights (Task 4 planner.ts)
- ✅ JetBrains Mono font, JARVIS colour tokens (Task 1 index.css)

**Placeholder scan:** None found.

**Type consistency:**
- `CategoryScan.actions` (not `remediations`) used consistently across all tasks
- `JarvisEvent` union matches between backend `types.ts` and frontend `types.ts`
- `ExecFn` signature `(cmd) => Promise<{stdout, stderr}>` consistent across all scanners

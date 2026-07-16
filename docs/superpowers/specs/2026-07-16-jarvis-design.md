# JARVIS — System Health Monitor: Design Spec
**Date:** 2026-07-16  
**Author:** Nikos Atsaros  
**Status:** Approved

---

## 1. Overview

JARVIS is an on-demand macOS system health monitor with an Iron Man HUD aesthetic. It scans the local machine for disk bloat, Docker waste, stale caches, process pressure, and git hygiene issues — then autonomously remediates them using a Plan / Generator / Evaluator loop. The same P/G/E pattern is used to build the tool itself.

Open it when you need it. It does the rest.

---

## 2. Goals

- Surface system health across 5 dimensions in a single glance
- Auto-remediate all safe categories (disk, Docker, caches, build outputs) without prompting
- Surface git hygiene findings as advisory-only with manual confirm per action
- Stream every step of the remediation loop live to the UI via SSE
- Be fast to open, fast to scan, fun to watch

---

## 3. Non-Goals

- Always-on daemon / background service
- macOS notifications or launchd integration
- Multi-machine monitoring
- Auto-executing git cleanup actions

---

## 4. Architecture

### 4.1 Project Structure

```
jarvis/
├── package.json              ← root: concurrently starts backend + frontend
├── backend/
│   ├── src/
│   │   ├── index.ts          ← Express server, route mounting
│   │   ├── scanner/
│   │   │   ├── disk.ts       ← df, du on key paths
│   │   │   ├── docker.ts     ← docker system df, image ls, volume ls
│   │   │   ├── caches.ts     ← JetBrains, Homebrew, pip, pnpm, Playwright, colima
│   │   │   ├── builds.ts     ← find target/dist/.next under ~/Developer/projects
│   │   │   ├── process.ts    ← CPU/RAM via top -l 1, top ps consumers
│   │   │   └── git.ts        ← stale branches, large untracked files, old worktrees
│   │   ├── planner.ts        ← scores categories, produces ordered RemediationTask[]
│   │   ├── generator.ts      ← executes tasks one at a time, emits SSE events
│   │   ├── evaluator.ts      ← re-scans category, verifies improvement, triggers replan
│   │   └── routes/
│   │       ├── scan.ts       ← GET /api/scan
│   │       ├── run.ts        ← POST /api/run
│   │       └── events.ts     ← GET /api/events (SSE)
│   ├── tsconfig.json
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── hud/
    │   │   │   ├── JarvisOrb.tsx      ← central pulsing status orb (SVG)
    │   │   │   ├── ArcMeter.tsx       ← SVG circular arc per category
    │   │   │   ├── AlertBanner.tsx    ← phase transition banner
    │   │   │   └── ActionLog.tsx      ← live SSE feed, typewriter effect
    │   │   └── panels/
    │   │       ├── DiskPanel.tsx
    │   │       ├── DockerPanel.tsx
    │   │       ├── CachePanel.tsx
    │   │       ├── ProcessPanel.tsx
    │   │       └── GitPanel.tsx       ← visually distinct, advisory only
    │   ├── hooks/
    │   │   ├── useSSE.ts              ← SSE connection + typed event parsing
    │   │   └── useScan.ts             ← fetch scan on mount + manual refresh
    │   └── lib/api.ts
    ├── vite.config.ts                 ← /api/* proxied to :3001
    ├── tsconfig.json
    └── package.json
```

### 4.2 Ports

| Service  | Port | Notes |
|----------|------|-------|
| Backend  | 3001 | Express + SSE |
| Frontend | 5173 | Vite dev server, proxies /api/* to 3001 |

Single URL in browser: `http://localhost:5173`

### 4.3 Tech Stack

| Layer    | Choice |
|----------|--------|
| Backend  | Node.js + Express + TypeScript |
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 |
| Animation | Framer Motion |
| Icons    | Phosphor Icons |
| SSE      | Native EventSource (browser) + `res.write` (Express) |

---

## 5. Plan / Generator / Evaluator Loop

### 5.1 State Machine

```
IDLE → PLANNING → EXECUTING → EVALUATING → COMPLETE
                                    ↓
                               REPLANNING (max 2 cycles)
                                    ↓
                                FAILED (if > 2 replan cycles)
```

### 5.2 Phase Descriptions

**PLANNING**
- All `scanner/*` modules run in parallel
- Each category returns a `CategoryScan` with raw metrics and a score 0–100
- `planner.ts` sorts categories by impact×risk inverse (high impact, low risk first)
- Output: `RemediationPlan { tasks: RemediationTask[], scores: CategoryScores }`

**EXECUTING (Generator)**
- Picks next `RemediationTask` from plan
- Emits `{ phase: EXECUTING, task, status: start }`
- Runs shell command via `child_process.exec`
- Emits `{ phase: EXECUTING, task, status: done, output, reclaimed }`

**EVALUATING**
- Re-scans affected category only (fast partial scan)
- Checks: did score improve by ≥ threshold (configurable per category)?
- PASS → mark task complete, next task
- FAIL → increment replan counter
  - counter ≤ 2: emit `REPLANNING`, rebuild remaining plan with fresh scan
  - counter > 2: emit `FAILED` for this task, continue with next

**COMPLETE**
- Emits `{ phase: COMPLETE, summary: { totalReclaimed, passCount, failCount, newScores, durationMs } }`
- Loop resets to IDLE
- UI scores animate to new values

### 5.3 SSE Event Schema

```ts
type JarvisEvent =
  | { phase: 'PLANNING'; scores: CategoryScores }
  | { phase: 'EXECUTING'; task: string; status: 'start' | 'done'; reclaimed?: number }
  | { phase: 'EVALUATING'; category: string; passed: boolean }
  | { phase: 'REPLANNING'; cycle: number }
  | { phase: 'COMPLETE'; summary: CompleteSummary }
  | { phase: 'FAILED'; task: string; reason: string }
```

---

## 6. Health Scoring

Each category scored 0–100:

| Score | Status | JARVIS label | Orb state |
|-------|--------|-------------|-----------|
| 80–100 | GREEN | Arc Reactor stable | slow pulse |
| 50–79 | YELLOW | Power fluctuating | amber throb |
| 0–49 | RED | Systems critical | red alarm |

**Overall score** = weighted average:

| Category | Weight |
|----------|--------|
| Disk | 35% |
| Docker | 25% |
| Caches | 20% |
| Process | 15% |
| Builds | 5% |

Git hygiene has no score — advisory only.

---

## 7. Monitored Categories

### 7.1 Disk
- Free space on `/` via `df -h`
- Score: 100 at >50% free, 0 at <10% free, linear in between

### 7.2 Docker
- Dangling images, build cache, unused volumes via `docker system df`
- Score: 100 if reclaimable < 1 GB, 0 if > 20 GB

### 7.3 Caches
- JetBrains `~/Library/Caches/JetBrains`
- Homebrew `~/Library/Caches/Homebrew`
- Playwright `~/Library/Caches/ms-playwright*`
- pip, pnpm, colima caches
- Score: 100 if total < 500 MB, 0 if > 15 GB

### 7.4 Build Outputs
- `target/`, `dist/`, `.next/` under `~/Developer/projects`
- Score: 100 if total < 200 MB, 0 if > 5 GB

### 7.5 Process Health (read-only, no auto-remediation)
- Top 5 CPU consumers via `ps aux`
- Memory pressure via `memory_pressure` or `vm_stat`
- Display only — no automated action, user awareness metric

### 7.6 Git Hygiene (advisory, manual confirm)
- Stale remote-tracking branches (merged + >30 days since last commit)
- Large untracked files in project dirs (>10 MB)
- Old worktrees (`.claude/worktrees/*` older than 7 days)
- Each finding surfaced with a `[CLEAN]` button — click-to-confirm, never auto

---

## 8. UI Design

### 8.1 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#080c14` | Page background |
| `bg-grid` | `#0d1f35` | Holographic grid overlay |
| `stark-blue` | `#00c8ff` | Arcs, orb, active state |
| `warning` | `#f59e0b` | Amber — power fluctuating |
| `critical` | `#ef4444` | Red — systems critical |
| `success` | `#10b981` | Green — task complete flash |
| `text-primary` | `#e2e8f0` | Main text |
| `text-dim` | `#4a6580` | Data labels |
| Font | JetBrains Mono | All text |

### 8.2 Layout

```
┌──────────────────────────────────────────────────────┐
│  J·A·R·V·I·S  ·  SYSTEM DIAGNOSTICS  · [↺] [INIT]  │
├───────────────┬──────────────────────────────────────┤
│               │  DISK    DOCKER   CACHE   PROCESS     │
│  [ JARVIS  ]  │  [arc]   [arc]   [arc]   [arc]       │
│  [  ORB    ]  │                                       │
│  overall      │  ┌──────────────────────────────────┐│
│  score        │  │  LIVE ACTION LOG                  ││
│               │  │  > Planning...                    ││
│               │  │  > Executing: docker image prune  ││
│               │  │  > Evaluating: +1.28 GB reclaimed ││
│               │  └──────────────────────────────────┘│
├───────────────┴──────────────────────────────────────┤
│  // GIT HYGIENE ─────────────────────────── (amber) │
│  [stale branches ×3]  [untracked ×1]  [worktrees ×8]│
└──────────────────────────────────────────────────────┘
```

### 8.3 Key Components

**JarvisOrb** — SVG concentric rings with gradient. Idle: slow 4s pulse. Executing: rings spin at different speeds. Complete: green flash then back to idle. Critical: red throb at 1s interval.

**ArcMeter** — SVG arc, 0–100 fills clockwise. Color transitions smoothly with Framer Motion as score changes. Shows raw value below arc (e.g. "14.2 GB free").

**AlertBanner** — slides in from top on phase change. Phase → message mapping:
- `PLANNING` → *"INITIATING DIAGNOSTIC SEQUENCE"*
- `EXECUTING` → *"REMEDIATION IN PROGRESS"*
- `REPLANNING` → *"TARGET UNRESPONSIVE — REPLANNING"*
- `COMPLETE` → *"ALL SYSTEMS NOMINAL"*
- `FAILED` → *"SUBSYSTEM FAILURE — SEE LOG"*

**ActionLog** — fixed-height scrolling div. Each new SSE line types in character by character (15ms/char). Color coded: blue=info, green=pass, amber=warning, red=fail.

**GitPanel** — `bg-[#0a0c0e]`, amber accent color instead of blue, `// GIT HYGIENE` header in amber, clear visual separation from the main HUD. Each finding row shows path + age + `[CLEAN]` button.

---

## 9. Error Handling

- Scanner shell command fails → category scores 0, error surfaced in log, loop continues
- Docker daemon not running → Docker panel shows "DAEMON OFFLINE", skipped in P/G/E
- SSE connection drops → `useSSE` hook auto-reconnects with 2s backoff, max 5 attempts
- Generator task exits non-zero → evaluator marks FAIL, replan cycle triggered
- Max replan cycles exceeded → `FAILED` event emitted, task skipped, loop continues to next

---

## 10. Build Process (P/G/E applied to construction)

The app itself is built using the Plan/Generator/Evaluator pattern:

- **Planner**: Creates an ordered task list — scaffold → backend scanner → backend P/G/E engine → backend routes → frontend setup → HUD components → panels → integration
- **Generator**: Each task dispatched to a subagent with full context and a clear acceptance criterion
- **Evaluator**: After each task, verifies the output compiles, tests pass, and the specific acceptance criterion is met. On failure: replan or report.

Max 2 replan cycles per task before marking as blocked and surfacing to the user.

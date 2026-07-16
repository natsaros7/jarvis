# J·A·R·V·I·S

> *"Shall I take care of that for you, sir?"*

**JARVIS** is an on-demand macOS system health monitor with an Iron Man HUD aesthetic. Open it when something feels slow. It scans, plans, executes, and evaluates — autonomously — until your machine is clean.

![status](https://img.shields.io/badge/status-in%20development-00c8ff?style=flat-square&labelColor=080c14)
![stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20TypeScript-00c8ff?style=flat-square&labelColor=080c14)
![platform](https://img.shields.io/badge/platform-macOS-00c8ff?style=flat-square&labelColor=080c14)

---

## What It Does

JARVIS monitors 5 system health dimensions and remediates them through a self-correcting **Plan → Generate → Evaluate** loop:

| Category | What it checks | Auto-remediate |
|----------|---------------|----------------|
| **Disk** | Free space on `/` | — (indicator only) |
| **Docker** | Dangling images, build cache, unused volumes | ✅ |
| **Caches** | JetBrains, Homebrew, pip, pnpm, Playwright, colima | ✅ |
| **Build Outputs** | `target/`, `dist/`, `.next/` across all projects | ✅ |
| **Process** | Top CPU/RAM consumers | — (read-only) |
| **Git Hygiene** | Stale branches, large untracked files, old worktrees | Manual confirm |

When you hit **INITIATE**, JARVIS:
1. **Plans** — scans all categories in parallel, scores each 0–100, builds a prioritised remediation task list
2. **Generates** — executes each task, streaming live progress to the HUD
3. **Evaluates** — re-scans the affected category after each action; if the metric didn't improve, it replans (max 2 cycles) before marking a task as failed and moving on

Everything streams live to the UI via SSE. You watch it happen.

---

## Health Scoring

| Score | Status | HUD State |
|-------|--------|-----------|
| 80–100 | Arc Reactor stable | Orb pulses blue |
| 50–79 | Power fluctuating | Orb throbs amber |
| 0–49 | Systems critical | Orb alarms red |

Overall score is a weighted average: Disk 35% · Docker 25% · Caches 20% · Process 15% · Builds 5%.

---

## Tech Stack

```
backend/    Node.js + Express + TypeScript  (shell executor + SSE broadcaster)
frontend/   React 19 + Vite + Tailwind v4 + Framer Motion
```

Single command starts both. One URL in the browser.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Docker (Colima or Docker Desktop)
- macOS (uses `df`, `ps`, `top`, `brew`, `docker` CLI)

### Install & Run

```bash
git clone git@github.com:natsaros7/jarvis.git
cd jarvis
npm install          # installs root + both workspaces
npm run dev          # starts backend :3001 + frontend :5173
```

Open **http://localhost:5173** — the HUD initialises and runs an automatic scan on load.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend in watch mode |
| `npm run build` | Build frontend for production |
| `npm run lint` | ESLint across both workspaces |
| `npm run typecheck` | tsc --noEmit across both workspaces |

---

## Architecture

```
jarvis/
├── package.json              ← root workspace, concurrently script
├── backend/
│   └── src/
│       ├── scanner/          ← disk · docker · caches · builds · process · git
│       ├── planner.ts        ← scores → ordered RemediationTask[]
│       ├── generator.ts      ← executes tasks, emits SSE
│       ├── evaluator.ts      ← re-scans, verifies, replans
│       └── routes/           ← GET /api/scan  POST /api/run  GET /api/events
└── frontend/
    └── src/
        ├── components/hud/   ← JarvisOrb · ArcMeter · AlertBanner · ActionLog
        ├── components/panels/← Disk · Docker · Cache · Process · Git
        └── hooks/            ← useSSE · useScan
```

### P/G/E Loop State Machine

```
IDLE → PLANNING → EXECUTING → EVALUATING → COMPLETE
                                   ↓
                              REPLANNING (≤2 cycles)
                                   ↓
                               FAILED → next task
```

---

## Git Hygiene Panel

The Git section is **visually separate** from the main HUD (amber accent, darker background) and intentionally not part of the auto-remediation loop. Stale branches and old worktrees are surfaced as findings — each with a manual `[CLEAN]` button. Nothing in git is ever auto-deleted.

---

## Design Spec

Full design document: [`docs/superpowers/specs/2026-07-16-jarvis-design.md`](docs/superpowers/specs/2026-07-16-jarvis-design.md)

---

## Roadmap

- [x] Design spec
- [x] Backend scaffolding + scanner modules
- [x] P/G/E engine (planner · generator · evaluator)
- [x] SSE routes
- [x] JARVIS HUD frontend
- [x] Panel components (Disk · Docker · Cache · Process)
- [x] Git hygiene panel
- [x] App assembly + full integration

---

*Built by [@natsaros7](https://github.com/natsaros7) — because doing it manually is beneath us.*

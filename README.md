# PURGE

> Reclaim your dev machine.

**Purge** is an on-demand macOS system-health dashboard with a slate cyberpunk aesthetic. Open it when your machine feels bloated. It scans disk, Docker, caches, build outputs, processes, and git hygiene — scores each dimension live — and lets you reclaim space per category or all at once.

![status](https://img.shields.io/badge/status-active-00E0AC?style=flat-square&labelColor=0d1a1d)
![stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20TypeScript-00E0AC?style=flat-square&labelColor=0d1a1d)
![platform](https://img.shields.io/badge/platform-macOS-00E0AC?style=flat-square&labelColor=0d1a1d)

---

## What It Does

Purge monitors 6 dimensions of a developer machine's health:

| Category | What it checks | Actionable |
|----------|---------------|------------|
| **Disk** | Free space on `/` | — (indicator only) |
| **Docker** | Reclaimable images, build cache, unused volumes | ✅ per-action + fix-all |
| **Caches** | JetBrains, Homebrew, pip, pnpm, Playwright, colima | ✅ per-action + fix-all |
| **Builds** | `target/`, `dist/`, `.next/`, … auto-discovered across repos | ✅ per-action + fix-all |
| **Process** | Top CPU consumers, load average | — (read-only) |
| **Git Hygiene** | Stale branches, large untracked files, old worktrees | Manual confirm per finding |

Each category scans **independently and asynchronously** — panels fill in as their data arrives, and the overall score is eventually consistent, recomputing as each result lands. Every actionable category has a **Fix [Category]** button (runs all its actions) plus individual per-action controls. Destructive actions require a two-step confirm.

There's also an **Auto-Fix All** mode: a self-correcting **Plan → Generate → Evaluate** loop that remediates every category, re-scans after each action, and replans (≤2 cycles) if a metric didn't improve. It streams live to the UI over SSE.

---

## Health Scoring

| Score | Status | Indicator |
|-------|--------|-----------|
| 80–100 | Healthy | Teal |
| 50–79 | Attention needed | Amber |
| 0–49 | Cleanup recommended | Hot pink |

Overall is a weighted average of available categories (re-normalized while some are still loading):
**Docker 30% · Caches 25% · Builds 20% · Disk 15% · Process 10%.** Actionable categories carry the most weight; a timed-out scanner scores a neutral 50 rather than cratering the total.

---

## Configuration

Repo and build-output discovery is automatic — Purge scans common dev roots (`~/Developer`, `~/Code`, `~/Projects`, `~/dev`, `~/src`, `~/work`) that actually exist. Override via `~/.config/purge/config.json`:

```json
{
  "gitRoots": ["~/work", "~/oss"],
  "gitScanDepth": 3
}
```

---

## Tech Stack

```
backend/    Node.js + Express + TypeScript  (scanner registry + shell executor + SSE)
frontend/   React 19 + Vite + Tailwind v4 + Framer Motion
```

Single command starts both. One URL in the browser.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- macOS (uses `df`, `ps`, `sysctl`, `brew`, `docker`, `git` CLIs)
- Docker optional (Colima or Docker Desktop) — Docker panel reports offline gracefully if the daemon is down

### Install & Run

```bash
git clone git@github.com:natsaros7/purge.git
cd purge
npm install          # installs root + both workspaces
npm run dev          # starts backend :3001 + frontend :5173
```

Open **http://localhost:5173** — the dashboard scans automatically on load.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend and frontend in watch mode |
| `npm run build` | Build frontend for production |
| `npm run lint` | ESLint across both workspaces |
| `npm run typecheck` | tsc --noEmit across both workspaces |

---

## Architecture

```
purge/
├── package.json              ← root workspace, concurrently script
├── backend/
│   └── src/
│       ├── scanner/          ← disk · docker · caches · builds · process · git
│       │   └── registry.ts   ← per-category cache + in-flight dedup (single source of truth)
│       ├── planner.ts        ← scores → ordered RemediationTask[]
│       ├── generator.ts      ← executes tasks, emits SSE
│       ├── evaluator.ts      ← re-scans, verifies, replans
│       └── routes/           ← GET /api/scan/:category · POST /api/action[/all] · GET /api/events
└── frontend/
    └── src/
        ├── theme.ts          ← central design tokens (colors, score → color, verdict)
        ├── components/hud/    ← ScoreRing · ArcMeter · AlertBanner · ActionLog
        ├── components/panels/ ← Disk · Docker · Cache · Builds · Process · Git · CategoryActions
        └── hooks/             ← useCategoryScans · useGitScan · useSSE
```

### Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET`  | `/api/scan/:category` | Scan one category (cached, deduped) |
| `GET`  | `/api/scan/git` | Git hygiene findings, grouped by repo |
| `POST` | `/api/action` | Run one action `{ category, actionId }` |
| `POST` | `/api/action/all` | Run every action in a category `{ category }` |
| `POST` | `/api/git-clean` | Run one git cleanup command (allowlisted, path-denylisted) |
| `POST` | `/api/run` | Kick off the Auto-Fix All P/G/E loop |
| `GET`  | `/api/events` | SSE stream of engine events |

### Auto-Fix Loop State Machine

```
IDLE → PLANNING → EXECUTING → EVALUATING → COMPLETE
                                   ↓
                              REPLANNING (≤2 cycles)
                                   ↓
                               FAILED → next task
```

---

## Safety Model

- **Commands are always server-generated.** The client sends only `{ category, actionId }`; the server re-scans and looks the command up by ID — it never executes client-supplied strings.
- **Git cleanup is allowlisted** (`rm`/`git` prefixes only), rejects shell metacharacters, and denies paths under `~/.ssh`, `~/.gnupg`, Keychains, browser profiles, `/System`, `/Library`.
- **Source code is never a cleanup target** — only regenerable build outputs.
- Nothing in git is ever auto-deleted; every finding requires a manual two-step confirm.

---

*Built by [@natsaros7](https://github.com/natsaros7).*

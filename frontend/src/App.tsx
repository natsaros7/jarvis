import { useState, useCallback } from 'react';
import { JarvisEvent, CategoryScan } from './types';
import { useScan } from './hooks/useScan';
import { useGitScan } from './hooks/useGitScan';
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
  return ({ disk: 'Disk', docker: 'Docker', caches: 'Cache', builds: 'Builds', process: 'Process' } as Record<string, string>)[c] ?? c;
}

export default function App() {
  const { scan, loading, refetch } = useScan();
  const { git, loading: gitLoading } = useGitScan();
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [log, setLog] = useState<LogEntry[]>([]);

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
        if (event.status === 'done') addLog(
          `Done: ${event.label} — ${event.reclaimedBytes ? `+${(event.reclaimedBytes / 1024 ** 3).toFixed(2)} GB reclaimed` : 'complete'}`,
          'success',
        );
        break;
      case 'EVALUATING':
        setPhase('EVALUATING');
        addLog(
          `Evaluating ${categoryToLabel(event.category)}: ${event.passed ? `PASS (score ${event.newScore})` : 'FAIL — replanning'}`,
          event.passed ? 'success' : 'warning',
        );
        break;
      case 'REPLANNING':
        setPhase('REPLANNING');
        addLog(`Replanning — cycle ${event.cycle}, ${event.tasksRemaining} tasks remaining`, 'warning');
        break;
      case 'COMPLETE':
        setPhase('COMPLETE');
        addLog(
          `All systems processed — ${(event.summary.totalReclaimedBytes / 1024 ** 3).toFixed(2)} GB reclaimed, ${event.summary.passCount} pass, ${event.summary.failCount} fail`,
          'success',
        );
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

  const scores = scan?.scores;
  const cats = scan?.categories ?? [];
  const getByCat = (cat: string): CategoryScan =>
    cats.find(c => c.category === cat) ?? { category: cat as CategoryScan['category'], score: 0, metrics: {}, actions: [] };

  const isRunning = phase !== 'IDLE' && phase !== 'COMPLETE';

  return (
    <div className="min-h-screen bg-jarvis-base text-text-primary">
      {/* Holographic grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'linear-gradient(#00c8ff 1px, transparent 1px), linear-gradient(90deg, #00c8ff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-jarvis-grid">
          <div className="text-stark-blue tracking-[0.5em] font-bold text-sm">J·A·R·V·I·S</div>
          <div className="text-text-dim text-xs tracking-widest">SYSTEM DIAGNOSTICS</div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={isRunning}
              className="p-2 border border-jarvis-grid rounded hover:border-stark-blue transition-colors disabled:opacity-30"
            >
              <ArrowsClockwise size={14} className="text-text-dim" />
            </button>
            <button
              onClick={handleInitiate}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 border border-stark-blue text-stark-blue text-xs tracking-widest rounded hover:bg-stark-blue/10 transition-colors disabled:opacity-30"
            >
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

              {/* Git section — loads separately after main HUD */}
              {gitLoading ? (
                <div className="mt-6 rounded border border-warning/20 bg-[#09080a] p-4">
                  <span className="text-xs tracking-widest text-warning/50 animate-pulse">{'// GIT HYGIENE — SCANNING...'}</span>
                </div>
              ) : git && (
                <GitPanel git={git} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

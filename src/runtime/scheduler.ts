/**
 * Scheduler — tick pipeline for the flux chamber runtime.
 *
 * Phases execute in order each tick:
 *   input → constraints → physics → agents → bridges → render
 *
 * Any phase can be enabled/disabled. The scheduler tracks tick count
 * and elapsed time for deterministic stepping.
 */

import type { PhaseName, PhaseConfig } from '../types';

export type { PhaseName } from '../types';

const DEFAULT_PHASES: PhaseConfig[] = [
  { name: 'input', order: 0, enabled: true },
  { name: 'constraints', order: 1, enabled: true },
  { name: 'physics', order: 2, enabled: true },
  { name: 'agents', order: 3, enabled: true },
  { name: 'bridges', order: 4, enabled: true },
  { name: 'render', order: 5, enabled: true },
];

export type TickCallback = (dt: number, tick: number) => void;

interface PhaseHandlers {
  [key: string]: TickCallback[];
}

export class Scheduler {
  readonly phases: Map<PhaseName, PhaseConfig>;
  private handlers: PhaseHandlers = {};
  private _tick = 0;
  private _elapsed = 0;
  private running = false;
  private lastTime = 0;
  private rafId: number | null = null;

  constructor(phases?: PhaseConfig[]) {
    this.phases = new Map();
    const phaseList = phases ?? DEFAULT_PHASES;
    for (const p of phaseList) {
      this.phases.set(p.name, { ...p });
    }
  }

  // ─── Tick Counting ───────────────────────────────

  get tick(): number {
    return this._tick;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  // ─── Phase Management ────────────────────────────

  enablePhase(name: PhaseName): void {
    const phase = this.phases.get(name);
    if (phase) phase.enabled = true;
  }

  disablePhase(name: PhaseName): void {
    const phase = this.phases.get(name);
    if (phase) phase.enabled = false;
  }

  isPhaseEnabled(name: PhaseName): boolean {
    return this.phases.get(name)?.enabled ?? false;
  }

  // ─── Handler Registration ────────────────────────

  on(phase: PhaseName, callback: TickCallback): void {
    if (!this.handlers[phase]) {
      this.handlers[phase] = [];
    }
    this.handlers[phase].push(callback);
  }

  off(phase: PhaseName, callback: TickCallback): void {
    const handlers = this.handlers[phase];
    if (!handlers) return;
    const idx = handlers.indexOf(callback);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  // ─── Single Tick ─────────────────────────────────

  /**
   * Execute one tick synchronously.
   * @param dt Delta time in seconds (default: 1/60)
   */
  tickOnce(dt = 1 / 60): void {
    this._tick++;
    this._elapsed += dt;

    // Execute phases in order
    const sortedPhases = Array.from(this.phases.entries())
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].order - b[1].order);

    for (const [name] of sortedPhases) {
      const handlers = this.handlers[name] ?? [];
      for (const handler of handlers) {
        handler(dt, this._tick);
      }
    }
  }

  // ─── Animation Loop ──────────────────────────────

  /**
   * Start the requestAnimationFrame loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /**
   * Stop the animation loop.
   */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (now: number): void => {
    if (!this.running) return;

    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Cap dt to prevent spiral of death on tab switch
    const clampedDt = Math.min(dt, 1 / 10);

    this.tickOnce(clampedDt);

    this.rafId = requestAnimationFrame(this.loop);
  };

  // ─── State ───────────────────────────────────────

  /**
   * Reset tick counter and elapsed time.
   */
  reset(): void {
    this._tick = 0;
    this._elapsed = 0;
  }

  get isRunning(): boolean {
    return this.running;
  }
}

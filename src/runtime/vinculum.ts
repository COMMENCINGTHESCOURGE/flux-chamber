/**
 * VinculumPipeline — the constraint enforcement engine.
 *
 * Every interaction between tensor channels is a vinculum: a ratio-based operator
 * that enforces a relationship. Conservation laws, material transitions,
 * dissipation rates — all vinculums.
 *
 * Extends the vinculum framework from hyperpoly-terrain and erdos-straus-solver:
 * same algebra, applied forward instead of retroactively.
 */

import type { VinculumConstraint } from '../types';
import { TensorGraph } from './tensor-graph';

export class VinculumPipeline {
  readonly constraints: Map<string, VinculumConstraint> = new Map();

  /**
   * Register a vinculum constraint.
   */
  add(constraint: VinculumConstraint): void {
    this.constraints.set(constraint.name, constraint);
  }

  /**
   * Remove a vinculum constraint.
   */
  remove(name: string): boolean {
    return this.constraints.delete(name);
  }

  /**
   * Get a constraint by name.
   */
  get(name: string): VinculumConstraint | undefined {
    return this.constraints.get(name);
  }

  /**
   * Apply all constraints to the tensor graph for one tick.
   * Each constraint is applied as a vinculum operator across
   * the entities that participate in it.
   *
   * Order: constraints are applied in registration order.
   */
  apply(graph: TensorGraph, dt: number): void {
    for (const constraint of this.constraints.values()) {
      this.applyConstraint(graph, constraint, dt);
    }
  }

  /**
   * Apply a single vinculum constraint to all relevant entities.
   */
  private applyConstraint(graph: TensorGraph, constraint: VinculumConstraint, dt: number): void {
    const { channels, rate, mode } = constraint;

    if (channels.length < 2) return;

    const chA = channels[0];
    const chB = channels[1];

    graph.forEach(entity => {
      // Skip entities that don't have both channels
      const a = entity.get(chA);
      const b = entity.get(chB);
      if (a === 0 && b === 0) return;

      // Compute the vinculum ratio
      const ratio = b !== 0 ? a / b : (a > 0 ? 1 : 0);

      // Apply based on mode
      switch (mode) {
        case 'conservation':
        case 'reversible':
          this.applyConservation(entity, chA, chB, ratio, rate, dt);
          break;
        case 'dissipative':
          this.applyDissipative(entity, chA, chB, ratio, rate, dt);
          break;
        case 'threshold':
          this.applyThreshold(entity, chA, chB, ratio, rate, dt, constraint.threshold ?? 0.5);
          break;
      }
    });
  }

  /**
   * Conservation mode: total value across channels is preserved.
   * If A increases, B decreases proportionally.
   * Equivalent to: ΔA = -ΔB, scaled by vinculum ratio.
   */
  private applyConservation(
    entity: { get: (ch: string) => number; add: (ch: string, delta: number) => void },
    chA: string,
    chB: string,
    ratio: number,
    rate: number,
    dt: number,
  ): void {
    const a = entity.get(chA);
    const b = entity.get(chB);
    const total = a + b;
    if (total === 0) return;

    // Use ratio/threshold constraint target: target A = total * targetRatio / (1 + targetRatio)
    const targetRatio = ratio || 1.0;
    const target = total * targetRatio / (1 + targetRatio);
    const deltaA = (target - a) * rate * dt;

    entity.add(chA, deltaA);
    entity.add(chB, -deltaA);
  }

  /**
   * Dissipative mode: both channels decay toward zero.
   * Rate proportional to vinculum ratio × the channel value.
   */
  private applyDissipative(
    entity: { get: (ch: string) => number; add: (ch: string, delta: number) => void },
    chA: string,
    chB: string,
    ratio: number,
    rate: number,
    dt: number,
  ): void {
    const a = entity.get(chA);
    const b = entity.get(chB);

    const decayA = -a * ratio * rate * dt;
    const decayB = -b * (1 / (ratio || 0.01)) * rate * dt;

    entity.add(chA, decayA);
    entity.add(chB, decayB);
  }

  /**
   * Threshold mode: when vinculum ratio crosses the threshold,
   * one channel is converted to the other.
   * classification: STABLE (within threshold), BREACH (crossed), NEUTRAL (near threshold)
   */
  private applyThreshold(
    entity: { get: (ch: string) => number; add: (ch: string, delta: number) => void; set: (ch: string, val: number) => void },
    chA: string,
    chB: string,
    ratio: number,
    rate: number,
    dt: number,
    threshold: number,
  ): void {
    const a = entity.get(chA);
    const b = entity.get(chB);

    if (ratio > threshold && a > 0) {
      // BREACH: channel A converts to channel B
      const converted = a * rate * dt;
      entity.add(chA, -converted);
      entity.add(chB, converted);
    } else if (ratio < 1 / threshold && b > 0 && threshold > 0) {
      // NEUTRAL side threshold: B converts to A
      const converted = b * rate * dt;
      entity.add(chB, -converted);
      entity.add(chA, converted);
    }
    // STABLE: no conversion
  }

  /**
   * Classify mod-9 vinculum ratio as STABLE, BREACH, or NEUTRAL.
   * Uses the mod9 classification system from erdos-straus-solver.
   */
  mod9Classify(ratio: number): 'STABLE' | 'BREACH' | 'NEUTRAL' {
    if (!isFinite(ratio)) return 'BREACH';
    const mod = (Math.round(ratio * 100) % 9 + 9) % 9;
    if (mod === 1 || mod === 4 || mod === 7) return 'STABLE';
    if (mod === 0 || mod === 3 || mod === 6) return 'BREACH';
    return 'NEUTRAL';
  }

  /**
   * Get all constraint names.
   */
  get names(): string[] {
    return Array.from(this.constraints.keys());
  }
}

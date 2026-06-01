/**
 * ConservationEnforcer — maintains conservation laws across the tensor field.
 *
 * Where vinculum constraints balance channel relationships within entities,
 * conservation enforcement operates at the field level — ensuring that
 * total mass, momentum, and energy are preserved across the entire graph.
 */

import { TensorGraph } from '../runtime/tensor-graph';
import { TensorEntity } from '../runtime/tensor-entity';

export interface ConservationConfig {
  /** Whether to enforce global mass conservation */
  massConservation: boolean;
  /** Whether to enforce global momentum conservation */
  momentumConservation: boolean;
  /** Whether to enforce energy conservation (dampening) */
  energyConservation: boolean;
  /** Acceptable drift before correction is applied */
  tolerance: number;
  /** Correction strength per tick (0-1) */
  correctionRate: number;
}

const DEFAULT_CONFIG: ConservationConfig = {
  massConservation: true,
  momentumConservation: false,
  energyConservation: true,
  tolerance: 0.001,
  correctionRate: 0.1,
};

export class ConservationEnforcer {
  config: ConservationConfig;

  /** Initial total mass (set on first enforce call) */
  private initialMass: number | null = null;

  /** Running total momenta per axis */
  private initialMomentum: [number, number, number] | null = null;

  constructor(config?: Partial<ConservationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Enforce conservation laws on the tensor graph.
   * Should be called after vinculum constraints and collision
   * to correct any numerical drift.
   */
  enforce(graph: TensorGraph): void {
    if (this.config.massConservation) {
      this.enforceMass(graph);
    }
    if (this.config.momentumConservation) {
      this.enforceMomentum(graph);
    }
    if (this.config.energyConservation) {
      this.enforceEnergy(graph);
    }
  }

  /**
   * Enforce total mass conservation.
   * Mass = sum of (density × mass) across all entities.
   */
  private enforceMass(graph: TensorGraph): void {
    let totalMass = 0;
    graph.forEach((entity: TensorEntity) => {
      totalMass += entity.get('density') * entity.mass;
    });

    if (this.initialMass === null) {
      this.initialMass = totalMass;
      return;
    }

    const drift = totalMass - this.initialMass;

    if (Math.abs(drift) > this.config.tolerance * this.initialMass) {
      // Correct: redistribute the drift proportionally
      const correctionFactor = 1 - drift / totalMass * this.config.correctionRate;

      graph.forEach((entity: TensorEntity) => {
        const corrected = entity.get('density') * correctionFactor;
        entity.set('density', Math.max(0, corrected));
      });
    }
  }

  /**
   * Enforce total momentum conservation.
   * Momentum = sum of (mass × velocity) across all entities.
   */
  private enforceMomentum(graph: TensorGraph): void {
    let totalPx = 0;
    let totalPy = 0;
    let totalPz = 0;
    let totalMass = 0;

    graph.forEach((entity: TensorEntity) => {
      totalPx += entity.mass * entity.gradient[0];
      totalPy += entity.mass * entity.gradient[1];
      totalPz += entity.mass * entity.gradient[2];
      totalMass += entity.mass;
    });

    if (this.initialMomentum === null) {
      this.initialMomentum = [totalPx, totalPy, totalPz];
      return;
    }

    if (totalMass === 0) return;

    // Subtract excess momentum equally
    const driftX = (totalPx - this.initialMomentum[0]) / totalMass;
    const driftY = (totalPy - this.initialMomentum[1]) / totalMass;
    const driftZ = (totalPz - this.initialMomentum[2]) / totalMass;

    if (Math.abs(driftX) + Math.abs(driftY) + Math.abs(driftZ) > this.config.tolerance) {
      graph.forEach((entity: TensorEntity) => {
        entity.gradient = [
          entity.gradient[0] - driftX * this.config.correctionRate,
          entity.gradient[1] - driftY * this.config.correctionRate,
          entity.gradient[2] - driftZ * this.config.correctionRate,
        ];
      });
    }
  }

  /**
   * Enforce energy conservation via dampening.
   * Energy proxy = sum of (density × |gradient|²) across entities.
   * If energy increases (numerical instability), dampen uniformly.
   */
  private enforceEnergy(graph: TensorGraph): void {
    let totalEnergy = 0;
    graph.forEach((entity: TensorEntity) => {
      const speedSq =
        entity.gradient[0] ** 2 +
        entity.gradient[1] ** 2 +
        entity.gradient[2] ** 2;
      totalEnergy += entity.get('density') * speedSq;
    });

    if (totalEnergy > 100) {
      // Energy spike — dampen all velocities
      const dampening = Math.sqrt(100 / totalEnergy);
      graph.forEach((entity: TensorEntity) => {
        entity.gradient = [
          entity.gradient[0] * dampening,
          entity.gradient[1] * dampening,
          entity.gradient[2] * dampening,
        ];
      });
    }
  }

  /**
   * Reset conservation baselines to current field state.
   */
  reset(graph: TensorGraph): void {
    this.initialMass = null;
    this.initialMomentum = null;

    // Read initial values
    let totalMass = 0;
    let totalPx = 0;
    let totalPy = 0;
    let totalPz = 0;

    graph.forEach((entity: TensorEntity) => {
      totalMass += entity.get('density') * entity.mass;
      totalPx += entity.mass * entity.gradient[0];
      totalPy += entity.mass * entity.gradient[1];
      totalPz += entity.mass * entity.gradient[2];
    });

    this.initialMass = totalMass;
    this.initialMomentum = [totalPx, totalPy, totalPz];
  }
}

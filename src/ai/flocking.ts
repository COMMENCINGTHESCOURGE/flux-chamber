/**
 * FlockingSystem — field-based flocking behavior.
 *
 * Traditional boids use separation, alignment, and cohesion rules
 * on discrete entities. Here, flocking emerges from gradient fields —
 * agents follow the density gradient of their own type, creating
 * natural swarming without explicit flocking rules.
 */

import { TensorEntity } from '../runtime/tensor-entity';
import { TensorGraph } from '../runtime/tensor-graph';
import type { Vec3 } from '../types';

export interface FlockingConfig {
  /** The field channel that represents flock density */
  densityField: string;
  /** How strongly an agent follows the density gradient */
  followStrength: number;
  /** How much random perturbation to add (0 = deterministic) */
  noise: number;
  /** The flock's preferred altitude/height channel offset */
  altitudeBias?: Vec3;
  /** Maximum number of agents before splitting */
  maxLocalDensity?: number;
}

export class FlockingSystem {
  readonly config: FlockingConfig;
  private rng: () => number;

  constructor(config: FlockingConfig, seed?: number) {
    this.config = config;
    // Simple seeded RNG if provided, else Math.random
    this.rng = seed !== undefined ? this.seededRng(seed) : Math.random;
  }

  /**
   * Apply flocking forces to an entity based on the density field.
   */
  step(entity: TensorEntity, graph: TensorGraph, dt: number): void {
    const { densityField, followStrength, noise, altitudeBias, maxLocalDensity } = this.config;

    // Sample the density field at entity's position (via gradient)
    const gradient = entity.gradient;
    const density = entity.get(densityField);

    if (density <= 0) return;

    // Population control: if local density is too high, scatter
    if (maxLocalDensity) {
      const localEntities = graph.queryType(entity.type);
      if (localEntities.length > maxLocalDensity) {
        // Add perpendicular noise to spread the flock
        entity.add(densityField, this.rng() * noise * dt);
        entity.add('temperature', this.rng() * noise * dt);
        entity.add('velocity', this.rng() * noise * dt);
        return;
      }
    }

    // Follow the density gradient
    const fieldGradient = graph.sampleGradient(
      [gradient[0], gradient[1], gradient[2]],
      densityField,
    );

    // Apply follow strength
    const followVec: Vec3 = [
      fieldGradient[0] * followStrength * dt,
      fieldGradient[1] * followStrength * dt,
      fieldGradient[2] * followStrength * dt,
    ];

    // Add noise
    const noiseVec: Vec3 = [
      (this.rng() - 0.5) * noise * dt,
      (this.rng() - 0.5) * noise * dt,
      (this.rng() - 0.5) * noise * dt,
    ];

    // Apply altitude bias
    const altitude: Vec3 = altitudeBias ?? [0, 0, 0];

    // Update entity gradient
    entity.gradient = [
      followVec[0] + noiseVec[0] + altitude[0],
      followVec[1] + noiseVec[1] + altitude[1],
      followVec[2] + noiseVec[2] + altitude[2],
    ];
  }

  private seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 4294967296;
    };
  }
}

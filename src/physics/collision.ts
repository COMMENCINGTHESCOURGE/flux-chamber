/**
 * FieldCollision — tensor-field collision detection and resolution.
 *
 * Collision isn't between bounding boxes — it's tensor repulsion.
 * When two entity field footprints overlap, the vinculum constraint
 * between their channels resolves the interaction.
 * No contact normals, no penetration depth — just field deformation.
 */

import { TensorGraph } from '../runtime/tensor-graph';
import { TensorEntity } from '../runtime/tensor-entity';

export interface FieldCollisionConfig {
  /** Repulsion strength between overlapping entities */
  repulsionStrength: number;
  /** Minimum distance before repulsion activates */
  minDistance: number;
  /** Whether to enforce mass conservation during collisions */
  conserveMass: boolean;
  /** Energy loss coefficient (0 = perfectly elastic, 1 = perfectly inelastic) */
  restitution: number;
  /** Whether to deform entities on collision */
  deformOnCollision: boolean;
}

const DEFAULT_CONFIG: FieldCollisionConfig = {
  repulsionStrength: 0.5,
  minDistance: 2,
  conserveMass: true,
  restitution: 0.3,
  deformOnCollision: true,
};

export class FieldCollision {
  config: FieldCollisionConfig;

  private collisionPairs: Array<{ a: string; b: string }> = [];

  constructor(config?: Partial<FieldCollisionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect and resolve collisions for all entities in the graph.
   */
  step(graph: TensorGraph, dt: number): void {
    this.collisionPairs = [];
    const entities = graph.all();

    // Broad phase: spatial index query for each entity
    for (let i = 0; i < entities.length; i++) {
      const a = entities[i];

      // Query nearby entities using spatial index
      const nearby = graph.queryRadius(
        a.gradient,
        this.config.minDistance + a.radius,
      );

      for (const b of nearby) {
        if (a.id === b.id) continue;

        // Avoid duplicate pairs (A-B and B-A)
        const pairKey = [a.id, b.id].sort().join(':');
        if (this.collisionPairs.some(p => [p.a, p.b].sort().join(':') === pairKey)) continue;

        this.collisionPairs.push({ a: a.id, b: b.id });
        this.resolveCollision(a, b, dt);
      }
    }
  }

  /**
   * Resolve a collision between two tensor entities.
   */
  private resolveCollision(a: TensorEntity, b: TensorEntity, dt: number): void {
    const aPos = a.gradient;
    const bPos = b.gradient;

    // Distance between entity field centers
    const dx = bPos[0] - aPos[0];
    const dy = bPos[1] - aPos[1];
    const dz = bPos[2] - aPos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const minDist = this.config.minDistance + a.radius + b.radius;
    if (dist >= minDist || dist === 0) return;

    // Normal direction from A to B
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    // Overlap amount
    const overlap = minDist - dist;

    // Repulsion force
    const force = overlap * this.config.repulsionStrength * dt;

    // Relative velocity along collision normal
    const relVelX = a.gradient[0] - b.gradient[0];
    const relVelY = a.gradient[1] - b.gradient[1];
    const relVelZ = a.gradient[2] - b.gradient[2];
    const relVelAlongNormal = relVelX * nx + relVelY * ny + relVelZ * nz;

    // Mass-weighted push
    const totalMass = a.mass + b.mass;
    const aWeight = totalMass > 0 ? b.mass / totalMass : 0.5;
    const bWeight = totalMass > 0 ? a.mass / totalMass : 0.5;

    // Push entities apart
    a.gradient = [
      a.gradient[0] - nx * force * aWeight + relVelAlongNormal * nx * (1 - this.config.restitution) * aWeight * dt,
      a.gradient[1] - ny * force * aWeight + relVelAlongNormal * ny * (1 - this.config.restitution) * aWeight * dt,
      a.gradient[2] - nz * force * aWeight + relVelAlongNormal * nz * (1 - this.config.restitution) * aWeight * dt,
    ];
    b.gradient = [
      b.gradient[0] + nx * force * bWeight - relVelAlongNormal * nx * (1 - this.config.restitution) * bWeight * dt,
      b.gradient[1] + ny * force * bWeight - relVelAlongNormal * ny * (1 - this.config.restitution) * bWeight * dt,
      b.gradient[2] + nz * force * bWeight - relVelAlongNormal * nz * (1 - this.config.restitution) * bWeight * dt,
    ];

    // Deform entities on collision — reduce cohesion, transfer density
    if (this.config.deformOnCollision) {
      const impact = overlap * force;
      a.add('cohesion', -impact * 0.1);
      b.add('cohesion', -impact * 0.1);

      if (this.config.conserveMass) {
        // Transfer density from lighter to heavier
        if (a.mass < b.mass) {
          a.add('density', impact * 0.05);
          b.add('density', -impact * 0.05);
        } else {
          a.add('density', -impact * 0.05);
          b.add('density', impact * 0.05);
        }
      }
    }

    // Clamp all values
    a.clamp(0, 10);
    b.clamp(0, 10);
  }

  /**
   * Get the collision pairs from the last step.
   */
  get lastCollisions(): ReadonlyArray<{ a: string; b: string }> {
    return this.collisionPairs;
  }

  /**
   * Set repulsion strength.
   */
  setRepulsion(strength: number): void {
    this.config.repulsionStrength = Math.max(0, strength);
  }
}

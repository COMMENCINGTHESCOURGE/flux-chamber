/**
 * TensorFieldSteering — gradient-weighted steering behaviors.
 *
 * Converts traditional steering behaviors (seek, flee, arrive, pursue)
 * into gradient-field operations. Instead of "move toward target",
 * the steering creates a local gradient perturbation that the entity
 * follows through its natural gradient-following mechanism.
 */

import { TensorEntity } from '../runtime/tensor-entity';
import { TensorGraph } from '../runtime/tensor-graph';
import type { Vec3 } from '../types';

export class TensorFieldSteering {
  /**
   * Create a gradient that pulls entities toward a target position.
   * Injects a density high at the target, creating a downhill gradient
   * that gradient-following agents will naturally descend.
   */
  static seek(
    entity: TensorEntity,
    _graph: TensorGraph,
    target: Vec3,
    channel = 'density',
    strength = 1,
  ): void {
    // Compute the direction from entity to target
    const entityPos = entity.gradient;
    const dx = target[0] - entityPos[0];
    const dy = target[1] - entityPos[1];
    const dz = target[2] - entityPos[2];

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist === 0) return;

    // Normalized direction
    const dir: Vec3 = [dx / dist, dy / dist, dz / dist];

    // Perturb the entity's gradient toward the target
    entity.gradient = [
      entity.gradient[0] + dir[0] * strength,
      entity.gradient[1] + dir[1] * strength,
      entity.gradient[2] + dir[2] * strength,
    ];

    // Also push density in that direction for other entities to follow
    entity.add(channel, strength * 0.1);
  }

  /**
   * Create a gradient that pushes entities away from a target.
   */
  static flee(
    entity: TensorEntity,
    _graph: TensorGraph,
    threat: Vec3,
    channel = 'density',
    strength = 1,
  ): void {
    const entityPos = entity.gradient;
    const dx = entityPos[0] - threat[0];
    const dy = entityPos[1] - threat[1];
    const dz = entityPos[2] - threat[2];

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist === 0) return;

    const dir: Vec3 = [dx / dist, dy / dist, dz / dist];

    entity.gradient = [
      entity.gradient[0] + dir[0] * strength,
      entity.gradient[1] + dir[1] * strength,
      entity.gradient[2] + dir[2] * strength,
    ];

    // Reduce density in the threat direction
    entity.add(channel, -strength * 0.1);
  }

  /**
   * Slow down as entity approaches target.
   */
  static arrive(
    entity: TensorEntity,
    _graph: TensorGraph,
    target: Vec3,
    slowRadius: number,
    channel = 'cohesion',
  ): void {
    const entityPos = entity.gradient;
    const dx = target[0] - entityPos[0];
    const dy = target[1] - entityPos[1];
    const dz = target[2] - entityPos[2];

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist === 0) return;

    const speed = Math.min(1, dist / slowRadius);

    entity.gradient = [
      (dx / dist) * speed,
      (dy / dist) * speed,
      (dz / dist) * speed,
    ];

    // Increase cohesion as we slow — settling
    entity.add(channel, (1 - speed) * 0.1);
  }

  /**
   * Orbit a target — maintain distance while circling.
   */
  static orbit(
    entity: TensorEntity,
    _graph: TensorGraph,
    center: Vec3,
    radius: number,
    speed = 1,
    channel = 'velocity',
  ): void {
    const entityPos = entity.gradient;
    const dx = entityPos[0] - center[0];
    const dz = entityPos[2] - center[2];

    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist === 0) return;

    // Tangent direction (perpendicular to radius)
    const tangentX = -dz / dist;
    const tangentZ = dx / dist;

    // Radial correction toward desired radius
    const radialX = (radius - dist) * (dx / dist) * 0.1;
    const radialZ = (radius - dist) * (dz / dist) * 0.1;

    entity.gradient = [
      tangentX * speed + radialX,
      entity.gradient[1],
      tangentZ * speed + radialZ,
    ];

    entity.add(channel, speed * 0.05);
  }
}

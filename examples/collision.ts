/**
 * Collision example — demonstrates tensor field collision.
 */

import { FluxChamber } from '../src/runtime/chamber';
import { TensorEntity } from '../src/runtime/tensor-entity';
import { FieldCollision } from '../src/physics/collision';

/**
 * Create a collision simulation with overlapping fields.
 */
export function createCollisionExample(): FluxChamber {
  const chamber = new FluxChamber({
    resolution: [256, 256],
    channels: ['density', 'cohesion'],
  });

  // Two entities heading toward each other
  const a = new TensorEntity({
    channels: { density: 1.5, cohesion: 0.9 },
    gradient: [10, 50, 0],
    radius: 10,
    type: 'particle',
    mass: 2,
  });

  const b = new TensorEntity({
    channels: { density: 1.5, cohesion: 0.9 },
    gradient: [50, 50, 0],
    radius: 10,
    type: 'particle',
    mass: 2,
  });

  chamber.addEntity(a);
  chamber.addEntity(b);

  // Register collision system on physics phase
  const collision = new FieldCollision({
    repulsionStrength: 0.8,
    minDistance: 5,
    conserveMass: true,
    restitution: 0.5,
    deformOnCollision: true,
  });

  chamber.scheduler.on('physics', (dt: number) => {
    collision.step(chamber.graph, dt);
  });

  return chamber;
}

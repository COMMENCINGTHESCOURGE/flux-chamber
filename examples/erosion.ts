/**
 * Erosion example — demonstrates terrain erosion via vinculum constraints.
 */

import { FluxChamber } from '../src/runtime/chamber';
import { TensorEntity } from '../src/runtime/tensor-entity';
import type { VinculumConstraint } from '../src/types';

/**
 * Create a terrain patch with erosion simulation.
 * Rock converts to sand on threshold breach.
 */
export function createErosionExample(): FluxChamber {
  const chamber = new FluxChamber({
    resolution: [256, 256],
    channels: ['rock', 'soil', 'sand', 'water', 'ice', 'organic'],
  });

  // Create terrain entities
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const isPeak = Math.random() > 0.6;
      const entity = new TensorEntity({
        channels: {
          rock: isPeak ? 3 : 1,
          soil: isPeak ? 0.5 : 1,
          sand: 0.2,
          water: Math.random() * 0.5,
          ice: 0,
          organic: Math.random() * 0.3,
        },
        gradient: [i * 20, j * 20, 0],
        radius: 12,
        type: 'terrain',
        mass: isPeak ? 3 : 1,
      });
      chamber.addEntity(entity);
    }
  }

  // Erosion constraint: rock → sand on threshold
  const erosion: VinculumConstraint = {
    name: 'erosion',
    type: 'threshold',
    channels: ['rock', 'sand'],
    rate: 0.02,
    mode: 'threshold',
    threshold: 3.0,
    classification: 'BREACH',
  };

  // Dissipation: water evaporates
  const evaporation: VinculumConstraint = {
    name: 'evaporation',
    type: 'dissipative',
    channels: ['water', 'organic'],
    rate: 0.005,
    mode: 'dissipative',
  };

  chamber.addConstraint(erosion);
  chamber.addConstraint(evaporation);

  return chamber;
}

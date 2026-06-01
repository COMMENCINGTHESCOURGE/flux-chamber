/**
 * Agent example — demonstrates gradient-following agents.
 */

import { FluxChamber } from '../src/runtime/chamber';
import { TensorEntity } from '../src/runtime/tensor-entity';
import { GradientAgent } from '../src/ai/gradient-agent';

/**
 * Create an agent simulation with gradient followers.
 */
export function createAgentExample(): FluxChamber {
  const chamber = new FluxChamber({
    resolution: [512, 512],
    channels: ['density', 'cohesion', 'temperature'],
  });

  // Create a density hotspot (food source)
  const hotspot = new TensorEntity({
    channels: { density: 3.0, cohesion: 1.0, temperature: 0.5 },
    gradient: [100, 100, 0],
    radius: 32,
    type: 'hotspot',
    mass: 5,
  });
  chamber.addEntity(hotspot);

  // Create gradient-following agents
  for (let i = 0; i < 3; i++) {
    const agent = new TensorEntity({
      channels: { density: 0.5, cohesion: 0.8, temperature: 0.3 },
      gradient: [Math.random() * 200, Math.random() * 200, 0],
      radius: 8,
      type: 'agent',
      mass: 1,
      tags: ['follower'],
    });

    chamber.addEntity(agent);

    const agentController = new GradientAgent({
      name: `agent-${i}`,
      field: 'density',
      step: 5,
      threshold: 0.01,
      sensorRadius: 2,
    });

    chamber.attachAgent(agentController, agent);
  }

  return chamber;
}

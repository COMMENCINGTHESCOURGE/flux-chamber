/**
 * GradientAgent — field-following agent that walks tensor gradients.
 *
 * Agents navigate by reading the field gradient, not by pathfinding.
 * An agent following the density gradient downhill is walking erosion paths.
 * An agent following the temperature gradient upwind is riding thermals.
 * Same mechanism, different channel.
 */

import { TensorEntity } from '../runtime/tensor-entity';
import { TensorGraph } from '../runtime/tensor-graph';
import type { Vec3, AgentConfig } from '../types';

export class GradientAgent {
  readonly name: string;
  readonly field: string;
  readonly stepSize: number;
  readonly threshold: number;
  readonly bias: Vec3;
  readonly adaptiveStep: boolean;
  readonly sensorRadius: number;

  private posX = 0;
  private posY = 0;
  private posZ = 0;

  private static counter = 0;

  constructor(config: AgentConfig & { name?: string }) {
    this.name = config.name ?? `agent_${GradientAgent.counter++}`;
    this.field = config.field;
    this.stepSize = config.step;
    this.threshold = config.threshold;
    this.bias = config.bias ?? [0, 0, 0];
    this.adaptiveStep = config.adaptiveStep ?? false;
    this.sensorRadius = config.sensorRadius ?? 1;
  }

  /**
   * Execute one agent step: read the gradient, update entity tensor.
   */
  step(entity: TensorEntity, graph: TensorGraph): void {
    const gradient = graph.sampleGradient(
      [this.posX, this.posY, this.posZ],
      this.field,
      this.sensorRadius,
    );

    const biasedGradient: Vec3 = [
      gradient[0] + this.bias[0],
      gradient[1] + this.bias[1],
      gradient[2] + this.bias[2],
    ];

    const magnitude = Math.sqrt(
      biasedGradient[0] * biasedGradient[0] +
      biasedGradient[1] * biasedGradient[1] +
      biasedGradient[2] * biasedGradient[2],
    );

    if (magnitude < this.threshold) {
      entity.gradient = [0, 0, 0];
      return;
    }

    const direction: Vec3 = [
      biasedGradient[0] / magnitude,
      biasedGradient[1] / magnitude,
      biasedGradient[2] / magnitude,
    ];

    const actualStep = this.adaptiveStep
      ? this.stepSize * Math.min(magnitude, 2)
      : this.stepSize;

    entity.gradient = direction;

    // Advance position
    this.posX += direction[0] * actualStep;
    this.posY += direction[1] * actualStep;
    this.posZ += direction[2] * actualStep;

    // Update entity field footprint to reflect position
    entity.add(this.field, actualStep * magnitude * 0.01);
  }

  /**
   * Set the agent's position directly.
   */
  setPosition(x: number, y: number, z = 0): void {
    this.posX = x;
    this.posY = y;
    this.posZ = z;
  }

  /**
   * Get the agent's current position.
   */
  getPosition(): Vec3 {
    return [this.posX, this.posY, this.posZ];
  }

  /**
   * Configure a downhill bias (gravity-like).
   */
  static downhill(weight = 1): Vec3 {
    return [0, -weight, 0];
  }

  /**
   * Configure an uphill bias (thermal / climb).
   */
  static uphill(weight = 1): Vec3 {
    return [0, weight, 0];
  }

  /**
   * Configure a wind-direction bias.
   */
  static wind(direction: Vec3, weight = 1): Vec3 {
    return direction.map(d => d * weight) as Vec3;
  }
}

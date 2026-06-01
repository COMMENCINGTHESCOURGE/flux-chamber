/**
 * TensorEntity — a field footprint with identity.
 *
 * Unlike traditional ECS entities, a TensorEntity has no position component.
 * It *is* the local state of the material tensor field. Movement is gradient flow.
 * Interaction is tensor overlap resolved through vinculum constraints.
 */

import type { Tensor, Vec3, TensorConfig } from '../types';

let entityIdCounter = 0;

/**
 * Generate a unique entity ID within the chamber namespace.
 */
function nextId(): string {
  return `entity_${++entityIdCounter}_${Date.now().toString(36)}`;
}

export class TensorEntity {
  readonly id: string;
  readonly type: string;

  /** Tensor channels — the entity's field footprint */
  channels: Tensor;

  /** Gradient direction (flow) of the entity through the field */
  gradient: Vec3;

  /** Radius of influence in the tensor field */
  radius: number;

  /** Mass / momentum proxy for conservation enforcement */
  mass: number;

  /** Optional tags for constraint targeting */
  tags: Set<string>;

  /** Names of vinculum constraints this entity participates in */
  constraints: Set<string>;

  constructor(config: TensorConfig & { type?: string; tags?: string[]; constraints?: string[]; mass?: number }) {
    this.id = nextId();
    this.type = config.type ?? 'default';
    this.channels = { ...config.channels } as Tensor;
    this.gradient = config.gradient ?? [0, 0, 0];
    this.radius = config.radius ?? 16;
    this.mass = config.mass ?? 1.0;
    this.tags = new Set(config.tags ?? []);
    this.constraints = new Set(config.constraints ?? []);
  }

  /**
   * Get a channel value, defaulting to 0.
   */
  get(channel: string): number {
    return this.channels[channel] ?? 0;
  }

  /**
   * Set a channel value.
   */
  set(channel: string, value: number): void {
    this.channels[channel] = value;
  }

  /**
   * Add delta to a channel value.
   */
  add(channel: string, delta: number): void {
    const current = this.channels[channel] ?? 0;
    this.channels[channel] = current + delta;
  }

  /**
   * Clamp all channels to [min, max]
   */
  clamp(min: number, max: number): void {
    for (const ch in this.channels) {
      this.channels[ch] = Math.max(min, Math.min(max, this.channels[ch]));
    }
  }

  /**
   * Apply a gradient step: move the entity through the field.
   */
  stepGradient(_dt: number): void {
    for (let i = 0; i < 3; i++) {
      this.gradient[i] += 0; // gradient is set externally by field reading
    }
  }

  /**
   * Compute vinculum ratio between two channels.
   * The vinculum operator is A/B — measuring the relationship between channels.
   */
  vinculumRatio(channelA: string, channelB: string): number {
    const a = this.get(channelA);
    const b = this.get(channelB);
    if (b === 0) return a > 0 ? Infinity : 0;
    return a / b;
  }

  /**
   * Serialize for checkpoint / transport.
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      channels: { ...this.channels },
      gradient: [...this.gradient],
      radius: this.radius,
      mass: this.mass,
    };
  }

  /**
   * Deserialize from checkpoint.
   */
  static fromJSON(data: Record<string, unknown>): TensorEntity {
    const entity = new TensorEntity({
      type: data.type as string,
      channels: data.channels as Record<string, number>,
      gradient: data.gradient as Vec3,
      radius: data.radius as number,
      mass: data.mass as number,
    });
    // Preserve the original ID — don't auto-generate a new one
    (entity as unknown as Record<string, unknown>).id = data.id as string;
    return entity;
  }
}

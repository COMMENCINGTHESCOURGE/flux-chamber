/**
 * HyperpolyBridge — connects flux-chamber to hyperpoly-terrain's GPU compute.
 *
 * Translates between flux-chamber's tensor entity model and
 * hyperpoly-terrain's 6-channel material tensor representation.
 * Feeds entity state into the hyperpoly WGSL compute pipeline
 * and reads simulation results back into the chamber graph.
 */

import type { Tensor } from '../types';

/**
 * Interface for hyperpoly-terrain's TerrainEngine.
 * This is the expected shape when hyperpoly-terrain is available.
 */
export interface HyperpolyEngine {
  initialize(tensor: unknown): Promise<void>;
  step(deltaTime: number): void;
  extractMesh(options?: { lod?: number }): unknown;
  getTensorState(): Tensor;
  setTensorState(tensor: Record<string, unknown>, region?: {
    offset: [number, number, number];
    size: [number, number, number];
  }): void;
  resolution: [number, number];
}

/**
 * Bridge state for synchronizing between flux-chamber and hyperpoly.
 */
export class HyperpolyBridge {
  readonly name = 'hyperpoly';
  private engine: HyperpolyEngine | null = null;
  private channelMap: Map<string, number> = new Map();

  /**
   * Connect to a hyperpoly-terrain engine instance.
   */
  connect(engine: HyperpolyEngine): void {
    this.engine = engine;

    // Map flux-chamber channels to hyperpoly channel indices
    const defaultChannels = ['rock', 'soil', 'sand', 'water', 'ice', 'organic'];
    defaultChannels.forEach((ch, i) => {
      this.channelMap.set(ch, i);
    });
  }

  /**
   * Push entity tensor state to the hyperpoly engine.
   * Entity density values are mapped onto the hyperpoly material tensor.
   */
  pushEntityState(entityChannels: Tensor): void {
    if (!this.engine) return;

    const materialTensor: number[] = new Array(6).fill(0);

    for (const [ch, value] of Object.entries(entityChannels)) {
      const index = this.channelMap.get(ch);
      if (index !== undefined && index < 6) {
        materialTensor[index] = value;
      }
    }

    this.engine.setTensorState({ values: materialTensor });
  }

  /**
   * Pull simulation results from hyperpoly back into flux-chamber channels.
   */
  pullFieldState(): Tensor {
    if (!this.engine) return {};

    const tensorState = this.engine.getTensorState();
    const result: Tensor = {};

    for (const [ch, index] of this.channelMap.entries()) {
      const value = tensorState[`channel_${index}`];
      if (value !== undefined) {
        result[ch] = value;
      }
    }

    return result;
  }

  /**
   * Step the hyperpoly simulation.
   */
  step(dt: number): void {
    if (!this.engine) return;
    this.engine.step(dt);
  }

  /**
   * Extract the current mesh from hyperpoly.
   */
  extractMesh(): unknown {
    if (!this.engine) return null;
    return this.engine.extractMesh({ lod: 1.0 });
  }

  /**
   * Check if the bridge is connected.
   */
  get connected(): boolean {
    return this.engine !== null;
  }

  /**
   * Disconnect from the hyperpoly engine.
   */
  disconnect(): void {
    this.engine = null;
    this.channelMap.clear();
  }
}

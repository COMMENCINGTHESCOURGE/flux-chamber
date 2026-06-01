/**
 * Core tensor, entity, vinculum, and field types.
 */

/** A 3D vector */
export type Vec3 = [number, number, number];

/** A 3D integer coordinate (for discrete grid ops) */
export type IVec3 = [number, number, number];

/** Named material channels — the 6 standard hyperpoly channels */
export type MaterialChannel = 'rock' | 'soil' | 'sand' | 'water' | 'ice' | 'organic';

/** A tensor is a map from channel name → scalar value */
export type Tensor = Record<string, number>;

/** A field is a tensor sampled over space — typically a function (x,y,z) → Tensor */
export interface FieldConfig {
  resolution: [number, number, number] | [number, number];
  channels: string[];
  defaultValues?: Partial<Record<string, number>>;
}

/** Configuration for a tensor entity — a field footprint with identity */
export interface TensorConfig {
  channels: Partial<Record<string, number>>;
  gradient?: Vec3;
  radius: number;
  position?: Vec3;
}

/** A full entity config including identity and field bindings */
export interface EntityConfig extends TensorConfig {
  id?: string;
  type: string;
  mass?: number;
  tags?: string[];
  constraints?: string[];
}

/** The vinculum type determines how a constraint is enforced */
export type VinculumType = 'conservation' | 'dissipative' | 'threshold' | 'ratio' | 'reversible';

/**
 * A vinculum constraint defines a relationship between tensor channels
 */
export interface VinculumConstraint {
  name: string;
  type: VinculumType;
  channels: string[];
  rate: number;
  mode: 'reversible' | 'dissipative' | 'threshold' | 'conservation';
  threshold?: number;
  /** Mod9 classification: STABLE (1,4,7), BREACH (0,3,6), NEUTRAL (2,5,8) */
  classification?: 'STABLE' | 'BREACH' | 'NEUTRAL';
}

/** Bridge configuration — how flux-chamber connects to render/compute backends */
export interface BridgeConfig {
  type: 'hyperpoly' | 'three' | 'canvas' | 'webgpu';
  canvas?: HTMLCanvasElement;
  resolution?: [number, number];
  options?: Record<string, unknown>;
}

/** Configuration for a gradient-following agent */
export interface AgentConfig {
  field: string;
  step: number;
  threshold: number;
  bias?: Vec3;
  adaptiveStep?: boolean;
  sensorRadius?: number;
}

/** A phase in the runtime tick pipeline */
export type PhaseName = 'input' | 'constraints' | 'physics' | 'agents' | 'bridges' | 'render';

export interface PhaseConfig {
  name: PhaseName;
  order: number;
  enabled: boolean;
}

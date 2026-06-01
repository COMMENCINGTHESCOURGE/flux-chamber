/**
 * Flux Chamber — MANIFOLD field-driven runtime
 *
 * The continuous-interaction substrate where state flows through
 * material tensors instead of discrete components.
 *
 * @module flux-chamber
 */

export { FluxChamber } from './runtime/chamber';
export { TensorGraph } from './runtime/tensor-graph';
export { TensorEntity } from './runtime/tensor-entity';
export { VinculumPipeline } from './runtime/vinculum';
export { Scheduler } from './runtime/scheduler';
export { FieldCollision } from './physics/collision';
export { ConservationEnforcer } from './physics/conservation';
export { GradientUtils } from './physics/gradient';
export { GradientAgent } from './ai/gradient-agent';
export { FlockingSystem } from './ai/flocking';
export { TensorFieldSteering } from './ai/steering';

export type {
  TensorConfig,
  EntityConfig,
  VinculumConstraint,
  VinculumType,
  BridgeConfig,
  FieldConfig,
  AgentConfig,
} from './types';

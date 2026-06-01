/**
 * TensorGraph — the entity registry and field topology of the flux chamber.
 *
 * Manages all tensor entities and the relationships between them.
 * Provides field queries for gradient-based operations.
 */

import { TensorEntity } from './tensor-entity';
import type { Tensor, Vec3, FieldConfig } from '../types';

export class TensorGraph {
  readonly entities: Map<string, TensorEntity> = new Map();
  readonly fieldConfig: FieldConfig;

  /** Spatial index: coarse grid for overlap queries */
  private spatialGrid: Map<string, string[]> = new Map();
  private readonly cellSize: number;

  constructor(fieldConfig: FieldConfig) {
    this.fieldConfig = fieldConfig;
    this.cellSize = 64; // spatial hash cell size
  }

  // ─── Entity Management ─────────────────────────────────

  /** Register an entity in the graph */
  add(entity: TensorEntity): void {
    this.entities.set(entity.id, entity);
    this.updateSpatialIndex(entity);
  }

  /** Remove an entity from the graph */
  remove(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    this.entities.delete(id);
    this.clearSpatialIndex(entity);
    return true;
  }

  /** Get an entity by ID */
  get(id: string): TensorEntity | undefined {
    return this.entities.get(id);
  }

  /** Query entities by type */
  queryType(type: string): TensorEntity[] {
    const results: TensorEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.type === type) results.push(entity);
    }
    return results;
  }

  /** Query entities by tag */
  queryTag(tag: string): TensorEntity[] {
    const results: TensorEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.tags.has(tag)) results.push(entity);
    }
    return results;
  }

  /** Query entities within vincinity of a position (by spatial index) */
  queryRadius(position: Vec3, radius: number): TensorEntity[] {
    const results: TensorEntity[] = [];
    const visited = new Set<string>();

    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCell = this.positionToCell(position);

    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
          const cellKey = `${centerCell[0] + dx},${centerCell[1] + dy},${centerCell[2] + dz}`;
          const cellEntities = this.spatialGrid.get(cellKey);
          if (!cellEntities) continue;

          for (const entityId of cellEntities) {
            if (visited.has(entityId)) continue;
            visited.add(entityId);
            const entity = this.entities.get(entityId);
            if (entity) results.push(entity);
          }
        }
      }
    }

    return results;
  }

  /** Get all entities */
  all(): TensorEntity[] {
    return Array.from(this.entities.values());
  }

  /** Get entity count */
  get size(): number {
    return this.entities.size;
  }

  // ─── Field Operations ──────────────────────────────────

  /**
   * Sample the combined field at a position across all entities.
   * Returns the aggregated tensor from all overlapping entity fields.
   */
  sampleField(position: Vec3): Tensor {
    const result: Tensor = {};
    const nearby = this.queryRadius(position, this.cellSize);

    for (const entity of nearby) {
      const dist = this.distance(position, entity.gradient);
      if (dist > entity.radius) continue;

      // Distance-weighted contribution
      const weight = 1 - (dist / entity.radius);
      for (const ch in entity.channels) {
        result[ch] = (result[ch] ?? 0) + entity.channels[ch] * weight;
      }
    }

    return result;
  }

  /**
   * Compute the gradient of a specific channel at a position.
   * Uses central finite differences on the field.
   * Returns [dx, dy, dz] — the direction of increasing value.
   */
  sampleGradient(position: Vec3, channel: string, delta = 1): Vec3 {
    const base = this.sampleFieldAt(position, channel);
    const grad: Vec3 = [
      this.sampleFieldAt([position[0] + delta, position[1], position[2]], channel) - base,
      this.sampleFieldAt([position[0], position[1] + delta, position[2]], channel) - base,
      this.sampleFieldAt([position[0], position[1], position[2] + delta], channel) - base,
    ];
    return grad;
  }

  /**
   * Sample a single channel at a position.
   */
  private sampleFieldAt(position: Vec3, channel: string): number {
    const field = this.sampleField(position);
    return field[channel] ?? 0;
  }

  /** Apply a function to every entity */
  forEach(fn: (entity: TensorEntity) => void): void {
    for (const entity of this.entities.values()) {
      fn(entity);
    }
  }

  /**
   * Compute the Euclidean distance between a position and a gradient vector.
   * Used as a simple proximity measure.
   */
  private distance(a: Vec3, b: Vec3): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ─── Spatial Indexing ──────────────────────────────────

  private positionToCell(position: Vec3): IVec3 {
    return [
      Math.floor(position[0] / this.cellSize),
      Math.floor(position[1] / this.cellSize),
      Math.floor(position[2] / this.cellSize),
    ];
  }

  private cellKey(entity: TensorEntity): string {
    return `${this.positionToCell(entity.gradient)}`;
  }

  private updateSpatialIndex(entity: TensorEntity): void {
    const key = this.cellKey(entity);
    const existing = this.spatialGrid.get(key);
    if (existing) {
      if (!existing.includes(entity.id)) existing.push(entity.id);
    } else {
      this.spatialGrid.set(key, [entity.id]);
    }
  }

  private clearSpatialIndex(entity: TensorEntity): void {
    for (const [key, ids] of this.spatialGrid.entries()) {
      const filtered = ids.filter(id => id !== entity.id);
      if (filtered.length === 0) {
        this.spatialGrid.delete(key);
      } else {
        this.spatialGrid.set(key, filtered);
      }
    }
  }

  /** Update all spatial indices (call after position changes) */
  rebuildSpatialIndex(): void {
    this.spatialGrid.clear();
    this.forEach(entity => this.updateSpatialIndex(entity));
  }
}

type IVec3 = [number, number, number];

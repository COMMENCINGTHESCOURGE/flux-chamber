/**
 * FluxChamber — the top-level field-driven runtime.
 *
 * Orchestrates the tensor graph, vinculum pipeline, scheduler,
 * and bridges into a unified interaction substrate.
 */

import { TensorGraph } from './tensor-graph';
import { TensorEntity } from './tensor-entity';
import { VinculumPipeline } from './vinculum';
import { Scheduler } from './scheduler';
import type { FieldConfig, VinculumConstraint } from '../types';
import type { GradientAgent } from '../ai/gradient-agent';

export class FluxChamber {
  readonly graph: TensorGraph;
  readonly vinculum: VinculumPipeline;
  readonly scheduler: Scheduler;
  readonly bridges: Map<string, unknown> = new Map();
  private agents: Map<string, GradientAgent> = new Map();
  private agentEntities: Map<string, string> = new Map(); // agentId → entityId

  constructor(fieldConfig?: FieldConfig) {
    const config: FieldConfig = fieldConfig ?? {
      resolution: [512, 512],
      channels: ['density', 'cohesion', 'velocity', 'temperature', 'moisture', 'organic'],
    };

    this.graph = new TensorGraph(config);
    this.vinculum = new VinculumPipeline();
    this.scheduler = new Scheduler();

    // Wire default pipeline
    this.scheduler.on('constraints', (dt: number) => {
      this.vinculum.apply(this.graph, dt);
    });

    this.scheduler.on('agents', (_dt: number) => {
      this.stepAgents();
    });
  }

  // ─── Entity Management ───────────────────────────

  addEntity(entity: TensorEntity): void {
    this.graph.add(entity);
  }

  removeEntity(id: string): boolean {
    return this.graph.remove(id);
  }

  getEntity(id: string): TensorEntity | undefined {
    return this.graph.get(id);
  }

  // ─── Constraints ────────────────────────────────

  addConstraint(constraint: VinculumConstraint): void {
    this.vinculum.add(constraint);
  }

  removeConstraint(name: string): boolean {
    return this.vinculum.remove(name);
  }

  loadDeclarations(dirPath: string): void {
    try {
      const fs = require('fs');
      const path = require('path');
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const decl = JSON.parse(content) as VinculumConstraint;
            this.addConstraint(decl);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load declarations via fs:', e);
    }
  }

  // ─── Agents ──────────────────────────────────────

  attachAgent(agent: GradientAgent, entity: TensorEntity): void {
    this.agents.set(agent.name, agent);
    this.agentEntities.set(agent.name, entity.id);
  }

  detachAgent(name: string): boolean {
    this.agentEntities.delete(name);
    return this.agents.delete(name);
  }

  private stepAgents(): void {
    for (const [agentId, entityId] of this.agentEntities.entries()) {
      const agent = this.agents.get(agentId);
      const entity = this.graph.get(entityId);
      if (!agent || !entity) continue;

      agent.step(entity, this.graph);
    }
  }

  // ─── Bridges ─────────────────────────────────────

  registerBridge(name: string, bridge: unknown): void {
    this.bridges.set(name, bridge);
  }

  removeBridge(name: string): boolean {
    return this.bridges.delete(name);
  }

  // ─── Lifecycle ──────────────────────────────────

  start(): void {
    this.scheduler.start();
  }

  stop(): void {
    this.scheduler.stop();
  }

  step(dt?: number): void {
    this.scheduler.tickOnce(dt);
  }

  get isRunning(): boolean {
    return this.scheduler.isRunning;
  }

  get tick(): number {
    return this.scheduler.tick;
  }

  get elapsed(): number {
    return this.scheduler.elapsed;
  }
}

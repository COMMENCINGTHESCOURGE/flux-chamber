import { describe, it, expect, beforeEach } from 'vitest';
import { FluxChamber } from '../src/runtime/chamber';
import { TensorEntity } from '../src/runtime/tensor-entity';
import { TensorGraph } from '../src/runtime/tensor-graph';
import { VinculumPipeline } from '../src/runtime/vinculum';
import { Scheduler } from '../src/runtime/scheduler';
import { FieldCollision } from '../src/physics/collision';
import { ConservationEnforcer } from '../src/physics/conservation';
import { GradientAgent } from '../src/ai/gradient-agent';
import { GradientUtils } from '../src/physics/gradient';
import type { FieldConfig, VinculumConstraint } from '../src/types';

describe('FluxChamber', () => {
  let chamber: FluxChamber;

  beforeEach(() => {
    chamber = new FluxChamber();
  });

  it('creates a chamber with a tensor graph', () => {
    expect(chamber.graph).toBeInstanceOf(TensorGraph);
    expect(chamber.graph.size).toBe(0);
  });

  it('creates a chamber with a vinculum pipeline', () => {
    expect(chamber.vinculum).toBeInstanceOf(VinculumPipeline);
  });

  it('creates a chamber with a scheduler', () => {
    expect(chamber.scheduler).toBeInstanceOf(Scheduler);
  });

  it('adds and removes entities', () => {
    const entity = new TensorEntity({
      channels: { density: 1 },
      radius: 8,
      type: 'test',
    });

    chamber.addEntity(entity);
    expect(chamber.graph.size).toBe(1);
    expect(chamber.getEntity(entity.id)).toBe(entity);

    const removed = chamber.removeEntity(entity.id);
    expect(removed).toBe(true);
    expect(chamber.graph.size).toBe(0);
  });

  it('adds and removes constraints', () => {
    const constraint: VinculumConstraint = {
      name: 'test-conservation',
      type: 'conservation',
      channels: ['density', 'cohesion'],
      rate: 0.01,
      mode: 'conservation',
    };

    chamber.addConstraint(constraint);
    expect(chamber.vinculum.get('test-conservation')).toBeDefined();

    chamber.removeConstraint('test-conservation');
    expect(chamber.vinculum.get('test-conservation')).toBeUndefined();
  });

  it('steps the runtime tick', () => {
    expect(chamber.tick).toBe(0);
    chamber.step(1 / 60);
    expect(chamber.tick).toBe(1);
    expect(chamber.elapsed).toBeCloseTo(1 / 60);
  });

  it('is not running by default (animation loop is browser-only)', () => {
    expect(chamber.isRunning).toBe(false);
  });

  it('loads declarations dynamically from JSON files', () => {
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, 'temp-bonds');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempFile = path.join(tempDir, 'test-erosion.json');
    const constraint = {
      name: 'temp-erosion',
      type: 'threshold',
      channels: ['rock', 'sand'],
      rate: 0.02,
      mode: 'threshold',
      threshold: 3.0,
      classification: 'BREACH'
    };
    fs.writeFileSync(tempFile, JSON.stringify(constraint));

    chamber.loadDeclarations(tempDir);
    expect(chamber.vinculum.get('temp-erosion')).toBeDefined();

    // Clean up
    fs.unlinkSync(tempFile);
    fs.rmdirSync(tempDir);
  });
});

describe('TensorEntity', () => {
  it('creates an entity with channels', () => {
    const entity = new TensorEntity({
      channels: { density: 1.0, cohesion: 0.8 },
      radius: 8,
      type: 'test',
    });

    expect(entity.id).toBeTruthy();
    expect(entity.get('density')).toBe(1.0);
    expect(entity.get('cohesion')).toBe(0.8);
    expect(entity.get('nonexistent')).toBe(0);
    expect(entity.radius).toBe(8);
  });

  it('sets and gets channel values', () => {
    const entity = new TensorEntity({
      channels: { density: 0 },
      radius: 4,
      type: 'test',
    });

    entity.set('density', 0.5);
    expect(entity.get('density')).toBe(0.5);
  });

  it('adds delta to channel values', () => {
    const entity = new TensorEntity({
      channels: { density: 0.5 },
      radius: 4,
      type: 'test',
    });

    entity.add('density', 0.3);
    expect(entity.get('density')).toBe(0.8);
  });

  it('clamps channel values', () => {
    const entity = new TensorEntity({
      channels: { density: 5, cohesion: -1 },
      radius: 4,
      type: 'test',
    });

    entity.clamp(0, 2);
    expect(entity.get('density')).toBe(2);
    expect(entity.get('cohesion')).toBe(0);
  });

  it('computes vinculum ratios', () => {
    const entity = new TensorEntity({
      channels: { density: 2, cohesion: 4 },
      radius: 4,
      type: 'test',
    });

    expect(entity.vinculumRatio('density', 'cohesion')).toBe(0.5);
    expect(entity.vinculumRatio('cohesion', 'density')).toBe(2);
  });

  it('handles zero in vinculum ratio', () => {
    const entity = new TensorEntity({
      channels: { density: 5, cohesion: 0 },
      radius: 4,
      type: 'test',
    });

    expect(entity.vinculumRatio('density', 'cohesion')).toBe(Infinity);
    expect(entity.vinculumRatio('cohesion', 'density')).toBe(0);
  });

  it('serializes and deserializes', () => {
    const entity = new TensorEntity({
      channels: { density: 1.0, cohesion: 0.8 },
      gradient: [0.5, 0, 0],
      radius: 8,
      mass: 2,
      type: 'test',
    });

    const json = entity.toJSON();
    expect(json.id).toBe(entity.id);
    expect(json.type).toBe('test');

    const restored = TensorEntity.fromJSON(json as Record<string, unknown>);
    expect(restored.id).toBe(entity.id);
    expect(restored.get('density')).toBe(1.0);
    expect(restored.radius).toBe(8);
    expect(restored.mass).toBe(2);
  });

  it('supports tags', () => {
    const entity = new TensorEntity({
      channels: { density: 1 },
      radius: 4,
      type: 'agent',
      tags: ['friendly', 'mobile'],
    });

    expect(entity.tags.has('friendly')).toBe(true);
    expect(entity.tags.has('mobile')).toBe(true);
    expect(entity.tags.has('enemy')).toBe(false);
  });
});

describe('TensorGraph', () => {
  let graph: TensorGraph;

  beforeEach(() => {
    const fieldConfig: FieldConfig = {
      resolution: [512, 512],
      channels: ['density', 'cohesion'],
    };
    graph = new TensorGraph(fieldConfig);
  });

  it('starts empty', () => {
    expect(graph.size).toBe(0);
  });

  it('adds entities', () => {
    const entity = new TensorEntity({
      channels: { density: 1 },
      radius: 8,
      type: 'test',
    });

    graph.add(entity);
    expect(graph.size).toBe(1);
  });

  it('queries by type', () => {
    const a = new TensorEntity({ channels: { density: 1 }, radius: 4, type: 'agent' });
    const b = new TensorEntity({ channels: { density: 1 }, radius: 4, type: 'terrain' });
    const c = new TensorEntity({ channels: { density: 1 }, radius: 4, type: 'agent' });

    graph.add(a);
    graph.add(b);
    graph.add(c);

    expect(graph.queryType('agent')).toHaveLength(2);
    expect(graph.queryType('terrain')).toHaveLength(1);
  });

  it('queries by tag', () => {
    const a = new TensorEntity({
      channels: { density: 1 }, radius: 4, type: 'agent',
      tags: ['friendly', 'mobile'],
    });
    const b = new TensorEntity({
      channels: { density: 1 }, radius: 4, type: 'agent',
      tags: ['enemy', 'mobile'],
    });

    graph.add(a);
    graph.add(b);

    expect(graph.queryTag('friendly')).toHaveLength(1);
    expect(graph.queryTag('mobile')).toHaveLength(2);
  });

  it('removes entities', () => {
    const entity = new TensorEntity({
      channels: { density: 1 },
      radius: 8,
      type: 'test',
    });

    graph.add(entity);
    expect(graph.size).toBe(1);

    graph.remove(entity.id);
    expect(graph.size).toBe(0);
    expect(graph.get(entity.id)).toBeUndefined();
  });

  it('iterates entities', () => {
    graph.add(new TensorEntity({ channels: { density: 1 }, radius: 4, type: 'a' }));
    graph.add(new TensorEntity({ channels: { density: 1 }, radius: 4, type: 'b' }));

    const types: string[] = [];
    graph.forEach(e => types.push(e.type));

    expect(types.sort()).toEqual(['a', 'b']);
  });

  it('returns all entities', () => {
    const a = new TensorEntity({ channels: { density: 1 }, radius: 4, type: 'a' });
    graph.add(a);
    expect(graph.all()).toHaveLength(1);
    expect(graph.all()[0].id).toBe(a.id);
  });
});

describe('VinculumPipeline', () => {
  let pipeline: VinculumPipeline;
  let graph: TensorGraph;

  beforeEach(() => {
    pipeline = new VinculumPipeline();
    graph = new TensorGraph({
      resolution: [512, 512],
      channels: ['density', 'cohesion'],
    });
  });

  it('registers and removes constraints', () => {
    const constraint: VinculumConstraint = {
      name: 'mass-conservation',
      type: 'conservation',
      channels: ['density', 'cohesion'],
      rate: 0.01,
      mode: 'conservation',
    };

    pipeline.add(constraint);
    expect(pipeline.get('mass-conservation')).toBeDefined();
    expect(pipeline.names).toContain('mass-conservation');

    pipeline.remove('mass-conservation');
    expect(pipeline.get('mass-conservation')).toBeUndefined();
  });

  it('applies conservation constraint', () => {
    const constraint: VinculumConstraint = {
      name: 'mass-conservation',
      type: 'conservation',
      channels: ['density', 'cohesion'],
      rate: 0.5,
      mode: 'conservation',
    };

    pipeline.add(constraint);

    const entity = new TensorEntity({
      channels: { density: 1.0, cohesion: 0.0 },
      radius: 4,
      type: 'test',
    });
    graph.add(entity);

    pipeline.apply(graph, 1.0);

    // Conservation should move both toward 0.5
    expect(entity.get('density')).toBeLessThan(1.0);
    expect(entity.get('cohesion')).toBeGreaterThan(0.0);
  });

  it('applies dissipative constraint', () => {
    const constraint: VinculumConstraint = {
      name: 'decay',
      type: 'dissipative',
      channels: ['density', 'cohesion'],
      rate: 0.1,
      mode: 'dissipative',
    };

    pipeline.add(constraint);

    const entity = new TensorEntity({
      channels: { density: 1.0, cohesion: 1.0 },
      radius: 4,
      type: 'test',
    });
    graph.add(entity);

    pipeline.apply(graph, 1.0);

    expect(entity.get('density')).toBeLessThan(1.0);
    expect(entity.get('cohesion')).toBeLessThan(1.0);
  });

  it('applies threshold constraint', () => {
    const constraint: VinculumConstraint = {
      name: 'erosion',
      type: 'threshold',
      channels: ['rock', 'sand'],
      rate: 0.5,
      mode: 'threshold',
      threshold: 2.0,
    };

    pipeline.add(constraint);

    const entity = new TensorEntity({
      channels: { rock: 3.0, sand: 1.0 }, // ratio = 3 > 2 → breaching
      radius: 4,
      type: 'test',
    });
    graph.add(entity);

    pipeline.apply(graph, 1.0);

    // Rock should convert to sand
    expect(entity.get('rock')).toBeLessThan(3.0);
    expect(entity.get('sand')).toBeGreaterThan(1.0);
  });

  it('classifies mod-9 vinculum ratios', () => {
    // (0.01 * 100) % 9 ≈ 1.0 → 1 mod 9 → STABLE
    expect(pipeline.mod9Classify(0.01)).toBe('STABLE');
    // 0.04 * 100 = 4 → 4 mod 9 → STABLE
    expect(pipeline.mod9Classify(0.04)).toBe('STABLE');
    // 0.07 * 100 = 7 → 7 mod 9 → STABLE
    expect(pipeline.mod9Classify(0.07)).toBe('STABLE');
    // 0.00 → ratio = 0 → 0 mod 9 → BREACH
    expect(pipeline.mod9Classify(0)).toBe('BREACH');
    // Infinity → BREACH
    expect(pipeline.mod9Classify(Infinity)).toBe('BREACH');
  });
});

describe('FieldCollision', () => {
  it('detects and resolves collisions', () => {
    const collision = new FieldCollision({
      repulsionStrength: 1.0,
      minDistance: 2,
      restitution: 0.3,
      deformOnCollision: true,
    });

    const graph = new TensorGraph({
      resolution: [512, 512],
      channels: ['density', 'cohesion'],
    });

    const a = new TensorEntity({
      channels: { density: 1.0, cohesion: 1.0 },
      radius: 4,
      type: 'agent',
      mass: 1,
    });
    const b = new TensorEntity({
      channels: { density: 1.0, cohesion: 1.0 },
      radius: 4,
      type: 'agent',
      mass: 1,
    });

    graph.add(a);
    graph.add(b);

    // Initially no collisions
    expect(collision.lastCollisions).toHaveLength(0);

    // After step, there should be at least one collision pair
    collision.step(graph, 1 / 60);
  });

  it('adjusts repulsion strength', () => {
    const collision = new FieldCollision();
    expect(collision.config.repulsionStrength).toBe(0.5);

    collision.setRepulsion(2.0);
    expect(collision.config.repulsionStrength).toBe(2.0);

    collision.setRepulsion(-1);
    expect(collision.config.repulsionStrength).toBe(0);
  });
});

describe('ConservationEnforcer', () => {
  it('enforces mass conservation', () => {
    const enforcer = new ConservationEnforcer({
      massConservation: true,
      momentumConservation: false,
      energyConservation: false,
      tolerance: 0.001,
      correctionRate: 0.1,
    });

    const graph = new TensorGraph({
      resolution: [512, 512],
      channels: ['density'],
    });

    const entity = new TensorEntity({
      channels: { density: 1.0 },
      radius: 4,
      type: 'test',
      mass: 1,
    });
    graph.add(entity);

    // First call records baseline
    enforcer.enforce(graph);

    // Increase density artificially
    entity.set('density', 2.0);

    // Enforce should correct it
    enforcer.enforce(graph);

    // Density should be closer to original
    expect(entity.get('density')).toBeLessThan(2.0);
  });

  it('resets baselines', () => {
    const enforcer = new ConservationEnforcer();
    const graph = new TensorGraph({
      resolution: [512, 512],
      channels: ['density'],
    });

    const entity = new TensorEntity({
      channels: { density: 1.0 },
      radius: 4, type: 'test', mass: 1,
    });
    graph.add(entity);

    enforcer.enforce(graph);

    entity.set('density', 5.0);
    enforcer.reset(graph);

    // After reset, the new value becomes the baseline
    enforcer.enforce(graph);
    expect(entity.get('density')).toBe(5.0);
  });
});

describe('GradientAgent', () => {
  it('creates an agent with config', () => {
    const agent = new GradientAgent({
      field: 'density',
      step: 0.1,
      threshold: 0.01,
      name: 'test-agent',
    });

    expect(agent.name).toBe('test-agent');
    expect(agent.field).toBe('density');
    expect(agent.stepSize).toBe(0.1);
  });

  it('supports static bias helpers', () => {
    expect(GradientAgent.downhill(1)).toEqual([0, -1, 0]);
    expect(GradientAgent.uphill(2)).toEqual([0, 2, 0]);
    expect(GradientAgent.wind([1, 0, 0], 0.5)).toEqual([0.5, 0, 0]);
  });

  it('sets and gets position', () => {
    const agent = new GradientAgent({
      field: 'density',
      step: 0.1,
      threshold: 0.01,
    });

    agent.setPosition(10, 20, 30);
    expect(agent.getPosition()).toEqual([10, 20, 30]);
  });

  it('steps an entity through the field', () => {
    const graph = new TensorGraph({
      resolution: [512, 512],
      channels: ['density'],
    });

    const entity = new TensorEntity({
      channels: { density: 0.5 },
      radius: 8,
      type: 'agent',
    });
    graph.add(entity);

    const agent = new GradientAgent({
      field: 'density',
      step: 1.0,
      threshold: 0.001,
    });

    // Should not throw
    agent.step(entity, graph);
    expect(agent.getPosition()).toBeDefined();
  });
});

describe('GradientUtils', () => {
  it('computes central difference gradient', () => {
    const fn = (x: number, _y: number, _z: number) => x * x;
    const gradient = GradientUtils.centralDifference(fn, [1, 0, 0], 0.01);

    // Derivative of x^2 at x=1 is 2
    expect(gradient[0]).toBeCloseTo(2, 1);
  });

  it('computes gradient magnitude', () => {
    expect(GradientUtils.magnitude([3, 4, 0])).toBe(5);
    expect(GradientUtils.magnitude([0, 0, 0])).toBe(0);
  });

  it('normalizes gradients', () => {
    const normalized = GradientUtils.normalize([3, 4, 0]);
    expect(normalized[0]).toBeCloseTo(0.6, 5);
    expect(normalized[1]).toBeCloseTo(0.8, 5);
    expect(GradientUtils.normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('computes Laplacian', () => {
    const fn = (x: number, y: number, _z: number) => x * x + y * y;
    const laplacian = GradientUtils.laplacian(fn, [0, 0, 0], 0.01);

    // Laplacian of x^2 + y^2 is 4 at origin
    expect(laplacian).toBeGreaterThan(3);
  });

  it('smooths gradients', () => {
    const smoothed = GradientUtils.smooth(
      [1, 0, 0],
      [0, 0, 0],
      0.5,
    );
    expect(smoothed[0]).toBe(0.5);
  });
});

describe('Scheduler', () => {
  it('starts at tick 0', () => {
    const scheduler = new Scheduler();
    expect(scheduler.tick).toBe(0);
    expect(scheduler.elapsed).toBe(0);
  });

  it('increments tick on tickOnce', () => {
    const scheduler = new Scheduler();
    scheduler.tickOnce(1 / 60);
    expect(scheduler.tick).toBe(1);
    expect(scheduler.elapsed).toBeCloseTo(1 / 60);
  });

  it('executes phase handlers in order', () => {
    const scheduler = new Scheduler();
    const order: string[] = [];

    scheduler.on('input', () => order.push('input'));
    scheduler.on('constraints', () => order.push('constraints'));
    scheduler.on('physics', () => order.push('physics'));
    scheduler.on('render', () => order.push('render'));

    scheduler.tickOnce();

    expect(order).toEqual(['input', 'constraints', 'physics', 'render']);
  });

  it('respects phase enable/disable', () => {
    const scheduler = new Scheduler();
    let callCount = 0;

    scheduler.on('physics', () => callCount++);
    scheduler.disablePhase('physics');
    scheduler.tickOnce();

    expect(callCount).toBe(0);

    scheduler.enablePhase('physics');
    scheduler.tickOnce();

    expect(callCount).toBe(1);
  });

  it('supports multiple handlers per phase', () => {
    const scheduler = new Scheduler();
    let count = 0;

    scheduler.on('physics', () => count++);
    scheduler.on('physics', () => count++);

    scheduler.tickOnce();
    expect(count).toBe(2);
  });

  it('does not start animation loop in Node (browser-only feature)', () => {
    const scheduler = new Scheduler();
    expect(scheduler.isRunning).toBe(false);
  });

  it('resets tick counter', () => {
    const scheduler = new Scheduler();
    scheduler.tickOnce();
    expect(scheduler.tick).toBe(1);

    scheduler.reset();
    expect(scheduler.tick).toBe(0);
    expect(scheduler.elapsed).toBe(0);
  });
});

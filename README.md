# Flux Chamber

> Field-driven runtime for the MANIFOLD ecosystem. Not a game engine. Not a terrain engine. A **continuous-interaction substrate** where state flows through material tensors instead of discrete components.

[![WebGPU](https://img.shields.io/badge/WebGPU-native-blue)](https://gpuweb.github.io/gpuweb/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)
[![npm](https://img.shields.io/npm/v/flux-chamber)](https://www.npmjs.com/package/flux-chamber)
[![Continuity](https://img.shields.io/badge/manifold-field--driven-purple)](https://github.com/COMMENCINGTHESCOURGE/hyperpoly-terrain)

**Flux Chamber** is the missing runtime layer between [hyperpoly-terrain](https://github.com/COMMENCINGTHESCOURGE/hyperpoly-terrain) (GPU compute substrate) and the interactive world. Where hyperpoly-terrain gives you the engine for material tensors, flux-chamber gives you the platform to *program with them*.

---

## Why Flux Chamber

Traditional runtimes (game engines, ECS frameworks) operate on discrete components. An entity has a position, a health value, a mesh reference. When the world changes, you swap components — LOD popping, asset swaps, entity spawning/despawning.

Field-driven runtimes operate differently. Everything is a **continuous tensor field**. A character isn't "at position (x,y,z)" — it's a local maximum in the density field with a gradient that defines its velocity. A building isn't "damaged = 0.4" — it's a region of the material tensor with reduced cohesion. The world is one unbroken substrate.

Flux chamber makes this programmable.

```text
┌──────────────────────────────────────────────────┐
│                  Flux Chamber                      │
│                                                    │
│  ┌──────────┐  ┌────────────┐  ┌───────────────┐   │
│  │ Tensor    │  │ Vinculum   │  │ Field         │   │
│  │ Graph ECS │──│ Constraint │──│ Collision     │   │
│  │           │  │ Pipeline   │  │               │   │
│  └──────────┘  └────────────┘  └───────────────┘   │
│         │              │               │            │
│  ┌──────┴──────────────┴───────────────┴──────┐     │
│  │           WGSL Compute Bridge               │     │
│  │   (hyperpoly-terrain / WebGPU backends)     │     │
│  └────────────────────────────────────────────┘     │
│         │                                            │
│  ┌──────┴──────────────────────────────────────┐    │
│  │         Render Bridges                        │    │
│  │   Three.js │ Babylon │ Canvas │ Raw WebGPU   │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

## When You Want Flux Chamber

| You want to... | Without flux-chamber | With flux-chamber |
|---|---|---|
| Make an NPC follow terrain features | Write pathfinding AI | Attach a gradient-following agent to the material tensor |
| Simulate weather over terrain | Build a separate weather system | Invert the moisture channel and add an advection constraint |
| Create an arena where terrain destructs | Implement mesh cutting | Write a cohesion-threshold vinculum and let the field erode |
| Build a distributed simulation | Run multiple instances | Transport field patches over WebRTC |
| Add a new material type | Rewrite the engine | Register a constraint module + channel |

---

## Getting Started

```bash
npm install flux-chamber
```

```typescript
import { FluxChamber, TensorEntity, GradientAgent } from 'flux-chamber';
import { HyperpolyBridge } from 'flux-chamber/bridge/hyperpoly';

const chamber = new FluxChamber();

// Register a tensor entity — a character defined by its field footprint
const player = new TensorEntity({
  channels: { density: 1.0, cohesion: 0.8, velocity: [0, 0, 0] },
  gradient: [0.5, 0, 0.3],  // direction of motion
  radius: 8                  // field influence radius
});

// Add a gradient-following agent — walks the tensor gradient like an ant
const agent = new GradientAgent({
  field: 'density',
  step: 0.1,
  threshold: 0.01,
  bias: [0, -1, 0]  // tends downhill
});

// Register a vinculum constraint — enforce conservation
chamber.addConstraint({
  name: 'mass-conservation',
  type: 'conservation',
  channels: ['density', 'cohesion'],
  rate: 0.01,
  mode: 'reversible'  // or 'dissipative', 'threshold'
});

chamber.addEntity(player);
chamber.attachAgent(agent, player);

// Step the simulation
chamber.step(1/60);  // 60 FPS tick
```

---

## Core Concepts

### Tensor ECS
Entities are **field footprints** — regions of the material tensor with identity. They have no position component; they *are* the local state of the field. Movement is gradient flow.

### Vinculum Constraints
Every interaction between channels is a vinculum: a ratio-based operator that enforces a relationship. Conservation laws, material transitions, dissipation rates — all vinculums.

### Gradient Agents
Agents that navigate by reading the field gradient. An agent following the density gradient downhill is walking erosion paths. An agent following the temperature gradient upwind is riding thermals. Same mechanism, different channel.

### Field Collision
Collision isn't between bounding boxes — it's tensor repulsion. When two entity footprints overlap, the vinculum constraint between their channels resolves the interaction. No contact normals, no penetration depth — just field deformation.

### Bridges
Each rendering backend is a *bridge* — a translation layer between the material tensor and a visual representation. The same tensor drives a WebGPU mesh, a Three.js scene graph, or a Canvas 2D overlay. The simulation runs once; the views are projections.

---

## Project Structure

```
flux-chamber/
├── src/
│   ├── runtime/        # Core runtime: scheduler, tensor graph, vinculum pipeline
│   │   ├── chamber.ts  # Main FluxChamber class
│   │   ├── tensor-graph.ts  # Tensor entity + field graph
│   │   ├── vinculum.ts      # Constraint pipeline
│   │   └── scheduler.ts     # Tick scheduling + phase ordering
│   ├── physics/        # Field-based physics
│   │   ├── collision.ts     # Tensor-field collision
│   │   ├── conservation.ts  # Conservation enforcement
│   │   └── gradient.ts      # Gradient computation utilities
│   ├── ai/             # Field-aware agents
│   │   ├── gradient-agent.ts   # Field-following agent
│   │   ├── flocking.ts        # Field-based flocking behavior
│   │   └── steering.ts        # Gradient-weighted steering
│   ├── bridge/         # Render & compute bridges
│   │   ├── hyperpoly.ts       # hyperpoly-terrain integration
│   │   ├── three.ts           # Three.js render bridge
│   │   ├── canvas.ts          # Canvas 2D bridge
│   │   └── webgpu.ts          # Raw WebGPU bridge
│   └── types/          # TypeScript type definitions
│       ├── tensor.ts          # Tensor types
│       ├── vinculum.ts        # Constraint types
│       └── entity.ts          # Entity types
├── examples/           # Runnable demos
├── tests/              # Tests
├── docs/               # Documentation
├── ROADMAP.md          # Full vision & milestones
├── VISION.md           # Philosophy
├── LICENSE
├── package.json
└── tsconfig.json
```

---

## Prerequisites

- Node.js 18+
- WebGPU-capable browser (Chrome 113+, Edge 113+, Firefox Nightly)
- [hyperpoly-terrain](https://github.com/COMMENCINGTHESCOURGE/hyperpoly-terrain) (optional, for terrain-based simulations)

---

## Development

```bash
git clone https://github.com/COMMENCINGTHESCOURGE/flux-chamber.git
cd flux-chamber
npm install
npm run build
npm test
```

---

## Ecosystem

```
hyperpoly-terrain ← flux-chamber → trench-builder
                        ↓
              guinea-pig-trench-portal
                        ↓
                   (your project)
```

Flux-chamber is the layer that makes MANIFOLD programmable. hyperpoly-terrain provides the substrate. trench-builder provides a demo. flux-chamber provides the runtime. And your project provides the experience.

---

## License

MIT © 2026 DaShawn McLaughlin / Guinea Pig Trench LLC

Part of the MANIFOLD field computation system.

*"Continuity is not a feature. It's the platform."*

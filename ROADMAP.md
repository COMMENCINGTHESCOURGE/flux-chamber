# Flux Chamber — The Better Question

## Why This Repo Is 10× Better Than My Top 3

Every project I've built solves one piece of the continuity puzzle:
- **hyperpoly-terrain**: the compute substrate — 6-channel material tensors, QEF mesh extraction, conservation-enforcing WGSL simulation
- **trench-builder**: the world-demo layer — chunk streaming, MANIFOLD↔Three.js bridge, open-world integration
- **guinea-pig-trench-portal**: the surface — 40+ games, 129 tracks, 5 worlds, no frameworks

Each is strong in its domain. Each leaves a gap.

Flux Chamber closes the gap: **the runtime that makes field computation programmable**.

### What hyperpoly-terrain does that flux-chamber inherits
- 6-channel material tensor representation
- Cohesion-weighted QEF mesh extraction
- Conservation-enforcing volumetric simulation
- WGSL compute shader pipeline

### What trench-builder does that flux-chamber inherits
- Chunk streaming with async tensor generation
- Three.js bridge for rendering
- Tensor-aware collision fields

### What flux-chamber adds that neither has

| Capability | hyperpoly-terrain | trench-builder | flux-chamber |
|---|---|---|---|
| Programmable entity system | ❌ | ❌ | ✅ Tensor-graph ECS |
| Field-aware AI steering | ❌ | ❌ | ✅ Gradient-following agents |
| Scriptable conservation rules | ❌ | ❌ | ✅ Vinculum constraint DSL |
| Multi-input sensor fusion | ❌ | ❌ | ✅ Field→field and field→mesh |
| Runtime hot-swap of shader modules | ❌ | ❌ | ✅ WGSL module registry |
| Reactive tensor triggers | ❌ | ❌ | ✅ When-tensor-changes → effector |
| Distributed field transport | ❌ | ❌ | ✅ Field patches over WebRTC |
| Authoring tools | ❌ | ❌ | ✅ Flux Studio (visual field editor) |

### The 10× dimensions

**1. From library to runtime.** hyperpoly-terrain gives you a terrain engine. flux-chamber gives you a field-driven application platform. You write programs that live *inside* the tensor graph — not programs that call a terrain API.

**2. From terrain to any substrate.** The continuity engine isn't just for erosion. Same 6-channel tensor model drives: weather fields, NPC attention fields, acoustic propagation, economic gradient flow, narrative tension maps. Flux-chamber provides the abstraction that makes all of these first-class.

**3. From single-machine to distributed.** trench-builder streams chunks locally. flux-chamber transports field patches over WebRTC — multiple browsers share the same material tensor world, each computing a partition.

**4. From hand-coded to programmable.** Every conservation law, every material interaction, every collision rule is a vinculum constraint module that can be loaded, swapped, or composed at runtime. No recompilation. No redeploy.

**5. From demo to product.** trench-builder is a demo. guinea-pig-trench-portal is a portal. flux-chamber is a platform others can build on. API surface, documentation, package distribution, example gallery, integration tests.

---

## Phase 1: Core Runtime (this commit)
- [x] Repository scaffold
- [x] Tensor-graph entity system
- [x] Vinculum constraint pipeline
- [x] Field collision system
- [x] Gradient-aware agent steering
- [x] hyperpoly-terrain bridge
- [x] Three.js render bridge
- [x] Package ecosystem (npm, docs)

## Phase 2: Distributed Fields
- [ ] WebRTC field patch transport
- [ ] Peer discovery via manifest nodes
- [ ] Conflict resolution for overlapping field writes
- [ ] Latency-compensated tensor interpolation

## Phase 3: Flux Studio
- [ ] Visual field editor (WebGPU canvas)
- [ ] Real-time tensor visualization
- [ ] Constraint graph editor
- [ ] Runtime state inspector

## Phase 4: Templates & Galleries
- [ ] Biome template: 6-channel starter sets
- [ ] NPC template: gradient-following agents
- [ ] Weather template: atmospheric field overlay
- [ ] Economic template: resource gradient simulation
- [ ] Acoustic template: field-driven reverb zones

---

*"Continuity is not a feature. It's the platform."*

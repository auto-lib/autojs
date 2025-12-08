The Architecture

  ┌─────────────────────────────────────────────┐
  │  block.js - composable blocks               │
  │  (needs/gives, wiring, autoWire)            │
  ├─────────────────────────────────────────────┤
  │  auto.js - nice $.x syntax                  │
  ├─────────────────────────────────────────────┤
  │  graph.js - reactive handlers               │
  │  (get, set, run, define, invalidate)        │
  ├─────────────────────────────────────────────┤
  │  kernel.js - policy engine                  │
  │  (immediate/deferred/dispatch/drop)         │
  └─────────────────────────────────────────────┘

  How It Works

  kernel.js - The universal foundation:
  - Receives intents via sig(name, value)
  - Routes to policy: immediate (returns value), deferred (queued), dispatch (send to peer)
  - Supports transforms (middleware)
  - Connects to other kernels via connect()

  graph.js - Reactive semantics as handler configs:
  - get: immediate, returns value, tracks deps
  - set: deferred, stores value, triggers invalidation
  - run: deferred, executes computed function
  - All just handler configurations, not execution logic

  auto.js - Single-block convenience:
  - Wraps kernel + graph handlers
  - Provides $.x syntax

  block.js - Multi-block composition:
  - Adds needs/gives interface
  - Adds input/output handlers for cross-block communication
  - wire() manually connects blocks
  - autoWire() automatically wires by matching names
  - runAll() runs all blocks until stable

  The Key Insight

  The reactive graph (dependency tracking, invalidation) is now just handler configurations for the kernel. The kernel is the true foundation - it handles:
  - Immediate vs deferred execution (policies)
  - Communication between blocks (dispatch)
  - Transforms/middleware

  This means you can now naturally wire blocks together, and the same policy engine handles both internal reactivity and cross-block routing.


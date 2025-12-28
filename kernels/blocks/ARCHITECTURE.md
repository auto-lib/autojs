# Blocks Kernel Architecture: Deep Dive

This document explores the fundamental architectural questions of the blocks kernel: what is a block, what is a graph, how do we discover dependencies, and how do graphs and execution interact.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Dependency Discovery Strategies](#dependency-discovery-strategies)
3. [The Kernel: Execution Engine](#the-kernel-execution-engine)
4. [Graph vs Execution: Separation or Integration?](#graph-vs-execution-separation-or-integration)
5. [Blocks and Cross-Block Dependencies](#blocks-and-cross-block-dependencies)
6. [The Virtual Machine Perspective](#the-virtual-machine-perspective)
7. [Architectural Tradeoffs](#architectural-tradeoffs)
8. [Synthesis: The Blocks Approach](#synthesis-the-blocks-approach)

---

## Core Concepts

### What is a Block?

A **block** is a self-contained reactive computation unit with:

1. **Inputs (needs)**: Variables the block reads from outside
2. **Outputs (gives)**: Variables the block exposes to outside
3. **Internal state**: Private reactive computations
4. **Execution context**: Its own kernel instance (optionally)

```javascript
let block = {
    name: 'data-processor',
    needs: ['raw_data'],           // External inputs
    gives: ['processed', 'count'], // Exported outputs
    state: {
        raw_data: null,            // Input (from another block)
        cleaned: ($) => $.raw_data.filter(x => x != null),  // Internal
        processed: ($) => $.cleaned.map(transform),          // Output
        count: ($) => $.processed.length                     // Output
    }
};
```

**Key insight**: Blocks are like **React components** but for data, not UI:
- Components have props (needs) and render output (gives)
- Blocks have inputs (needs) and computed outputs (gives)
- Both compose into larger systems

### What is a Graph?

A **graph** is a directed acyclic graph (DAG) where:

1. **Nodes** = Variables (both static values and computed functions)
2. **Edges** = Dependencies (if `y` depends on `x`, there's edge `x → y`)
3. **Topology** = The structure determines execution order (topological sort)

```
Example:
  data → count → message
    ↓      ↓
    └────→ summary

Graph representation:
  nodes: { data, count, message, summary }
  edges: {
    data: [count, summary],      // data → count, data → summary
    count: [message, summary]    // count → message, count → summary
  }
```

**Two types of graphs**:

1. **Single-block graph**: Dependencies within one block
   ```
   Block 'processor':
     raw_data → cleaned → processed → count
   ```

2. **Cross-block graph**: Dependencies spanning multiple blocks
   ```
   Block 'fetcher':        Block 'processor':
     url → data ────────→ raw_data → processed
   ```

---

## Dependency Discovery Strategies

This is a **fundamental architectural choice**. There are three main strategies, each with profound tradeoffs.

### Strategy 1: Static Analysis (toString + Regex)

**How it works**: Parse function source code to find all `$.property` accesses.

```javascript
function discoverDependencies(fn, name) {
    const source = fn.toString();
    const regex = /\$\.(\w+)/g;
    const deps = new Set();
    let match;

    while ((match = regex.exec(source)) !== null) {
        const propName = match[1];
        if (propName !== name) {
            deps.add(propName);
        }
    }

    return deps;
}

// Example
let fn = ($) => $.enabled ? $.data.length : 0;
discoverDependencies(fn, 'result');
// Returns: Set(['enabled', 'data'])
```

**Advantages**:
- ✅ **Fast**: No execution required
- ✅ **Conservative**: Finds all *possible* dependencies (safe)
- ✅ **Simple**: Just regex matching

**Disadvantages**:
- ❌ **Over-conservative**: Finds dependencies even in dead branches
  ```javascript
  // Will discover both 'data' and 'fallback', even though only one is used
  result: ($) => $.enabled ? $.data : $.fallback
  ```
- ❌ **Limited**: Can't handle dynamic property access
  ```javascript
  // Won't discover 'x' or 'y'
  result: ($) => $.config.prop == 'x' ? $.x : $.y
  ```
- ❌ **Brittle**: Breaks with destructuring, spread, etc.
  ```javascript
  // Won't discover 'a' and 'b'
  result: ($) => { let {a, b} = $; return a + b; }
  ```

**Advanced patterns** (from `graph-first/static-analysis.js`):
- Handle bracket notation: `$["prop"]` or `$['prop']`
- Detect destructuring: `const { x, y } = $`
- Warn on dynamic access: `$[variable]`
- Detect spread operator: `...$` (can't analyze)

### Strategy 2: Runtime Tracking (Proxy)

**How it works**: Execute the function with a proxy that tracks all property accesses.

```javascript
function discoverDependenciesRuntime(fn, name) {
    const accessed = new Set();

    const proxy = new Proxy({}, {
        get(target, prop) {
            if (prop !== name) {
                accessed.add(prop);
            }
            return undefined; // Return dummy value
        }
    });

    try {
        fn(proxy);
    } catch (e) {
        // Expected - we're just tracking accesses
    }

    return accessed;
}

// Example
let fn = ($) => $.enabled ? $.data.length : 0;
discoverDependenciesRuntime(fn, 'result');
// Returns: Set(['enabled', 'data']) - both branches accessed during discovery
```

**But wait** - this still discovers both branches! The real power comes from **continuous runtime tracking**:

```javascript
function computeWithTracking(fn, name, currentState) {
    const accessed = new Set();

    const proxy = new Proxy(currentState, {
        get(target, prop) {
            if (prop !== name) {
                accessed.add(prop);
            }
            return target[prop]; // Return actual value
        }
    });

    const result = fn(proxy);
    return { result, actualDeps: accessed };
}

// Now with actual state:
let state = { enabled: false, data: [1,2,3], fallback: null };
let fn = ($) => $.enabled ? $.data : $.fallback;

computeWithTracking(fn, 'result', state);
// Returns: { result: null, actualDeps: Set(['enabled', 'fallback']) }
//                                                      ^^^^^^^^^^
//                                          Only 'fallback' was actually accessed!
```

**Advantages**:
- ✅ **Precise**: Only tracks dependencies actually used
- ✅ **Dynamic**: Handles conditionals correctly
- ✅ **Flexible**: Works with any access pattern (destructuring, spread, dynamic keys)

**Disadvantages**:
- ❌ **Requires execution**: Must run functions to discover deps
- ❌ **Mutable graph**: Dependencies can change on every execution
- ❌ **Complexity**: Need to manage graph updates, recompute execution order
- ❌ **Performance**: More overhead per execution

**Key insight from graph-first/runtime-tracking.js**: You can have a **mutable graph** that updates its structure based on what the function actually accessed. This is powerful but complex.

### Strategy 3: Explicit Declaration

**How it works**: Developer manually declares dependencies, like React's `useEffect` dependency array.

```javascript
function computed(deps, fn) {
    return { deps, fn, __computed: true };
}

// Usage
let state = {
    enabled: false,
    data: [1,2,3],
    fallback: null,

    // Explicit: declare exactly what this depends on
    result: computed(['enabled', 'data', 'fallback'], ($) => {
        return $.enabled ? $.data : $.fallback;
    })
};
```

**Advantages**:
- ✅ **Clear**: Dependencies are explicit and visible
- ✅ **Fast**: No discovery needed
- ✅ **Predictable**: Graph is immutable and known upfront

**Disadvantages**:
- ❌ **Manual**: Developer must remember to update deps
- ❌ **Error-prone**: Easy to forget a dependency (leads to stale values)
- ❌ **Verbose**: Extra typing for every computed value

**Key insight**: This works great for small, stable systems. But for complex reactive graphs with many computed values, the manual overhead is high.

### Strategy 4: Hybrid Approaches

You can combine strategies:

**Static + Runtime**:
1. Static analysis discovers conservative set of deps
2. Runtime tracking refines to actual deps
3. Validate: warn if runtime deps ⊄ static deps (potential bug)

**Explicit + Fallback**:
1. Allow explicit declaration for tricky cases
2. Fall back to auto-discovery for simple cases
```javascript
state: {
    // Simple - auto-discover
    count: ($) => $.data.length,

    // Complex - explicit
    result: computed(['mode', 'data'], ($) => {
        return $.mode == 'full' ? processAll($.data) : $.data[0];
    })
}
```

**Progressive tracking**:
1. First execution: use static analysis (fast startup)
2. Subsequent executions: refine with runtime tracking
3. Stabilize: once deps stop changing, lock the graph

---

## The Kernel: Execution Engine

The **kernel** is the execution engine that runs reactive computations. It's a **policy-based intent router** inspired by the `channel` and `auto4` kernels.

### Core Concepts

An **intent** is a message requesting an action:
```javascript
{ name: 'set', value: { target: 'data', val: [1,2,3] } }
{ name: 'get', value: { target: 'count', parent: 'message' } }
{ name: 'run', value: 'count' }
```

A **policy** determines how to handle the intent:
- `immediate`: Execute now, can return a value (sync)
- `deferred`: Queue for later execution (async batching)
- `dispatch`: Send to another kernel (cross-block communication)
- `drop`: Ignore

A **handler** implements the action:
```javascript
handlers.set = {
    policy: 'deferred',
    handler: (name, value, sig, state) => {
        let { target, val } = value;
        state.cache[target] = val;
        sig('invalidate', target);  // Emit another signal
    }
};
```

### The Execution Loop

```javascript
function kernel(config) {
    let queue = [];
    let state = config.state || {};
    let handlers = config.handlers || {};

    // Send an intent
    function sig(name, value) {
        let intent = { name, value };

        // Determine policy
        let policy = route(intent, state);

        if (policy === 'immediate') {
            return executeImmediate(intent);
        } else if (policy === 'deferred') {
            queue.push(intent);
        } else if (policy === 'dispatch') {
            // Send to another kernel
        }
    }

    // Process one step - drain queue
    function step() {
        let current = queue;
        queue = [];
        for (let intent of current) {
            executeDeferred(intent);
        }
    }

    // Run until stable
    function run() {
        while (queue.length > 0) {
            step();
        }
    }

    return { sig, step, run };
}
```

**Key insight**: The kernel is a **universal execution engine**. It doesn't care about reactivity - that's implemented by handlers.

### Reactive Handlers

Reactivity is implemented as handlers:

```javascript
let reactiveHandlers = {
    get: {
        policy: 'immediate',  // Must return value immediately
        handler: (n, v, sig, state) => {
            let { target, parent } = v;

            // Track dependency
            if (parent) {
                if (!state.deps[parent]) state.deps[parent] = {};
                state.deps[parent][target] = true;
            }

            // Compute if needed
            if (target in state.fns && !(target in state.cache)) {
                sig('run', target);  // Will queue for deferred execution
                // But we need value NOW... this is a problem!
            }

            return state.cache[target];
        }
    },

    run: {
        policy: 'deferred',  // Queue for batch execution
        handler: (n, v, sig, state) => {
            let target = v;
            let fn = state.fns[target];

            // Execute with proxy to track deps
            let proxy = new Proxy({}, {
                get(_, prop) {
                    return sig('get', { target: prop, parent: target });
                }
            });

            let result = fn(proxy);
            state.cache[target] = result;
        }
    },

    set: {
        policy: 'deferred',
        handler: (n, v, sig, state) => {
            let { target, val } = v;
            state.cache[target] = val;

            // Invalidate dependents
            sig('invalidate', target);
        }
    },

    invalidate: {
        policy: 'deferred',
        handler: (n, v, sig, state) => {
            let target = v;

            // Find dependents
            for (let dep in state.dependents[target] || {}) {
                delete state.cache[dep];
                sig('run', dep);
                sig('invalidate', dep);  // Cascade
            }
        }
    }
};
```

**Problem**: Notice the tension between `get` (immediate) and `run` (deferred)? This is a fundamental challenge.

---

## Graph vs Execution: Separation or Integration?

This is the **deepest architectural question**: Should the graph and execution engine be separate or tightly integrated?

### Approach A: Separate Graph and Execution (graph-first)

**Architecture**:
```
┌─────────────────┐
│ ReactiveGraph   │  ← Immutable, built once
│  - nodes        │
│  - edges        │
│  - order        │
└─────────────────┘
        ↓
┌─────────────────┐
│ GraphState      │  ← Mutable values
│  - values       │
│  - dirty        │
│  - compute()    │
└─────────────────┘
```

**How it works**:
1. Build graph structure once at initialization
2. Discover dependencies (static or runtime proxy)
3. Compute topological order
4. Execution just walks the graph structure

**Advantages**:
- ✅ **Clean separation**: Graph is pure data structure
- ✅ **Visualizable**: Can export graph without execution
- ✅ **Testable**: Can test graph structure independently
- ✅ **Optimizable**: Precompute execution order once

**Disadvantages**:
- ❌ **Static deps**: Hard to handle conditional dependencies
- ❌ **Two phases**: Build graph, then execute
- ❌ **Less flexible**: Graph structure can't adapt to runtime behavior

### Approach B: Integrated Graph and Execution (channel/kernel)

**Architecture**:
```
┌─────────────────────────────┐
│  Kernel                     │
│   - sig() sends intents     │
│   - handlers process them   │
│   - graph emerges from flow │
└─────────────────────────────┘
```

**How it works**:
1. Execution is primary - signals flow through handlers
2. Graph structure emerges from tracking which signals trigger which
3. Dependencies discovered during execution via proxy

**Advantages**:
- ✅ **Flexible**: Graph adapts to runtime behavior
- ✅ **Unified**: One system does both execution and dependency tracking
- ✅ **Extensible**: Add features by adding handlers

**Disadvantages**:
- ❌ **Complex**: Graph structure is implicit
- ❌ **Performance**: More overhead per execution
- ❌ **Harder to visualize**: Must reconstruct graph from execution traces

### Approach C: Hybrid (blocks kernel)

**Architecture**:
```
┌─────────────────┐
│ DirectedGraph   │  ← Pure graph structure (from graph-first)
│  - addNode()    │
│  - addEdge()    │
│  - topoSort()   │
└─────────────────┘
        ↕
┌─────────────────┐
│ Kernel          │  ← Execution engine (from auto4)
│  - sig()        │
│  - handlers     │
│  - run()        │
└─────────────────┘
        ↕
┌─────────────────┐
│ Block           │  ← Composition layer
│  - needs/gives  │
│  - wire()       │
└─────────────────┘
```

**How it works**:
1. Each block has a kernel for execution
2. Cross-block graph built from block wiring
3. Dependencies discovered via runtime tracking during execution
4. Graph and execution interact bidirectionally:
   - Execution discovers dependencies → updates graph
   - Graph determines execution order → guides execution

**Key insight**: We need **both** because:
- Static graph enables: visualization, testing, optimization
- Runtime execution enables: accurate dependency tracking, conditional logic

---

## Blocks and Cross-Block Dependencies

### The Challenge

Within a single block, dependency discovery works:

```javascript
// Block 'processor'
state: {
    data: [1,2,3],
    count: ($) => $.data.length  // toString finds: /\$\.data/
}
```

But across blocks, it breaks:

```javascript
// Block 'fetcher'
state: {
    url: 'http://api.com',
    data: async ($) => fetch($.url)
}

// Block 'processor' - needs data from 'fetcher'
state: {
    count: ($) => $.data.length  // $.data refers to wired input!
}
```

**Problem**: `toString` on `processor.count` will find `$.data`, but that refers to *wired input from fetcher block*, not an internal variable.

### Solution 1: Runtime Tracking Required

For cross-block dependencies, you **must** use runtime tracking:

```javascript
// During execution:
processor.get('count');
  → runs function: ($) => $.data.length
  → proxy intercepts: $.data
  → sees 'data' is a wired input
  → traces back to: fetcher.gives.data
  → records edge: fetcher.data → processor.count
```

**Insight**: Cross-block graphs **require** execution to discover dependencies.

### Solution 2: Explicit Block Wiring

Alternatively, make wiring explicit:

```javascript
let fetcher = block({ gives: ['data'], ... });
let processor = block({ needs: ['data'], ... });

// Explicit wiring creates graph edge
fetcher.wire('data', processor, 'data');
//           source    target    dest

// Now we know: fetcher.data → processor.data (input)
// And processor's internal graph: processor.data → processor.count
// So cross-block graph: fetcher.data → processor.count
```

**Insight**: Block boundaries make dependencies explicit. The graph is:
```
Internal graph (fetcher):
  url → data

Cross-block graph:
  fetcher.data → processor.data (wire)

Internal graph (processor):
  data → count

Unified graph:
  url → data → count
  └──fetcher──┘  └processor┘
```

### Testing Cross-Block Dependencies

```javascript
// Test: Can we discover cross-block deps?

let fetcher = block({
    name: 'fetcher',
    gives: ['data'],
    state: {
        data: [1,2,3]
    }
});

let processor = block({
    name: 'processor',
    needs: ['data'],
    gives: ['count'],
    state: {
        count: ($) => $.data.length
    }
});

// Wire
fetcher.wire('data', processor, 'data');

// Build cross-block graph
let graph = buildCrossBlockGraph([fetcher, processor]);

// Should discover:
assert(graph.has('fetcher.data'));
assert(graph.has('processor.data'));
assert(graph.has('processor.count'));

assert(graph.hasEdge('fetcher.data', 'processor.data')); // Wire
assert(graph.hasEdge('processor.data', 'processor.count')); // Internal

// Full path:
let path = graph.getPath('fetcher.data', 'processor.count');
assert.deepEqual(path, [
    'fetcher.data',
    'processor.data',
    'processor.count'
]);
```

---

## The Virtual Machine Perspective

### Is the Kernel a Virtual Machine?

**Yes**, in a meaningful sense:

1. **Instructions**: Intents (signals) are like opcodes
   ```javascript
   { name: 'set', value: { target: 'x', val: 5 } }  // STORE x, 5
   { name: 'get', value: { target: 'x' } }          // LOAD x
   { name: 'run', value: 'compute' }                // CALL compute
   ```

2. **Instruction Set**: Handlers define what each "opcode" does
   ```javascript
   handlers.set = ...  // Implementation of STORE
   handlers.get = ...  // Implementation of LOAD
   handlers.run = ...  // Implementation of CALL
   ```

3. **Program Counter**: The queue is like an instruction queue
   ```javascript
   queue = [
       { name: 'set', ... },  // Next instruction
       { name: 'run', ... },  // Queued instruction
       ...
   ];
   ```

4. **Execution Modes**: Policies determine immediate vs deferred execution
   - `immediate` = synchronous instruction (blocking)
   - `deferred` = async instruction (queued)

5. **State**: The `state` object is like memory/registers
   ```javascript
   state = {
       cache: { x: 5, y: 10 },      // Memory
       fns: { z: ($) => $.x + $.y }, // Code
       deps: { z: { x: true, y: true } }, // Metadata
   };
   ```

### Is Each Block a Separate VM?

**Yes**, and this is powerful:

```javascript
let fetcherKernel = kernel({
    state: { /* fetcher state */ },
    handlers: reactiveHandlers
});

let processorKernel = kernel({
    state: { /* processor state */ },
    handlers: reactiveHandlers
});

// Blocks communicate via signals
fetcherKernel.connect('processor', processorKernel);

// When fetcher.data changes:
fetcherKernel.sig('set', { target: 'data', val: [...] });
  → triggers handler
  → emits: sig('output', { target: 'data', val: [...] })
  → dispatch policy: send to processorKernel
  → processorKernel.sig('input', { target: 'data', val: [...] })
```

**Advantages**:
- ✅ **Isolation**: Each block has its own execution context
- ✅ **Composition**: VMs communicate via well-defined protocol (signals)
- ✅ **Concurrency**: Could run blocks in parallel (future)
- ✅ **Debugging**: Can inspect/pause individual block VMs

**Disadvantages**:
- ❌ **Overhead**: More complex than unified execution
- ❌ **Synchronization**: Need to coordinate across blocks

### But Is This Useful for Charting?

**The honest answer**: Maybe not initially.

For charting apps, the value is in:
1. **Modular code organization** (blocks)
2. **Diff-driven testing** (comparing states)
3. **Causality tracing** (understanding changes)

The VM abstraction is elegant but might be **over-engineered** for this use case.

**Simpler alternative**: Use the kernel within blocks for execution, but don't expose it:

```javascript
// Internal: blocks use kernel for execution
function block(config) {
    let k = kernel({ state, handlers });
    // ... create block API
    return { name, needs, gives, get, set };
}

// External: users just see blocks
let myBlock = block({ needs: [...], gives: [...], state: {...} });
```

**When VMs become useful**:
- Distributed execution (blocks on different servers)
- Sandboxing (untrusted block code)
- Time travel debugging (replay VM execution)
- Performance isolation (profile individual blocks)

For now: **Use the VM architecture internally, but don't expose it to users.**

---

## Architectural Tradeoffs

Let me synthesize the key decisions:

### Decision 1: Dependency Discovery

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| **Static (toString)** | Fast, simple, conservative | Over-conservative, limited | Simple, stable graphs |
| **Runtime (proxy)** | Precise, dynamic, flexible | Requires execution, mutable graph | Complex, conditional logic |
| **Explicit (manual)** | Clear, predictable, fast | Verbose, error-prone | Small, critical computations |
| **Hybrid** | Balance of all | More complex implementation | Production systems |

**Recommendation for blocks**: **Hybrid**
- Default: Runtime tracking (accurate for complex real-world code)
- Optional: Explicit declaration for performance-critical paths
- Fallback: Static analysis for error checking (warn if runtime ⊄ static)

### Decision 2: Graph Mutability

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Immutable** | Predictable, visualizable, optimizable | Can't handle dynamic deps | Static computation graphs |
| **Mutable** | Flexible, adapts to runtime | Complex, harder to visualize | Dynamic, conditional logic |

**Recommendation for blocks**: **Mutable with snapshots**
- Graph can update during execution
- Take immutable snapshots for visualization/diffing
- Track graph changes as part of diff analysis

### Decision 3: Graph/Execution Relationship

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Separate** | Clean, testable, visualizable | Static, less flexible | Simple reactive systems |
| **Integrated** | Flexible, unified, extensible | Complex, implicit structure | Advanced reactive systems |
| **Hybrid** | Best of both | More moving parts | Production systems |

**Recommendation for blocks**: **Hybrid**
- Pure DirectedGraph for structure analysis
- Kernel for execution
- Runtime tracking updates graph during execution
- Graph informs execution order

### Decision 4: Block Execution Model

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Shared kernel** | Simple, unified execution | No isolation | Single-threaded apps |
| **Per-block kernel** | Isolated, composable, debuggable | More overhead | Complex, distributed apps |

**Recommendation for blocks**: **Per-block kernels initially**
- Enables better debugging (isolate block execution)
- Enables future features (parallel execution, sandboxing)
- Overhead is acceptable for typical usage (<100 blocks)
- Can optimize later if needed

---

## Synthesis: The Blocks Approach

Based on this deep analysis, here's the recommended architecture:

### Layer 1: Pure Graph (from graph-first)

```javascript
// Pure directed graph - no execution
class DirectedGraph {
    addNode(id, metadata);
    addEdge(from, to);
    topologicalSort();
    hasCycle();
    toDot();
}
```

**Purpose**: Structure analysis, visualization, validation

### Layer 2: Execution Kernel (from auto4)

```javascript
// Policy-based execution engine
function kernel(config) {
    return {
        sig(name, value),  // Send intent
        step(),            // Process one batch
        run()              // Run until stable
    };
}
```

**Purpose**: Execute reactive computations, handle async, batching

### Layer 3: Reactive Handlers (from auto4/graph)

```javascript
// Handlers implement reactivity
let reactiveHandlers = {
    get: { policy: 'immediate', handler: ... },
    set: { policy: 'deferred', handler: ... },
    run: { policy: 'deferred', handler: ... },
    invalidate: { policy: 'deferred', handler: ... }
};
```

**Purpose**: Reactive semantics, dependency tracking

### Layer 4: Blocks (composition)

```javascript
function block(config) {
    let { name, needs, gives, state } = config;

    // Each block gets its own kernel
    let k = kernel({
        state: createReactiveState(),
        handlers: createReactiveHandlers()
    });

    // Initialize state
    for (let [n, v] of Object.entries(state)) {
        k.sig('define', { target: n, val: v });
    }
    k.run();

    // Public API
    return {
        name, needs, gives,
        get(n) { return k.sig('get', { target: n }); },
        set(n, v) { k.sig('set', { target: n, val: v }); k.run(); },
        wire(from, targetBlock, to) { /* ... */ }
    };
}
```

**Purpose**: Modular composition, cross-block wiring

### Layer 5: Cross-Block Graph (new)

```javascript
function buildCrossBlockGraph(blocks) {
    let graph = new DirectedGraph();

    // Add all nodes from all blocks
    for (let block of blocks) {
        for (let varName in block._.state.cache) {
            graph.addNode(`${block.name}.${varName}`, {
                block: block.name,
                variable: varName,
                value: block._.state.cache[varName]
            });
        }
    }

    // Add internal edges (from each block's deps)
    for (let block of blocks) {
        for (let [varName, deps] of Object.entries(block._.state.deps)) {
            for (let dep of Object.keys(deps)) {
                graph.addEdge(
                    `${block.name}.${dep}`,
                    `${block.name}.${varName}`
                );
            }
        }
    }

    // Add cross-block edges (from wires)
    for (let block of blocks) {
        for (let wire of block._.state.wires || []) {
            graph.addEdge(
                `${block.name}.${wire.from}`,
                `${wire.targetBlock.name}.${wire.to}`
            );
        }
    }

    return graph;
}
```

**Purpose**: Unified view of entire system, diff analysis, causality tracing

### Layer 6: Testing & Diffing (new)

```javascript
async function diffDrivenTest(config) {
    let result1 = await runTest({
        url: config.url,
        data: config.data,
        code: config.codeOriginal
    });

    let result2 = await runTest({
        url: config.url,
        data: config.data,
        code: config.codeModified
    });

    return {
        original: result1,
        modified: result2,
        comparison: compareResults(result1, result2),
        causality: traceCausality(...)
    };
}
```

**Purpose**: Understand what changed and why

---

## Summary: Key Decisions

1. **Dependency Discovery**: Hybrid (runtime tracking + optional explicit + static validation)

2. **Graph Mutability**: Mutable with snapshots (flexible + visualizable)

3. **Architecture**: Hybrid (separate DirectedGraph for structure + Kernel for execution)

4. **Block Execution**: Per-block kernels (isolation + composability)

5. **Cross-Block Dependencies**: Runtime tracking during execution + explicit wiring

6. **Testing**: Diff-driven (compare states before/after code changes)

This architecture balances:
- **Simplicity** (clean layers, each does one thing)
- **Power** (handles complex real-world patterns)
- **Debuggability** (graphs are explicit and visualizable)
- **Practicality** (works with actual charting app patterns)

The **key innovation** is treating blocks as modular VMs that communicate via signals, while maintaining a unified cross-block graph for analysis and debugging.


# Deep Structures: The Fundamental Architecture

**Date**: 2026-01-04
**Context**: What are the minimum, cleanest abstractions behind reactive state with blocks?

---

## The Question

We have: Graph, Static Analysis, Blocks, Resolver, Auto, Cache, Validation...

**But what are the DEEP structures? What's actually necessary? How do they relate?**

Let me think from first principles.

---

## Part 1: The Absolute Minimum (Core System)

### What Is Reactive State Management?

**At its essence**: "When X changes, recompute Y automatically"

To do this, you need THREE things:

1. **Structure** - Know what depends on what
2. **State** - Know current values and what needs recomputing
3. **Execution** - Recompute in correct order

That's it. Everything else is optimization or convenience.

### The Three-Layer Architecture

```
┌─────────────────────────────────────┐
│  STRUCTURE (static, immutable)      │
│  - Graph: What depends on what      │
└─────────────────────────────────────┘
              ↓ uses
┌─────────────────────────────────────┐
│  STATE (dynamic, mutable)           │
│  - Values: Current state            │
│  - Stale: What needs recomputing    │
└─────────────────────────────────────┘
              ↓ transformed by
┌─────────────────────────────────────┐
│  EXECUTION (actions)                │
│  - Resolver: Recompute stale        │
└─────────────────────────────────────┘
```

**This is the core.** Everything builds on these three layers.

---

## Part 2: The Core System (Without Blocks)

### Layer 1: Structure

```javascript
class Graph {
    nodes;        // Set of function names
    edges;        // Map: function → dependencies

    // Operations
    getPredecessors(node);   // What does this depend on?
    getSuccessors(node);     // What depends on this?
    topologicalSort(nodes);  // Sort by dependencies
}
```

**This is PURE STRUCTURE** - no values, no execution, just relationships.

Built by **Static Analysis** (extracting dependencies from function source).

### Layer 2: State

```javascript
class State {
    values;   // Map: name → current value
    stale;    // Set: names that need recomputing

    // Operations
    get(name);            // Get current value
    set(name, value);     // Set value
    markStale(name);      // Mark as needing recompute
    isStale(name);        // Check if stale
}
```

**This is DYNAMIC STATE** - changes over time as program runs.

### Layer 3: Execution

```javascript
class Resolver {
    constructor(graph, functions, state) {
        this.graph = graph;
        this.functions = functions;
        this.state = state;
    }

    // Main operation
    resolveStale() {
        // 1. Get stale set
        const stale = this.state.stale;

        // 2. Sort by dependencies
        const sorted = this.graph.topologicalSort(stale);

        // 3. Execute in order
        for (let name of sorted) {
            const fn = this.functions.get(name);
            const value = fn(); // Execute
            this.state.set(name, value);
        }

        // 4. Clear stale
        this.state.stale.clear();
    }
}
```

**This is PURE ACTION** - transforms state using structure.

### That's The Core

**Three things**:
- Structure (Graph)
- State (Values + Stale)
- Execution (Resolver)

**Operations**:
1. `setValue(name, value)` → Marks dependents stale
2. `getValue(name)` → Resolves if stale, returns value
3. `resolveStale()` → Executes all stale functions

**That's reactive state management.**

---

## Part 3: Where Blocks Fit

Blocks are **NOT part of the core**. They're an **optimization layer** on top.

### Blocks as Structure Metadata

```javascript
class Block {
    name;         // Block name
    inputs;       // Set: external dependencies
    outputs;      // Set: external usages
    functions;    // Set: functions in this block
}
```

**Blocks are metadata about the Graph** - they group functions and describe boundaries.

### Blocks Add Two Things

**1. Validation (Static Check)**

At startup, verify:
- All function dependencies are in `inputs` or produced internally
- All external usages are in `outputs`

**This catches errors early** - hidden dependencies, boundary violations.

**2. Optimization (Runtime)**

At runtime, use blocks for:
- **Bulk invalidation** - Mark all block functions stale at once
- **Block-level caching** - Cache entire block result
- **Skip execution** - Cache hit = skip all functions in block

**This makes execution faster** - fewer graph traversals, fewer function calls.

### The Extended Architecture

```
┌─────────────────────────────────────┐
│  STRUCTURE                          │
│  - Graph: Dependencies              │
│  - Blocks: Groups + Boundaries      │  ← ADDED
└─────────────────────────────────────┘
              ↓ uses
┌─────────────────────────────────────┐
│  STATE                              │
│  - Values: Current state            │
│  - Stale: What needs recomputing    │
│  - Cache: Memoized results          │  ← ADDED
└─────────────────────────────────────┘
              ↓ transformed by
┌─────────────────────────────────────┐
│  EXECUTION                          │
│  - Resolver: Recompute stale        │  ← MODIFIED
│    (with block cache checks)        │
└─────────────────────────────────────┘
```

**Blocks extend all three layers**:
- Structure: Add grouping metadata
- State: Add block-level cache
- Execution: Add cache checks and bulk operations

---

## Part 4: The Minimum Requirements

### What Blocks Need to Exist

**As metadata**:
1. Graph (to validate against)
2. Block spec (inputs, outputs, functions)
3. Validation logic (check spec matches graph)

**That's it.** Blocks can exist purely as validated metadata.

### What Blocks Need to Optimize

**For caching**:
1. Cache (store block results by input hash)
2. Resolver hooks (check cache before execution, store after)

**For bulk invalidation**:
1. Mapping (variable → blocks that use it)
2. Mark logic (when variable changes, mark all block functions stale)

### The Minimal Block System

```javascript
class BlockRegistry {
    blocks;        // Map: blockName → Block
    graph;         // Reference to dependency graph

    // Core operation
    validate(block) {
        // Check all function dependencies are in inputs or internal
        for (let fn of block.functions) {
            for (let dep of this.graph.getPredecessors(fn)) {
                if (!block.inputs.has(dep) && !block.functions.has(dep)) {
                    throw new Error(`Hidden dependency: ${fn} → ${dep}`);
                }
            }
        }
    }
}

class BlockCache {
    cache;         // Map: blockName → Map(inputHash → outputs)

    // Core operations
    has(blockName, inputs);
    get(blockName, inputs);
    set(blockName, inputs, outputs);
}

// Resolver modification
class Resolver {
    // ... existing code ...
    blockCache;    // Optional BlockCache

    resolveStale() {
        // BEFORE execution: Try block caches
        if (this.blockCache) {
            for (let block of blocks) {
                if (this.hasStale(block)) {
                    const inputs = this.getInputs(block);
                    if (this.blockCache.has(block.name, inputs)) {
                        // Cache HIT
                        const outputs = this.blockCache.get(block.name, inputs);
                        this.setOutputs(block, outputs);
                        this.removeFromStale(block.functions);
                        continue;
                    }
                }
            }
        }

        // Normal execution (existing code)
        const sorted = this.graph.topologicalSort(this.state.stale);
        for (let name of sorted) { ... }

        // AFTER execution: Cache block outputs
        if (this.blockCache) {
            for (let block of blocks) {
                if (this.wasExecuted(block)) {
                    const inputs = this.getInputs(block);
                    const outputs = this.getOutputs(block);
                    this.blockCache.set(block.name, inputs, outputs);
                }
            }
        }
    }
}
```

**That's all you need** - ~200 LOC total for blocks.

---

## Part 5: The Cleanest Separation

### What Are the Fundamental Concerns?

1. **Building Structure** - Static Analysis → Graph
2. **Organizing Structure** - Blocks (grouping + validation)
3. **Managing State** - Values, Stale, Cache
4. **Executing** - Resolver (transforms state using structure)
5. **API** - Auto (wires everything together)

### The Five Modules (Cleanly Separated)

```
┌──────────────────────┐
│  1. GRAPH            │  Pure structure (nodes, edges, topology)
│     DirectedGraph    │  No state, no execution
└──────────────────────┘

┌──────────────────────┐
│  2. BLOCKS           │  Structure metadata + validation
│     BlockRegistry    │  Uses Graph, no state
└──────────────────────┘

┌──────────────────────┐
│  3. STATE            │  Runtime state management
│     Values           │  Current values
│     Stale            │  What needs recomputing
│     Cache            │  Memoized results (function + block)
└──────────────────────┘

┌──────────────────────┐
│  4. RESOLVER         │  Execution engine
│     resolveStale()   │  Uses Graph, Blocks (optional), State
│     execute()        │  Pure action - transforms state
└──────────────────────┘

┌──────────────────────┐
│  5. AUTO             │  Integration API
│     auto()           │  Wires everything together
│     Proxy            │  User-facing interface
└──────────────────────┘
```

**Plus utilities**:
- **Static Analysis** - Builds Graph from function source
- **Block Validation** - Checks block boundaries at startup

### Dependencies Between Modules

```
Static Analysis → Graph
      ↓
   Blocks (validates against Graph)
      ↓
   State (stores values, uses Graph + Blocks)
      ↓
   Resolver (executes, uses Graph + Blocks + State)
      ↓
   Auto (wires everything, provides API)
```

**Each layer only depends on layers above it.**

---

## Part 6: What Is a Block, Really?

Let me distill this to the essence.

### A Block Is Three Things

**1. A Grouping**
```javascript
{
    functions: ['lines_00', 'lines_01', 'lines_02', ...]
}
```

Just: "These functions go together"

**2. A Boundary**
```javascript
{
    inputs: ['datasets_to_load', 'data', ...],
    outputs: ['charts', 'mainpoints'],
    functions: ['lines_00', 'lines_01', ...]
}
```

Adds: "This is the interface - what goes in, what comes out"

**3. A Cache Unit**
```javascript
{
    cacheKey: hash(inputs),
    cacheValue: outputs
}
```

Adds: "Can cache this as one unit"

### That's It

Blocks are **groups with validated boundaries that can be cached**.

Everything else (bulk invalidation, stats, etc.) derives from this.

---

## Part 7: What Is the Resolver, Really?

### Without Blocks

```javascript
resolveStale() {
    // 1. What needs computing?
    const stale = this.state.stale;

    // 2. What order?
    const sorted = this.graph.topologicalSort(stale);

    // 3. Compute
    for (let name of sorted) {
        this.state.set(name, this.execute(name));
    }

    // 4. Done
    this.state.stale.clear();
}
```

**Pure transformation**: stale → resolved

### With Blocks

```javascript
resolveStale() {
    // 0. Check caches (optimization)
    this.tryBlockCaches();  // May remove from stale

    // 1-3. Same as before
    const stale = this.state.stale;
    const sorted = this.graph.topologicalSort(stale);
    for (let name of sorted) {
        this.state.set(name, this.execute(name));
    }

    // 4. Store caches (optimization)
    this.cacheBlockResults();

    // 5. Done
    this.state.stale.clear();
}
```

**Same transformation, with optimization layer around it**.

The core hasn't changed - we just added:
- Pre-step: Try to avoid work (cache check)
- Post-step: Save work for later (cache store)

### The Resolver Is

**A state transformer** that uses structure (Graph + Blocks) to know how to transform.

```
Input:  State (with stale set)
Uses:   Structure (Graph + Blocks)
Output: State (with resolved values)
```

It's a **pure function** (conceptually):
```javascript
resolve(state, structure) → newState
```

---

## Part 8: The Deep Structure

### Three Layers, Two Purposes

**Static Layer (Structure)**:
- Graph - Dependencies
- Blocks - Groups + Boundaries

**Purpose**: Know HOW things relate

**Dynamic Layer (State)**:
- Values - Current state
- Stale - What needs recomputing
- Cache - Saved results

**Purpose**: Know WHAT to compute

**Action Layer (Execution)**:
- Resolver - Transform state

**Purpose**: DO the computation

### The Flow

```
1. User changes value
     ↓
2. State updated (value set, dependents marked stale)
     ↓
3. User reads value
     ↓
4. Resolver triggered (if stale)
     ↓
5. Resolver uses Structure to transform State
     ↓
6. State updated (values computed, stale cleared)
     ↓
7. User gets value
```

**Structure is consulted, State is transformed.**

### The Invariant

**At all times**: Graph describes the dependencies, State holds current values.

**After resolve**: No functions in State.stale (all resolved).

**This invariant is maintained** by the resolver.

---

## Part 9: Blocks as Invalidation Mechanism

You asked: "Is it just a mechanism for invalidation? In what sense?"

### Invalidation Without Blocks

```javascript
setValue(name, value) {
    this.state.set(name, value);

    // Mark dependents stale (DFS)
    this._markDependentsStale(name);
}

_markDependentsStale(name) {
    for (let dep of this.graph.getSuccessors(name)) {
        if (!this.state.stale.has(dep)) {
            this.state.stale.add(dep);
            this._markDependentsStale(dep);  // Recursive
        }
    }
}
```

**Cost**: O(D) where D = number of dependents (recursive graph traversal)

### Invalidation With Blocks

```javascript
setValue(name, value) {
    this.state.set(name, value);

    // Check: Is this a block input?
    const affectedBlocks = this.blocks.getBlocksWithInput(name);

    // Bulk invalidate blocks
    for (let block of affectedBlocks) {
        for (let fn of block.functions) {
            this.state.stale.add(fn);  // Bulk add
        }
        this.blockCache.invalidate(block.name);
    }

    // Continue with normal DFS for non-block dependents
    this._markDependentsStale(name);
}
```

**Cost**: O(B × F) + O(D) where B = affected blocks, F = functions per block, D = remaining dependents

**When B × F < D**: Faster (bulk operation beats recursive traversal)

### Blocks as Invalidation Optimization

Yes, blocks ARE an invalidation mechanism, in the sense:

**They let you invalidate groups in one operation instead of traversing the graph**.

For Lines block with 25 functions:
- Without blocks: 25 graph traversals (recursive DFS)
- With blocks: 1 bulk operation (mark all 25 at once)

**This is faster AND simpler.**

---

## Part 10: The Minimum for Blocks

You asked: "What are the minimum requirements for it to do its job?"

### For Validation (Compile-Time Check)

**Minimum**:
1. Graph (dependency structure)
2. Block spec (inputs, outputs, functions)
3. Validation logic:
   ```javascript
   for each function in block:
       for each dependency:
           if dependency not in inputs and not in block:
               ERROR
   ```

**That's it.** ~50 LOC.

### For Optimization (Runtime Benefit)

**Minimum**:
1. Cache (Map: blockName → Map: inputHash → outputs)
2. Resolver integration:
   ```javascript
   // Before execution
   if (blockCache.has(block, inputs)) {
       setOutputs(block, cached);
       removeFromStale(block.functions);
   }

   // After execution
   blockCache.set(block, inputs, outputs);
   ```

**That's it.** ~100 LOC.

### Total Minimum

**~150 LOC** for complete block system (validation + caching).

Compare to ~600 LOC for entire resolver. Blocks are a **small addition with big impact**.

---

## Part 11: The Cleanest Mental Model

### Think of it as Layers

**Layer 0: Raw Functions**
```javascript
const fn1 = (x) => x + 1;
const fn2 = (y) => y * 2;
```

Just functions. No reactivity.

**Layer 1: Reactive Functions (Core)**
```javascript
const $ = auto({
    a: 1,
    b: $ => $.a + 1,
    c: $ => $.b * 2
});
```

Adds: Graph, State, Resolver. Now reactive.

**Layer 2: Grouped Functions (Blocks)**
```javascript
const $ = auto({
    a: 1,
    b: $ => $.a + 1,
    c: $ => $.b * 2
}, {
    blocks: {
        transform: {
            inputs: ['a'],
            outputs: ['c'],
            functions: ['b', 'c']
        }
    }
});
```

Adds: Grouping, Validation, Caching. Now optimized.

**Each layer builds on the previous.**

### The Fundamental Abstraction

**What is auto.js, really?**

**It's a system that turns function dependencies into reactive state**.

- You write: Functions with dependencies (implicit in code)
- Analysis extracts: Graph (explicit dependencies)
- System maintains: State (values + stale)
- Resolver ensures: Dependencies always resolved before dependents
- Blocks optimize: Grouped validation and caching

**That's the deep structure.**

---

## Part 12: Summary

### The Deep Structures

**Three Layers**:
1. **Structure** (static) - Graph + Blocks
2. **State** (dynamic) - Values + Stale + Cache
3. **Execution** (action) - Resolver

**Five Modules**:
1. **Graph** - Dependency structure (pure)
2. **Blocks** - Groups + Validation (metadata)
3. **State** - Runtime state (mutable)
4. **Resolver** - Execution engine (transformer)
5. **Auto** - API (integration)

### What Blocks Are

**Essence**: Groups of functions with validated boundaries

**Purpose**:
- Validation: Catch errors at startup
- Optimization: Cache groups, bulk invalidation

**Mechanism**:
- Metadata layer on Graph
- Cache layer in State
- Hooks in Resolver

### Minimum Requirements

**For existence**: Graph + Spec + Validation (~50 LOC)
**For optimization**: Cache + Resolver hooks (~100 LOC)
**Total**: ~150 LOC on top of ~600 LOC core

### The Cleanest Separation

```
Structure (static)
  - Graph: DirectedGraph
  - Blocks: BlockRegistry (validates against Graph)

State (dynamic)
  - Values: Current state
  - Stale: What needs recomputing
  - Cache: Function-level + Block-level

Execution (action)
  - Resolver: Transforms State using Structure
```

**This is the deep structure.**

Everything else is implementation details, API sugar, or utilities.

The fundamental architecture is:
**Structure + State + Execution**, with Blocks as an optimization layer.

Clean, minimal, powerful.

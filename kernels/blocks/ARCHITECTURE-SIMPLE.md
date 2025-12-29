# Blocks Kernel: Simple, Modular Architecture

**Note**: This document describes the conceptual architecture design. The actual implementation is in `src/` and documented in [IMPLEMENTATION.md](./IMPLEMENTATION.md).

This document describes a simplified, modular architecture where each component has one clear responsibility and can be tested independently.

## Core Philosophy

**Separation of Concerns**: Each module does ONE thing:
1. **Graph** - Pure data structure (nodes, edges, topology)
2. **Static Analysis** - Convert functions to dependencies
3. **Blocks** - Group related functions
4. **Cross-Block Graph** - Combine block graphs
5. **Resolver** - Execute functions to compute values

**No complex kernel** - Just a simple resolver that executes functions in topological order.

---

## Module 1: Graph (Pure Data Structure)

**Purpose**: Represent dependency relationships. No execution, no values, just structure.

**File**: `src/directed-graph.js`

```javascript
class Graph {
    constructor() {
        this.nodes = new Map();     // id -> { id, metadata }
        this.edges = new Map();     // id -> Set<id> (predecessors)
        this.dependents = new Map(); // id -> Set<id> (successors)
    }

    // Structure
    addNode(id, metadata = {}) { ... }
    addEdge(from, to) { ... }  // from depends on to
    removeNode(id) { ... }
    removeEdge(from, to) { ... }

    // Queries
    getNode(id) { ... }
    getDependencies(id) { ... }      // What does this depend on?
    getDependents(id) { ... }        // What depends on this?
    hasPath(from, to) { ... }        // Is there a path?

    // Analysis
    topologicalSort() { ... }        // Execution order
    hasCycle() { ... }               // Validation
    getCycles() { ... }              // Find cycles

    // Visualization
    toDot() { ... }                  // GraphViz format

    // Utilities
    clone() { ... }
    size() { ... }
}
```

**What it does**: Store and query dependency structure

**What it does NOT do**: Store values, execute functions, track state

**Test**: Can create graphs, add/remove edges, detect cycles, compute topological order

---

## Module 2: Static Analysis (Function → Dependencies)

**Purpose**: Analyze function source code to discover dependencies.

**File**: `src/static-analysis.js`

```javascript
/**
 * Analyze a function to discover what it depends on
 *
 * @param {Function} fn - Function like ($) => $.x + $.y
 * @param {string} name - Name of the variable (to exclude self-references)
 * @returns {Set<string>} - Set of dependency names
 */
function analyzeFunction(fn, name) {
    const source = fn.toString();
    const deps = new Set();

    // Pattern 1: $.propertyName
    const regex1 = /\$\.(\w+)/g;
    let match;
    while ((match = regex1.exec(source)) !== null) {
        const prop = match[1];
        if (prop !== name) {
            deps.add(prop);
        }
    }

    // Pattern 2: $["propertyName"] or $['propertyName']
    const regex2 = /\$\[["'](\w+)["']\]/g;
    while ((match = regex2.exec(source)) !== null) {
        const prop = match[1];
        if (prop !== name) {
            deps.add(prop);
        }
    }

    // Pattern 3: Destructuring { x, y } = $
    const regex3 = /{\s*([^}]+)\s*}\s*=\s*\$/g;
    while ((match = regex3.exec(source)) !== null) {
        const props = match[1].split(',').map(p => {
            // Handle: { foo }, { foo: bar }, { foo = default }
            return p.trim().split(/[:\s=]/)[0];
        });
        props.forEach(prop => {
            if (prop && prop !== name) {
                deps.add(prop);
            }
        });
    }

    return deps;
}

/**
 * Build a graph from a set of functions
 *
 * @param {Object} functions - { name: function or value }
 * @returns {Graph} - Dependency graph
 */
function buildGraph(functions) {
    const graph = new Graph();

    // First pass: add all nodes
    for (let [name, value] of Object.entries(functions)) {
        graph.addNode(name, {
            type: typeof value === 'function' ? 'computed' : 'static',
            fn: typeof value === 'function' ? value : null
        });
    }

    // Second pass: analyze functions and add edges
    for (let [name, value] of Object.entries(functions)) {
        if (typeof value === 'function') {
            const deps = analyzeFunction(value, name);

            for (let dep of deps) {
                // Edge: name depends on dep
                // So: dep → name (dep must execute before name)
                if (graph.nodes.has(dep)) {
                    graph.addEdge(name, dep);
                } else {
                    throw new Error(
                        `Function '${name}' depends on '${dep}' which doesn't exist`
                    );
                }
            }
        }
    }

    // Validate: no cycles
    if (graph.hasCycle()) {
        const cycles = graph.getCycles();
        throw new Error(
            `Circular dependencies detected: ${JSON.stringify(cycles)}`
        );
    }

    return graph;
}

export { analyzeFunction, buildGraph };
```

**What it does**: Convert functions to dependency graph

**What it does NOT do**: Execute functions, store values, manage state

**Test**:
- Analyzes simple functions: `($) => $.x + $.y` → `['x', 'y']`
- Handles conditionals: `($) => $.enabled ? $.data : null` → `['enabled', 'data']`
- Handles destructuring: `($) => { let {x,y} = $; return x+y; }` → `['x', 'y']`
- Detects cycles: Throws error
- Validates dependencies exist: Throws error if undefined

---

## Module 3: Blocks (Grouping Functions)

**Purpose**: Group related functions with explicit inputs/outputs.

**File**: `src/blocks.js`

```javascript
/**
 * A block is a named group of functions with:
 * - inputs: variables that come from outside
 * - outputs: variables exposed to outside
 * - functions: the computations
 */
class Block {
    constructor(config) {
        this.name = config.name;
        this.inputs = config.inputs || [];   // External dependencies
        this.outputs = config.outputs || []; // Exported values
        this.functions = config.functions || {};

        // Build internal graph
        this.graph = buildGraph(this.functions);

        // Validate inputs/outputs exist
        for (let input of this.inputs) {
            if (!this.graph.nodes.has(input)) {
                throw new Error(
                    `Block '${this.name}' declares input '${input}' which doesn't exist`
                );
            }
        }
        for (let output of this.outputs) {
            if (!this.graph.nodes.has(output)) {
                throw new Error(
                    `Block '${this.name}' declares output '${output}' which doesn't exist`
                );
            }
        }
    }

    /**
     * Get all nodes in this block
     */
    getNodes() {
        return Array.from(this.graph.nodes.keys());
    }

    /**
     * Get internal dependencies (within block)
     */
    getInternalDependencies(varName) {
        return Array.from(this.graph.getDependencies(varName) || []);
    }

    /**
     * Check if a variable is internal or external
     */
    isInput(varName) {
        return this.inputs.includes(varName);
    }

    isOutput(varName) {
        return this.outputs.includes(varName);
    }

    isInternal(varName) {
        return !this.isInput(varName) && !this.isOutput(varName);
    }
}

export { Block };
```

**What it does**: Group functions, declare inputs/outputs, build internal graph

**What it does NOT do**: Wire blocks together, resolve values, execute

**Test**:
- Create block with inputs/outputs
- Build internal graph
- Validate inputs/outputs exist
- Query internal dependencies

---

## Module 4: Cross-Block Graph (Combining Blocks)

**Purpose**: Build a unified graph from multiple blocks with wiring.

**File**: `src/cross-block-graph.js`

```javascript
/**
 * A wire connects an output from one block to an input of another
 */
class Wire {
    constructor(fromBlock, fromVar, toBlock, toVar) {
        this.fromBlock = fromBlock;  // Block name
        this.fromVar = fromVar;      // Variable name
        this.toBlock = toBlock;      // Block name
        this.toVar = toVar;          // Variable name
    }

    toString() {
        return `${this.fromBlock}.${this.fromVar} → ${this.toBlock}.${this.toVar}`;
    }
}

/**
 * Build a cross-block graph
 *
 * @param {Block[]} blocks - Array of blocks
 * @param {Wire[]} wires - Connections between blocks
 * @returns {Graph} - Unified graph with namespaced nodes
 */
function buildCrossBlockGraph(blocks, wires) {
    const graph = new Graph();
    const blockMap = new Map(blocks.map(b => [b.name, b]));

    // 1. Add all nodes (namespaced by block)
    for (let block of blocks) {
        for (let varName of block.getNodes()) {
            const nodeId = `${block.name}.${varName}`;
            const node = block.graph.getNode(varName);

            graph.addNode(nodeId, {
                ...node,
                block: block.name,
                variable: varName,
                isInput: block.isInput(varName),
                isOutput: block.isOutput(varName)
            });
        }
    }

    // 2. Add internal edges (within blocks)
    for (let block of blocks) {
        for (let [from, deps] of block.graph.edges.entries()) {
            for (let to of deps) {
                graph.addEdge(
                    `${block.name}.${from}`,
                    `${block.name}.${to}`
                );
            }
        }
    }

    // 3. Add cross-block edges (wires)
    for (let wire of wires) {
        // Validate wire
        const fromBlock = blockMap.get(wire.fromBlock);
        const toBlock = blockMap.get(wire.toBlock);

        if (!fromBlock) {
            throw new Error(`Wire source block '${wire.fromBlock}' doesn't exist`);
        }
        if (!toBlock) {
            throw new Error(`Wire target block '${wire.toBlock}' doesn't exist`);
        }
        if (!fromBlock.isOutput(wire.fromVar)) {
            throw new Error(
                `Wire source '${wire.fromBlock}.${wire.fromVar}' is not declared as output`
            );
        }
        if (!toBlock.isInput(wire.toVar)) {
            throw new Error(
                `Wire target '${wire.toBlock}.${wire.toVar}' is not declared as input`
            );
        }

        // Add edge: toBlock.toVar depends on fromBlock.fromVar
        graph.addEdge(
            `${wire.toBlock}.${wire.toVar}`,
            `${wire.fromBlock}.${wire.fromVar}`
        );
    }

    // 4. Validate: no cycles in combined graph
    if (graph.hasCycle()) {
        const cycles = graph.getCycles();
        throw new Error(
            `Circular dependencies across blocks: ${JSON.stringify(cycles)}`
        );
    }

    return graph;
}

/**
 * Helper: Auto-wire blocks by matching output names to input names
 */
function autoWire(blocks) {
    const wires = [];
    const outputs = new Map(); // varName -> [blocks that output it]

    // Build output index
    for (let block of blocks) {
        for (let output of block.outputs) {
            if (!outputs.has(output)) {
                outputs.set(output, []);
            }
            outputs.get(output).push(block);
        }
    }

    // Wire inputs to matching outputs
    for (let block of blocks) {
        for (let input of block.inputs) {
            const providers = outputs.get(input) || [];
            for (let provider of providers) {
                if (provider !== block) {
                    wires.push(new Wire(
                        provider.name,
                        input,
                        block.name,
                        input
                    ));
                }
            }
        }
    }

    return wires;
}

export { Wire, buildCrossBlockGraph, autoWire };
```

**What it does**: Combine block graphs into unified graph with wiring

**What it does NOT do**: Execute, resolve values

**Test**:
- Create multiple blocks
- Wire them together (manual or auto)
- Build cross-block graph
- Validate wires are correct
- Detect cross-block cycles

---

## Module 5: Resolver (Execution)

**Purpose**: Execute functions in topological order to resolve values.

**File**: `src/resolver.js`

**Key insight**: We don't need a complex kernel. We just need:
1. Track which values are "unresolved" (better term than "dirty")
2. Execute functions in order to resolve them

**Terminology**:
- "dirty" → **"stale"** (value is outdated)
- "clean" → **"fresh"** (value is up-to-date)

```javascript
/**
 * Resolver: Executes functions to compute values
 */
class Resolver {
    constructor(graph, functions) {
        this.graph = graph;           // Dependency graph
        this.functions = functions;   // name -> function
        this.values = new Map();      // name -> current value
        this.stale = new Set();       // Set of stale variable names
    }

    /**
     * Set a value (marks dependents as stale)
     */
    set(name, value) {
        this.values.set(name, value);
        this.markDependentsStale(name);
    }

    /**
     * Get a value (resolves if stale)
     */
    get(name) {
        if (this.stale.has(name)) {
            this.resolve(name);
        }
        return this.values.get(name);
    }

    /**
     * Mark a variable and all its dependents as stale
     */
    markDependentsStale(name) {
        const toMark = [name];
        const marked = new Set();

        while (toMark.length > 0) {
            const current = toMark.pop();
            if (marked.has(current)) continue;

            marked.add(current);
            this.stale.add(current);

            // Add all dependents
            const deps = this.graph.getDependents(current);
            for (let dep of deps) {
                toMark.push(dep);
            }
        }
    }

    /**
     * Resolve a single variable
     */
    resolve(name) {
        // Already fresh?
        if (!this.stale.has(name)) {
            return this.values.get(name);
        }

        // Get function
        const fn = this.functions.get(name);
        if (!fn) {
            // Static value, just mark as fresh
            this.stale.delete(name);
            return this.values.get(name);
        }

        // First, resolve all dependencies
        const deps = this.graph.getDependencies(name);
        for (let dep of deps) {
            if (this.stale.has(dep)) {
                this.resolve(dep);
            }
        }

        // Now compute this value
        const proxy = this.createProxy();
        const result = fn(proxy);
        this.values.set(name, result);
        this.stale.delete(name);

        return result;
    }

    /**
     * Resolve all stale values
     */
    resolveAll() {
        // Get topological order
        const order = this.graph.topologicalSort();

        // Resolve in order
        for (let name of order) {
            if (this.stale.has(name)) {
                this.resolve(name);
            }
        }
    }

    /**
     * Create proxy for function execution
     */
    createProxy() {
        const self = this;
        return new Proxy({}, {
            get(target, prop) {
                return self.get(prop);
            },
            set(target, prop, value) {
                throw new Error(
                    `Functions cannot set values. Use resolver.set() instead.`
                );
            }
        });
    }

    /**
     * Get all stale variables
     */
    getStale() {
        return Array.from(this.stale);
    }

    /**
     * Check if a variable is stale
     */
    isStale(name) {
        return this.stale.has(name);
    }
}

export { Resolver };
```

**What it does**: Execute functions to compute values, track stale state

**What it does NOT do**: Build graphs, analyze dependencies, manage blocks

**Test**:
- Set values and verify dependents marked stale
- Resolve individual variables
- Resolve all stale values
- Topological execution order respected
- Functions cannot set values (throws error)

---

## Module 6: Integration (Putting It Together)

**File**: `src/auto.js`

```javascript
import DirectedGraph from './directed-graph.js';
import { buildGraph } from './static-analysis.js';
import { Block, Wire, buildCrossBlockGraph, autoWire } from './blocks.js';
import { Resolver } from './resolver.js';

/**
 * Create a simple reactive system (single block)
 */
function auto(definition) {
    // Build graph
    const graph = buildGraph(definition);

    // Extract functions
    const functions = new Map();
    for (let [name, value] of Object.entries(definition)) {
        if (typeof value === 'function') {
            functions.set(name, value);
        }
    }

    // Create resolver
    const resolver = new Resolver(graph, functions);

    // Initialize static values
    for (let [name, value] of Object.entries(definition)) {
        if (typeof value !== 'function') {
            resolver.set(name, value);
        }
    }

    // Resolve all computed values
    resolver.resolveAll();

    // Return proxy
    return new Proxy(resolver, {
        get(target, prop) {
            if (prop === '_') {
                return {
                    graph,
                    values: Object.fromEntries(target.values),
                    stale: target.getStale(),
                    functions: Array.from(functions.keys())
                };
            }
            return target.get(prop);
        },
        set(target, prop, value) {
            target.set(prop, value);
            target.resolveAll();
            return true;
        }
    });
}

/**
 * Create a multi-block reactive system
 */
function blocks(blockConfigs, wiring = 'auto') {
    // Create blocks
    const blockList = blockConfigs.map(config => new Block(config));

    // Wire blocks
    const wires = wiring === 'auto'
        ? autoWire(blockList)
        : wiring;

    // Build cross-block graph
    const graph = buildCrossBlockGraph(blockList, wires);

    // Collect all functions (with namespaced names)
    const functions = new Map();
    for (let block of blockList) {
        for (let [name, value] of Object.entries(block.functions)) {
            if (typeof value === 'function') {
                functions.set(`${block.name}.${name}`, value);
            }
        }
    }

    // Create resolver
    const resolver = new Resolver(graph, functions);

    // Initialize values
    for (let block of blockList) {
        for (let [name, value] of Object.entries(block.functions)) {
            if (typeof value !== 'function') {
                resolver.set(`${block.name}.${name}`, value);
            }
        }
    }

    // Resolve all
    resolver.resolveAll();

    // Return API
    return {
        blocks: blockList,
        graph,
        resolver,

        get(blockName, varName) {
            return resolver.get(`${blockName}.${varName}`);
        },

        set(blockName, varName, value) {
            resolver.set(`${blockName}.${varName}`, value);
            resolver.resolveAll();
        },

        getStale() {
            return resolver.getStale();
        },

        visualize() {
            return graph.toDot();
        }
    };
}

export { auto, blocks };
```

**What it does**: Provide convenient API, wire everything together

**What it does NOT do**: Contain complex logic (delegates to modules)

---

## Example Usage

### Single Block (Simple Auto)

```javascript
import { auto } from './src/auto.js';

let $ = auto({
    data: [1, 2, 3],
    count: ($) => $.data.length,
    double: ($) => $.count * 2,
    message: ($) => `Count: ${$.count}, Double: ${$.double}`
});

console.log($.message);  // "Count: 3, Double: 6"

$.data = [1, 2, 3, 4, 5];
console.log($.message);  // "Count: 5, Double: 10"
console.log($._);        // { graph, values, stale, functions }
```

### Multiple Blocks

```javascript
import { blocks } from './src/auto.js';

let system = blocks([
    {
        name: 'fetcher',
        outputs: ['data'],
        functions: {
            url: 'http://api.com',
            data: ($) => fetch($.url).then(r => r.json())
        }
    },
    {
        name: 'processor',
        inputs: ['data'],
        outputs: ['result'],
        functions: {
            result: ($) => $.data.map(x => x * 2)
        }
    },
    {
        name: 'display',
        inputs: ['result'],
        outputs: ['message'],
        functions: {
            message: ($) => `Processed: ${$.result.join(', ')}`
        }
    }
], 'auto'); // auto-wire by matching names

console.log(system.get('display', 'message'));
console.log(system.visualize()); // GraphViz DOT
```

---

## Testing Strategy

Each module is independently testable:

### Test: graph.js
```javascript
// Can create graphs
// Can add/remove nodes and edges
// Topological sort works
// Cycle detection works
```

### Test: static-analysis.js
```javascript
// Analyzes simple functions
// Handles dot notation: $.x
// Handles bracket notation: $['x']
// Handles destructuring: { x, y } = $
// Detects missing dependencies
// Detects cycles
```

### Test: block.js
```javascript
// Creates blocks with inputs/outputs
// Builds internal graph
// Validates inputs/outputs exist
```

### Test: cross-block-graph.js
```javascript
// Combines multiple blocks
// Wires blocks together
// Auto-wiring works
// Validates wires
// Detects cross-block cycles
```

### Test: resolver.js
```javascript
// Sets values and marks dependents stale
// Resolves stale values
// Executes in topological order
// Handles dependencies correctly
// Prevents functions from setting values
```

### Test: auto.js (integration)
```javascript
// Single block reactive system works
// Multi-block system works
// Auto-wiring works
// Resolves values correctly
// Graph visualization works
```

---

## Summary: Clean Architecture

```
Layer 1: Graph (structure)
  ↓
Layer 2: Static Analysis (function → graph)
  ↓
Layer 3: Blocks (grouping)
  ↓
Layer 4: Cross-Block Graph (combining)
  ↓
Layer 5: Resolver (execution)
  ↓
Layer 6: Integration (API)
```

Each layer:
- **One responsibility**
- **Independently testable**
- **No leaky abstractions**
- **Clear interfaces**

No complex kernel, no signals, no policies - just:
- Graphs (structure)
- Analysis (discovery)
- Resolver (execution)

Simple, clear, testable.


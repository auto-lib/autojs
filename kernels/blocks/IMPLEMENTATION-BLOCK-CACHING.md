# Implementation Sketch: Block-Level Caching

**Date**: 2026-01-04
**Context**: How to implement validated blocks with caching on top of flat function graph

---

## Overview

We're adding **three new capabilities** to the existing blocks kernel:

1. **Block Validation** - Verify inputs/outputs at startup
2. **Block Cache** - Cache entire block results by input hash
3. **Bulk Invalidation** - Mark all block functions stale at once

**Key constraint**: Don't break existing flat graph execution. Blocks are an **optimization layer** on top.

---

## Part 1: Data Structures

### BlockCache Class

New file: `/kernels/blocks/src/block-cache.js`

```javascript
/**
 * Cache for block-level results.
 * Maps: blockName → inputHash → outputs
 */
export class BlockCache {
    constructor() {
        this.caches = new Map(); // blockName → Map(inputHash → outputs)
        this.stats = new Map();  // blockName → { hits, misses, size }
    }

    /**
     * Check if cached result exists for block inputs
     */
    has(blockName, inputs) {
        const hash = this._hashInputs(inputs);
        return this.caches.get(blockName)?.has(hash) ?? false;
    }

    /**
     * Get cached outputs for block inputs
     */
    get(blockName, inputs) {
        const hash = this._hashInputs(inputs);
        const cache = this.caches.get(blockName);

        if (cache?.has(hash)) {
            this._recordHit(blockName);
            return cache.get(hash);
        }

        this._recordMiss(blockName);
        return null;
    }

    /**
     * Store block outputs for inputs
     */
    set(blockName, inputs, outputs) {
        const hash = this._hashInputs(inputs);

        if (!this.caches.has(blockName)) {
            this.caches.set(blockName, new Map());
        }

        this.caches.get(blockName).set(hash, { ...outputs });
    }

    /**
     * Invalidate all cached results for a block
     */
    invalidate(blockName) {
        this.caches.delete(blockName);
    }

    /**
     * Clear all caches
     */
    clear() {
        this.caches.clear();
        this.stats.clear();
    }

    /**
     * Get cache statistics for a block
     */
    getStats(blockName) {
        return this.stats.get(blockName) || { hits: 0, misses: 0, size: 0 };
    }

    /**
     * Hash block inputs for cache key
     */
    _hashInputs(inputs) {
        // For simple values, use JSON
        // For complex objects/arrays, need stable hash
        return this._stableHash(inputs);
    }

    _stableHash(obj) {
        // TODO: Implement proper stable hashing
        // For now, use JSON (works for primitives and simple objects)
        try {
            return JSON.stringify(obj, Object.keys(obj).sort());
        } catch (e) {
            // Fallback for circular refs, etc.
            return String(obj);
        }
    }

    _recordHit(blockName) {
        if (!this.stats.has(blockName)) {
            this.stats.set(blockName, { hits: 0, misses: 0, size: 0 });
        }
        this.stats.get(blockName).hits++;
    }

    _recordMiss(blockName) {
        if (!this.stats.has(blockName)) {
            this.stats.set(blockName, { hits: 0, misses: 0, size: 0 });
        }
        this.stats.get(blockName).misses++;
    }
}
```

### Block Metadata Structure

Extend existing blocks structure in `/kernels/blocks/src/blocks.js`:

```javascript
export class BlockRegistry {
    constructor(graph) {
        this.graph = graph;
        this.blocks = new Map(); // blockName → BlockMetadata
    }

    /**
     * Register a block with validation
     */
    registerBlock(blockName, blockSpec) {
        const { inputs, outputs, functions } = blockSpec;

        // Validate the block
        this._validateBlock(blockName, inputs, outputs, functions);

        // Store metadata
        const metadata = {
            name: blockName,
            inputs: new Set(inputs),
            outputs: new Set(outputs),
            functions: new Set(functions),

            // Derived at registration
            inputNodes: this._findInputNodes(functions),
            outputNodes: this._findOutputNodes(functions),
            internalNodes: this._findInternalNodes(functions)
        };

        this.blocks.set(blockName, metadata);
        return metadata;
    }

    /**
     * Find which blocks are affected by a changed variable
     */
    getBlocksAffectedBy(varName) {
        const affected = [];

        for (let [blockName, block] of this.blocks) {
            if (block.inputs.has(varName)) {
                affected.push(blockName);
            }
        }

        return affected;
    }

    /**
     * Validate block boundary is clean
     */
    _validateBlock(blockName, inputs, outputs, functions) {
        const inputSet = new Set(inputs);
        const fnSet = new Set(functions);
        const internalOutputs = new Set();

        // Check each function's dependencies
        for (let fnName of functions) {
            const deps = this.graph.getPredecessors(fnName);

            for (let dep of deps) {
                const isInput = inputSet.has(dep);
                const isInternal = internalOutputs.has(dep) || fnSet.has(dep);

                if (!isInput && !isInternal) {
                    throw new Error(
                        `Block '${blockName}' validation failed:\n` +
                        `  Function '${fnName}' depends on '${dep}'\n` +
                        `  But '${dep}' is not in declared inputs: [${inputs.join(', ')}]\n` +
                        `  And not produced by another function in this block.\n` +
                        `  Add '${dep}' to inputs or fix dependency.`
                    );
                }
            }

            internalOutputs.add(fnName);
        }

        // Check outputs are used externally
        const actualOutputs = new Set();
        for (let fnName of functions) {
            const dependents = this.graph.getSuccessors(fnName);

            for (let dep of dependents) {
                if (!fnSet.has(dep)) {
                    actualOutputs.add(fnName);
                }
            }
        }

        // Warn about declared outputs that aren't actually used
        for (let output of outputs) {
            if (!actualOutputs.has(output)) {
                console.warn(
                    `Block '${blockName}': Declared output '${output}' ` +
                    `is not used outside block. Consider removing from outputs.`
                );
            }
        }

        // Warn about actual outputs not declared
        for (let output of actualOutputs) {
            if (!outputs.includes(output)) {
                console.warn(
                    `Block '${blockName}': Function '${output}' is used outside block ` +
                    `but not in declared outputs: [${outputs.join(', ')}]. ` +
                    `Consider adding to outputs.`
                );
            }
        }

        console.log(`✓ Block '${blockName}' validated successfully`);
    }

    _findInputNodes(functions) {
        // Functions in the block that depend on external inputs
        const nodes = new Set();

        for (let fn of functions) {
            const deps = this.graph.getPredecessors(fn);
            for (let dep of deps) {
                if (!functions.has(dep)) {
                    nodes.add(fn);
                    break;
                }
            }
        }

        return nodes;
    }

    _findOutputNodes(functions) {
        // Functions in the block that are used externally
        const nodes = new Set();

        for (let fn of functions) {
            const dependents = this.graph.getSuccessors(fn);
            for (let dep of dependents) {
                if (!functions.has(dep)) {
                    nodes.add(fn);
                    break;
                }
            }
        }

        return nodes;
    }

    _findInternalNodes(functions) {
        // Functions that are purely internal (not inputs or outputs)
        const inputs = this._findInputNodes(functions);
        const outputs = this._findOutputNodes(functions);
        const internal = new Set();

        for (let fn of functions) {
            if (!inputs.has(fn) && !outputs.has(fn)) {
                internal.add(fn);
            }
        }

        return internal;
    }
}
```

---

## Part 2: Integration with Resolver

Modify `/kernels/blocks/src/resolver.js`:

```javascript
export class Resolver {
    constructor(graph, functions, options = {}) {
        this.graph = graph;
        this.functions = functions;
        this.values = new Map();
        this.stale = new Set();

        // NEW: Block support
        this.blockRegistry = options.blockRegistry || null;
        this.blockCache = options.blockCache || null;
        this.enableBlockCaching = options.enableBlockCaching ?? true;

        // Existing code...
    }

    /**
     * Main resolution method - now with block cache support
     */
    resolveStale() {
        if (!this.stale.size) return;

        // PHASE 1: Try block caches (if enabled)
        if (this.enableBlockCaching && this.blockRegistry && this.blockCache) {
            this._tryBlockCaches();
        }

        // PHASE 2: Execute remaining stale functions (flat graph)
        const sorted = this._topologicalSort(Array.from(this.stale));

        for (let fnName of sorted) {
            if (this.stale.has(fnName)) {  // May have been removed by block cache
                this._execute(fnName);
            }
        }

        // PHASE 3: Cache block outputs
        if (this.enableBlockCaching && this.blockRegistry && this.blockCache) {
            this._cacheBlockOutputs();
        }
    }

    /**
     * Try to load results from block caches
     */
    _tryBlockCaches() {
        for (let [blockName, block] of this.blockRegistry.blocks) {
            // Check if any function in this block is stale
            const hasStale = Array.from(block.functions).some(fn => this.stale.has(fn));

            if (hasStale) {
                // Get block inputs
                const inputs = this._getBlockInputs(block);

                // Try cache
                const cached = this.blockCache.get(blockName, inputs);

                if (cached) {
                    // CACHE HIT!
                    console.log(`✓ Block cache HIT: ${blockName}`);

                    // Set all output values
                    for (let output of block.outputs) {
                        if (cached[output] !== undefined) {
                            this.values.set(output, cached[output]);
                        }
                    }

                    // Remove all block functions from stale set
                    for (let fn of block.functions) {
                        this.stale.delete(fn);
                    }
                } else {
                    console.log(`✗ Block cache MISS: ${blockName}`);
                }
            }
        }
    }

    /**
     * Cache block outputs after execution
     */
    _cacheBlockOutputs() {
        for (let [blockName, block] of this.blockRegistry.blocks) {
            // If any function in block was executed, cache the results
            const wasExecuted = Array.from(block.functions).some(fn =>
                this.values.has(fn)
            );

            if (wasExecuted) {
                const inputs = this._getBlockInputs(block);
                const outputs = this._getBlockOutputs(block);

                this.blockCache.set(blockName, inputs, outputs);
            }
        }
    }

    /**
     * Get current values for block inputs
     */
    _getBlockInputs(block) {
        const inputs = {};

        for (let inputName of block.inputs) {
            inputs[inputName] = this.values.get(inputName);
        }

        return inputs;
    }

    /**
     * Get current values for block outputs
     */
    _getBlockOutputs(block) {
        const outputs = {};

        for (let outputName of block.outputs) {
            outputs[outputName] = this.values.get(outputName);
        }

        return outputs;
    }

    /**
     * Mark variable and dependents as stale
     * NOW with bulk invalidation for blocks
     */
    markStale(varName) {
        // Check if this variable is a block input
        if (this.blockRegistry) {
            const affectedBlocks = this.blockRegistry.getBlocksAffectedBy(varName);

            for (let blockName of affectedBlocks) {
                const block = this.blockRegistry.blocks.get(blockName);

                // Invalidate block cache
                if (this.blockCache) {
                    this.blockCache.invalidate(blockName);
                }

                // BULK OPERATION: Mark all block functions stale at once
                for (let fn of block.functions) {
                    this.stale.add(fn);
                }

                console.log(`⚡ Bulk invalidated block '${blockName}' (${block.functions.size} functions)`);
            }
        }

        // Continue with normal DFS for non-block functions
        this._markStaleDFS(varName);
    }

    /**
     * DFS to mark dependents stale (existing code)
     */
    _markStaleDFS(varName) {
        const dependents = this.graph.getSuccessors(varName);

        for (let dep of dependents) {
            if (!this.stale.has(dep)) {
                this.stale.add(dep);
                this._markStaleDFS(dep);
            }
        }
    }
}
```

---

## Part 3: User API

### Option A: Inline Block Declaration

```javascript
import { auto } from '@autolib/auto';

const $ = auto({
    // Functions
    data_000_async: async $ => { ... },
    dataset: $ => { ... },
    lines_00: $ => { ... },
    lines_01: $ => { ... },
    // ... more functions
}, {
    // Options
    enableBlockCaching: true,

    // Block declarations
    blocks: {
        data: {
            inputs: ['fixed_data'],
            outputs: ['data', 'dataset'],
            functions: ['data_000_async', 'dataset']
        },
        lines: {
            inputs: ['datasets_to_load', 'data', 'choices_sorted', 'currency'],
            outputs: ['charts', 'mainpoints'],
            functions: ['lines_00', 'lines_01', 'lines_02', ...]
        }
    }
});
```

### Option B: Separate Block Files

```javascript
// state/data.js
export default {
    data_000_async: async $ => { ... },
    dataset: $ => { ... }
};

export const dataBlock = {
    inputs: ['fixed_data'],
    outputs: ['data', 'dataset'],
    functions: ['data_000_async', 'dataset']
};

// state/lines.js
export default {
    lines_00: $ => { ... },
    lines_01: $ => { ... },
    // ...
};

export const linesBlock = {
    inputs: ['datasets_to_load', 'data', 'choices_sorted', 'currency'],
    outputs: ['charts', 'mainpoints'],
    functions: ['lines_00', 'lines_01', ...]
};

// state/index.js
import dataFns, { dataBlock } from './data.js';
import linesFns, { linesBlock } from './lines.js';

const $ = auto({
    ...dataFns,
    ...linesFns
}, {
    enableBlockCaching: true,
    blocks: {
        data: dataBlock,
        lines: linesBlock
    }
});
```

### Option C: Helper Function

```javascript
import { auto, createBlock } from '@autolib/auto';

const dataBlock = createBlock('data', {
    inputs: ['fixed_data'],
    outputs: ['data', 'dataset'],
    functions: {
        data_000_async: async $ => { ... },
        dataset: $ => { ... }
    }
});

const linesBlock = createBlock('lines', {
    inputs: ['datasets_to_load', 'data', 'choices_sorted'],
    outputs: ['charts', 'mainpoints'],
    functions: {
        lines_00: $ => { ... },
        lines_01: $ => { ... }
    }
});

const $ = auto({
    ...dataBlock.functions,
    ...linesBlock.functions
}, {
    enableBlockCaching: true,
    blocks: {
        data: dataBlock.metadata,
        lines: linesBlock.metadata
    }
});
```

---

## Part 4: Implementation Steps

### Step 1: Add BlockCache class

**File**: `/kernels/blocks/src/block-cache.js`

**Test**:
```javascript
// tests/block-cache/001_basic_caching.js
export default {
    test: ({ BlockCache }) => {
        const cache = new BlockCache();

        const inputs = { a: 1, b: 2 };
        const outputs = { c: 3 };

        cache.set('testBlock', inputs, outputs);

        const cached = cache.get('testBlock', inputs);
        return cached.c === 3;
    }
};
```

### Step 2: Add BlockRegistry class

**File**: `/kernels/blocks/src/blocks.js` (extend existing)

**Test**:
```javascript
// tests/blocks/020_validation.js
export default {
    test: ({ BlockRegistry, DirectedGraph }) => {
        const graph = new DirectedGraph();
        graph.addNode('a');
        graph.addNode('b');
        graph.addEdge('a', 'b');

        const registry = new BlockRegistry(graph);

        // This should pass validation
        registry.registerBlock('test', {
            inputs: ['a'],
            outputs: ['b'],
            functions: ['a', 'b']
        });

        return true;
    }
};
```

### Step 3: Integrate with Resolver

**File**: `/kernels/blocks/src/resolver.js` (modify existing)

**Test**:
```javascript
// tests/integration/020_block_caching.js
export default {
    test: async ({ auto }) => {
        let execCount = 0;

        const $ = auto({
            a: 1,
            b: $ => {
                execCount++;
                return $.a + 1;
            },
            c: $ => $.b + 1
        }, {
            enableBlockCaching: true,
            blocks: {
                testBlock: {
                    inputs: ['a'],
                    outputs: ['c'],
                    functions: ['b', 'c']
                }
            }
        });

        // First access
        const v1 = $.c; // execCount = 1

        // Access again (cache hit)
        const v2 = $.c; // execCount = 1 (no execution!)

        return execCount === 1 && v1 === 3 && v2 === 3;
    }
};
```

### Step 4: Add Options API

**File**: `/kernels/blocks/src/auto.js` (modify existing)

```javascript
export function auto(spec, options = {}) {
    // Existing setup...

    // NEW: Block support
    let blockRegistry = null;
    let blockCache = null;

    if (options.blocks) {
        blockRegistry = new BlockRegistry(graph);

        for (let [blockName, blockSpec] of Object.entries(options.blocks)) {
            blockRegistry.registerBlock(blockName, blockSpec);
        }

        if (options.enableBlockCaching !== false) {
            blockCache = new BlockCache();
        }
    }

    const resolver = new Resolver(graph, functions, {
        blockRegistry,
        blockCache,
        enableBlockCaching: options.enableBlockCaching
    });

    // Rest of existing code...
}
```

### Step 5: Add Block Statistics API

**File**: `/kernels/blocks/src/auto.js` (extend proxy)

```javascript
// In proxy handler
get(target, prop) {
    if (prop === 'blocks') {
        // NEW: Block stats API
        return {
            list: () => Array.from(blockRegistry.blocks.keys()),

            get: (blockName) => {
                const block = blockRegistry.blocks.get(blockName);
                const cacheStats = blockCache.getStats(blockName);

                return {
                    name: blockName,
                    inputs: Array.from(block.inputs),
                    outputs: Array.from(block.outputs),
                    functions: Array.from(block.functions),
                    cache: cacheStats
                };
            },

            stats: () => {
                const stats = {};

                for (let blockName of blockRegistry.blocks.keys()) {
                    stats[blockName] = blockCache.getStats(blockName);
                }

                return stats;
            }
        };
    }

    // Existing code...
}
```

**Usage**:
```javascript
// List blocks
console.log($.blocks.list());
// → ['data', 'lines', 'search']

// Get block info
console.log($.blocks.get('lines'));
// → {
//     name: 'lines',
//     inputs: ['datasets_to_load', 'data', ...],
//     outputs: ['charts', 'mainpoints'],
//     functions: ['lines_00', 'lines_01', ...],
//     cache: { hits: 45, misses: 10, hitRate: 0.82 }
//   }

// Get all block stats
console.log($.blocks.stats());
// → {
//     data: { hits: 20, misses: 5, hitRate: 0.80 },
//     lines: { hits: 45, misses: 10, hitRate: 0.82 }
//   }
```

---

## Part 5: Hashing Strategy

The trickiest part is hashing block inputs. Different strategies for different data types:

```javascript
class BlockCache {
    _stableHash(inputs) {
        const parts = [];

        for (let key of Object.keys(inputs).sort()) {
            const value = inputs[key];
            parts.push(key + ':' + this._hashValue(value));
        }

        return parts.join('|');
    }

    _hashValue(value) {
        // Primitives
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return 's:' + value;
        if (typeof value === 'number') return 'n:' + value;
        if (typeof value === 'boolean') return 'b:' + value;

        // Arrays (for small arrays, include contents)
        if (Array.isArray(value)) {
            if (value.length <= 10) {
                // Small array: hash contents
                return 'a:' + value.map(v => this._hashValue(v)).join(',');
            } else {
                // Large array: hash length + first/last elements
                return `a:${value.length}:${this._hashValue(value[0])}:${this._hashValue(value[value.length-1])}`;
            }
        }

        // Objects (for small objects, include contents)
        if (typeof value === 'object') {
            const keys = Object.keys(value);

            if (keys.length <= 10) {
                // Small object: hash contents
                const parts = [];
                for (let k of keys.sort()) {
                    parts.push(k + ':' + this._hashValue(value[k]));
                }
                return 'o:{' + parts.join(',') + '}';
            } else {
                // Large object: hash key count
                return `o:${keys.length}`;
            }
        }

        // Fallback
        return String(value);
    }
}
```

**Alternative**: Use external library like `object-hash` or `fast-json-stable-stringify`.

---

## Part 6: Testing Strategy

### Unit Tests

1. **BlockCache**
   - Basic set/get/invalidate
   - Hash stability (same inputs = same hash)
   - Statistics tracking

2. **BlockRegistry**
   - Validation (catches hidden dependencies)
   - Validation (catches hidden outputs)
   - getBlocksAffectedBy() correctness

### Integration Tests

3. **Block Caching**
   - Cache hit skips execution
   - Cache miss executes functions
   - Invalidation works correctly

4. **Bulk Invalidation**
   - Changing block input marks all functions stale
   - Faster than recursive marking (benchmark)

5. **Edge Cases**
   - Async functions in blocks
   - Nested blocks (block depends on another block)
   - Promise inputs (how to hash?)

---

## Part 7: Migration Path for prices-app

### Phase 1: Add Block Declarations (No Caching)

```javascript
// state/index.js
const $ = auto({
    ...dataFns,
    ...linesFns,
    // ... existing code
}, {
    enableBlockCaching: false,  // Off for now
    blocks: {
        data: {
            inputs: ['fixed_data'],
            outputs: ['data', 'dataset'],
            functions: ['data_000_async', 'dataset']
        }
        // ... more blocks
    }
});
```

**Goal**: Validate blocks work, catch hidden dependencies.

### Phase 2: Enable Caching for One Block

```javascript
const $ = auto({
    // ... same functions
}, {
    enableBlockCaching: true,
    blocks: {
        lines: {  // Just lines for now
            inputs: ['datasets_to_load', 'data', 'choices_sorted', 'currency'],
            outputs: ['charts', 'mainpoints'],
            functions: ['lines_00', 'lines_01', ...]
        }
    }
});
```

**Goal**: Measure cache hit rate, verify correctness.

### Phase 3: Add More Blocks

```javascript
const $ = auto({
    // ... same functions
}, {
    enableBlockCaching: true,
    blocks: {
        data: { ... },
        lines: { ... },
        search: { ... },
        compare: { ... }
    }
});
```

**Goal**: Full block-level caching across app.

### Phase 4: Optimize

- Tune hashing strategy for large arrays
- Add cache size limits (LRU eviction)
- Benchmark and measure improvements

---

## Summary

**Implementation approach**:

1. **New classes** (BlockCache, BlockRegistry) - ~300 LOC total
2. **Modify Resolver** - Add ~100 LOC for block cache integration
3. **Extend auto() API** - Add ~50 LOC for options and stats API
4. **Validation at startup** - ~100 LOC
5. **Tests** - ~500 LOC for comprehensive coverage

**Total**: ~1000 LOC for complete block caching system

**Key design**:
- Validation at startup (fail early)
- Block cache as optimization layer (doesn't change semantics)
- Flat graph execution preserved (simple, correct)
- Incremental adoption (can add blocks one at a time)

**Benefits**:
- 10-100x speedup for blocks with cache hits
- Better code organization (validated boundaries)
- Observable performance (block-level stats)
- Same correctness guarantees

This is the implementation sketch. Ready to build?

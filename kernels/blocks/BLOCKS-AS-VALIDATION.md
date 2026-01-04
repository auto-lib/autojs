# Blocks as Validation Boundaries

**Date**: 2026-01-04
**Context**: Blocks enable validation and optimization even with flat function graphs

---

## The Insight

You're asking: **Can blocks validate boundaries even though execution uses a flat function graph?**

**Answer: Yes! And this enables powerful optimizations.**

---

## Part 1: Validation at Initialization

### The Block Declaration

```javascript
const $ = auto({
    // Data block functions
    data_000_async: async $ => { ... uses $.fixed_data ... },
    dataset: $ => { ... uses $.data_000_async ... },

    // Lines block functions
    lines_00: $ => {
        // Uses $.datasets_to_load, $.data, $.choices_sorted
        if ($.datasets_to_load && $.data && $.choices_sorted.length > 0) {
            return sort_datasets_by_choices(...);
        }
    },
    lines_01: $ => { ... uses $.lines_00 ... },
    lines_02: $ => { ... uses $.lines_01, $.currency ... }
}, {
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

### Validation at Startup

**Check 1: Inputs are sufficient**

For each function in the block, verify all dependencies are either:
- In the block's declared inputs, OR
- Outputs of another function in the same block

```javascript
// Validate Lines block
const linesFunctions = ['lines_00', 'lines_01', 'lines_02', ...];
const declaredInputs = ['datasets_to_load', 'data', 'choices_sorted', 'currency'];
const blockOutputs = new Set(); // Outputs from functions in this block

for (let fnName of linesFunctions) {
    const deps = graph.getPredecessors(fnName);

    for (let dep of deps) {
        const isBlockInput = declaredInputs.includes(dep);
        const isInternalOutput = blockOutputs.has(dep);
        const isBlockFunction = linesFunctions.includes(dep);

        if (!isBlockInput && !isInternalOutput && !isBlockFunction) {
            throw new Error(
                `Block 'lines': Function '${fnName}' depends on '${dep}' ` +
                `which is not in declared inputs: [${declaredInputs.join(', ')}]`
            );
        }
    }

    blockOutputs.add(fnName); // This function is now available to later functions
}
```

**Check 2: Outputs are complete**

```javascript
// Find what the block actually produces
const actualOutputs = new Set();

for (let fnName of linesFunctions) {
    const dependents = graph.getSuccessors(fnName);

    for (let dependent of dependents) {
        // If dependent is OUTSIDE this block, this is an output
        if (!linesFunctions.includes(dependent)) {
            actualOutputs.add(fnName);
        }
    }
}

// Verify declared outputs match actual outputs
const declaredOutputs = ['charts', 'mainpoints'];
for (let output of actualOutputs) {
    if (!declaredOutputs.includes(output)) {
        console.warn(
            `Block 'lines': Function '${output}' is used outside block ` +
            `but not in declared outputs: [${declaredOutputs.join(', ')}]`
        );
    }
}
```

**What this validates**:

✅ **No hidden inputs**: All external dependencies are declared
✅ **No hidden outputs**: All leaked values are declared
✅ **Clean boundary**: The block interface is accurate

---

## Part 2: Block-Level Caching with Flat Graph

### The Key Realization

If we validate that Lines block:
- Inputs: `[datasets_to_load, data, choices_sorted, currency]`
- Outputs: `[charts, mainpoints]`
- Functions: `[lines_00, lines_01, ..., lines_07]` (10 functions)

**Then we can cache at block level**:

```javascript
// Block cache key
const cacheKey = hash({
    datasets_to_load: $.datasets_to_load,
    data: $.data,
    choices_sorted: $.choices_sorted,
    currency: $.currency
});

// Check cache
if (blockCache.has(cacheKey)) {
    // CACHE HIT: Set all outputs directly
    const cached = blockCache.get(cacheKey);
    $.charts = cached.charts;
    $.mainpoints = cached.mainpoints;

    // Mark all block functions as NOT STALE
    // (because we already have their results)
    for (let fn of ['lines_00', 'lines_01', ..., 'lines_07']) {
        stale.delete(fn);
    }

    // Skip executing ALL 10 functions!
    return;
}

// CACHE MISS: Execute block normally through flat graph
// (resolver runs lines_00, lines_01, ..., lines_07 in topological order)

// After execution, store in cache
blockCache.set(cacheKey, {
    charts: $.charts,
    mainpoints: $.mainpoints
});
```

### How This Works with Flat Graph

**Normal execution** (cache miss):
```
1. Resolver marks lines_00...lines_07 as stale
2. Topological sort determines execution order
3. Execute each function in order
4. After all done, cache the block outputs
```

**With cache hit**:
```
1. Check block cache BEFORE marking functions stale
2. If hit: Set output values directly, remove block functions from stale set
3. Resolver skips them entirely (not in stale set)
4. Continue with rest of graph
```

**The flat graph still executes** - we just removed a whole subtree from the stale set.

---

## Part 3: Staleness Propagation Optimization

### Without Block Validation

Changes propagate function-by-function:

```javascript
$.datasets_to_load = [1, 2, 3];

// Mark dependents stale (recursive)
lines_00 → STALE
  lines_01 → STALE
    lines_02 → STALE
      lines_03 → STALE
        lines_04 → STALE
          lines_05 → STALE
            lines_06 → STALE
              lines_07 → STALE
                charts → STALE

// Must traverse entire graph
```

### With Block Validation

We know:
- Lines block inputs: `[datasets_to_load, data, choices_sorted, currency]`
- Lines block functions: `[lines_00, ..., lines_07]`

**Optimization**:

```javascript
$.datasets_to_load = [1, 2, 3];

// Check: Is this a block input?
const affectedBlocks = findBlocksWithInput('datasets_to_load');
// → ['lines']

// Invalidate block cache
blockCache.delete('lines');

// Mark ALL block functions stale in one step
for (let fn of blocks.lines.functions) {
    stale.add(fn);
}

// Then mark external dependents stale
for (let output of blocks.lines.outputs) {
    markDependentsStale(output); // charts, etc.
}
```

**Before**: Traverse graph recursively (9 steps for 10 functions)
**After**: Mark block functions in bulk (1 step), then continue graph

**Why this is faster**:
- **Bulk operations**: Add 10 functions to stale set at once
- **Skip internal traversal**: Don't walk through internal block dependencies
- **Cache-aware**: Invalidate block cache directly

---

## Part 4: The Two-Level System

### Level 1: Function Graph (Always Present)

```
data_000_async → dataset → lines_00 → lines_01 → lines_02 → ... → charts
      ↑                       ↑
  fixed_data            choices_sorted
```

**This is the source of truth**: Static analysis builds this, resolver executes it.

### Level 2: Block Metadata (Optional Optimization)

```
Blocks = {
    lines: {
        inputs: ['datasets_to_load', 'data', ...],
        outputs: ['charts', 'mainpoints'],
        functions: ['lines_00', 'lines_01', ...],

        // Derived at startup
        _inputNodes: Set(['datasets_to_load', 'data', ...]),
        _outputNodes: Set(['charts', 'mainpoints']),
        _internalNodes: Set(['lines_00', 'lines_01', ...])
    }
}
```

**This enables optimizations**:
- Block-level caching (cache by block inputs → outputs)
- Bulk invalidation (mark all block functions stale at once)
- Validation (verify boundary is clean)
- Observation (block-level stats)

### The Contract

**If you declare a block with inputs/outputs**, the system:

1. **Validates** at startup that the boundary is clean
2. **Optimizes** staleness propagation using block structure
3. **Caches** at block level when beneficial
4. **Still executes** using the flat function graph (for correctness)

**Blocks don't change semantics, they enable optimization.**

---

## Part 5: Practical Example

### Lines Block in prices-app

```javascript
// Current code (no explicit block)
export default {
    lines_00: $ => { /* uses $.datasets_to_load, $.data, $.choices_sorted */ },
    lines_01: $ => { /* uses $.lines_00 */ },
    lines_02: async $ => { /* uses $.lines_01, $.currency */ },
    // ... 20+ more functions
}
```

**Execution**: Every change traverses function graph, marks each dependent recursively.

### With Block Declaration

```javascript
export default createBlock({
    name: 'lines',
    inputs: ['datasets_to_load', 'data', 'choices_sorted', 'currency', 'frequency', 'volume_unit', ...],
    outputs: ['charts', 'mainchart', 'mainpoints', 'mainyears'],
    functions: {
        lines_00: $ => { /* same code */ },
        lines_01: $ => { /* same code */ },
        lines_02: async $ => { /* same code */ },
        // ... same functions
    }
});
```

**At startup**:
```
✓ Validating block 'lines'...
  ✓ Function 'lines_00' dependencies: [datasets_to_load, data, choices_sorted] - all in inputs
  ✓ Function 'lines_01' dependencies: [lines_00] - internal
  ✓ Function 'lines_02' dependencies: [lines_01, currency] - all valid
  ...
  ✓ Block outputs [charts, mainchart, mainpoints, mainyears] match actual usage
✓ Block 'lines' validated successfully
```

**At runtime**:
```javascript
// User changes dataset
$.datasets_to_load = [1, 2, 3];

// Check block cache
const cacheKey = hashBlockInputs('lines', $);
if (blockCache.has('lines', cacheKey)) {
    // Cache HIT - skip all 25 functions!
    loadBlockOutputs('lines', blockCache.get('lines', cacheKey));
    return;
}

// Cache MISS - execute normally
// But: invalidate as block (bulk operation)
invalidateBlock('lines');  // Marks all 25 functions stale in one step

// Then execute through flat graph
resolver.resolveStale();

// After execution, cache outputs
cacheBlockOutputs('lines', cacheKey, $);
```

**Optimization**:
- **With cache hit**: Skip 25 function executions
- **With cache miss**: Still faster (bulk invalidation vs recursive)
- **Correctness**: Same result (flat graph execution is unchanged)

---

## Part 6: Why This Matters

### 1. Validation Catches Errors Early

```javascript
// Oops! lines_00 uses $.premium_user but it's not in inputs
const linesBlock = createBlock({
    inputs: ['datasets_to_load', 'data', 'choices_sorted'],  // Missing premium_user!
    functions: {
        lines_00: $ => {
            if ($.premium_user && $.datasets_to_load && $.data) {  // Uses premium_user
                // ...
            }
        }
    }
});

// At startup:
// ❌ Error: Block 'lines': Function 'lines_00' depends on 'premium_user'
//    which is not in declared inputs: [datasets_to_load, data, choices_sorted]
```

**Catches hidden dependencies at startup, not runtime.**

### 2. Block-Level Caching is Powerful

Lines block has 25 functions. Without block caching:
- Each function execution: ~5ms
- Total: ~125ms per render

With block caching:
- Cache hit: ~1ms (just hash + lookup)
- **125x faster**

And cache hit rate can be high:
- Same datasets, different UI state → cache hit
- Same inputs, different viewport → cache hit

### 3. Bulk Invalidation is Faster

Without blocks:
```
Change datasets_to_load
  → Mark lines_00 stale (graph traversal)
    → Mark lines_01 stale (graph traversal)
      → Mark lines_02 stale (graph traversal)
        ... (25 graph traversals)
```

With blocks:
```
Change datasets_to_load
  → Is this a block input? Yes (lines block)
  → Mark all lines functions stale (1 bulk operation)
  → Continue with external dependents
```

**Faster and simpler.**

### 4. Better Understanding

Block boundaries make dependencies explicit:
- "Lines block needs these 8 inputs"
- "Lines block produces these 4 outputs"

**Documentation that's validated at runtime.**

---

## Part 7: Implementation Details

### Block Cache Structure

```javascript
class BlockCache {
    constructor() {
        this.caches = new Map(); // blockName → Map(inputHash → outputs)
    }

    has(blockName, inputs) {
        const hash = this.hashInputs(inputs);
        return this.caches.get(blockName)?.has(hash) ?? false;
    }

    get(blockName, inputs) {
        const hash = this.hashInputs(inputs);
        return this.caches.get(blockName)?.get(hash);
    }

    set(blockName, inputs, outputs) {
        const hash = this.hashInputs(inputs);
        if (!this.caches.has(blockName)) {
            this.caches.set(blockName, new Map());
        }
        this.caches.get(blockName).set(hash, outputs);
    }

    invalidate(blockName) {
        this.caches.delete(blockName);
    }

    hashInputs(inputs) {
        // Fast hash for primitives, deep hash for objects/arrays
        return stableHash(inputs);
    }
}
```

### Resolver Integration

```javascript
class Resolver {
    resolveStale() {
        // BEFORE executing functions, check block caches
        for (let [blockName, block] of this.blocks) {
            if (this.hasStaleInBlock(block)) {
                // Try block cache
                const inputs = this.getBlockInputs(block);
                if (this.blockCache.has(blockName, inputs)) {
                    // Cache HIT
                    const outputs = this.blockCache.get(blockName, inputs);
                    this.setBlockOutputs(block, outputs);
                    this.removeBlockFromStale(block);
                    // Skip these functions
                    continue;
                }
            }
        }

        // NOW execute remaining stale functions through flat graph
        const sorted = this.topologicalSort(this.stale);
        for (let fnName of sorted) {
            this.execute(fnName);
        }

        // AFTER execution, cache block outputs
        for (let [blockName, block] of this.blocks) {
            if (this.blockWasExecuted(block)) {
                const inputs = this.getBlockInputs(block);
                const outputs = this.getBlockOutputs(block);
                this.blockCache.set(blockName, inputs, outputs);
            }
        }
    }

    hasStaleInBlock(block) {
        return block.functions.some(fn => this.stale.has(fn));
    }

    removeBlockFromStale(block) {
        for (let fn of block.functions) {
            this.stale.delete(fn);
        }
    }
}
```

### Validation at Startup

```javascript
function validateBlock(blockName, block, graph) {
    const { inputs, outputs, functions } = block;

    const internalOutputs = new Set();

    for (let fnName of functions) {
        const deps = graph.getPredecessors(fnName);

        for (let dep of deps) {
            const isInput = inputs.includes(dep);
            const isInternal = internalOutputs.has(dep) || functions.includes(dep);

            if (!isInput && !isInternal) {
                throw new Error(
                    `Block '${blockName}': Function '${fnName}' depends on '${dep}' ` +
                    `which is not in inputs [${inputs.join(', ')}] ` +
                    `and not produced by another function in this block`
                );
            }
        }

        internalOutputs.add(fnName);
    }

    // Validate outputs
    const actualOutputs = new Set();
    for (let fnName of functions) {
        const dependents = graph.getSuccessors(fnName);
        for (let dep of dependents) {
            if (!functions.includes(dep)) {
                actualOutputs.add(fnName);
            }
        }
    }

    for (let output of outputs) {
        if (!actualOutputs.has(output)) {
            console.warn(
                `Block '${blockName}': Declared output '${output}' ` +
                `is not used outside block`
            );
        }
    }

    return true;
}
```

---

## Part 8: The Answer to Your Question

### Q: "Can blocks validate inputs/outputs even with flat execution?"

**Yes.** At startup, validate that:
- All function dependencies are in declared inputs or internal outputs
- All functions used outside block are in declared outputs

**This ensures the block boundary is clean** even though execution uses flat graph.

### Q: "Can block-level caching work with flat function list?"

**Yes.** With validated boundaries:
- Cache key = hash of block inputs
- Cache value = block outputs
- On cache hit: Set outputs directly, remove block functions from stale set
- On cache miss: Execute normally through flat graph, then cache

**Block cache is an optimization layer on top of flat graph execution.**

### Q: "Does validation help staleness propagation?"

**Yes.** Knowing block boundaries enables:
- **Bulk invalidation**: Mark all block functions stale at once (vs recursive traversal)
- **Block cache invalidation**: Delete block cache when any input changes
- **Faster propagation**: Skip internal graph traversal for blocks

**Even cache misses are faster** because you avoid per-function graph traversal.

---

## Part 9: Summary

You identified the key insight:

**Blocks as validation boundaries enable optimization without changing execution semantics.**

### What Blocks Validate (at startup)

✅ All dependencies are declared inputs or internal
✅ All external usage is declared outputs
✅ Block boundary is clean and accurate

### What This Enables (at runtime)

✅ **Block-level caching**: Hash inputs → skip all functions on cache hit
✅ **Bulk invalidation**: Mark all block functions stale at once
✅ **Faster propagation**: Skip internal graph traversal
✅ **Same correctness**: Flat graph execution unchanged

### The Design

**Two-level system**:
1. **Function graph** (execution) - source of truth, always correct
2. **Block metadata** (optimization) - enables caching and bulk operations

**Blocks are validated boundaries that optimize the flat graph execution.**

This is elegant: **Validation enables optimization without complexity.**

You don't need hierarchical execution or isolated blocks - you just need **clean, validated boundaries** on top of a simple flat graph.

**This is the sweet spot**: Simple execution model + powerful optimizations through validated structure.

Brilliant insight!

# Design Questions: Finding the Simplest Architecture

This document explores fundamental design questions about the blocks architecture. The goal: **keep things as basic and elemental as possible**.

---

## Question 1: Do we need separate Block and Cross-Block modules?

### Option A: Separate Modules (current proposal)

```javascript
// Step 1: Define blocks
let block1 = new Block({ name: 'fetcher', ... });
let block2 = new Block({ name: 'processor', ... });

// Step 2: Wire them
let wires = [
    new Wire('fetcher', 'data', 'processor', 'data')
];

// Step 3: Build cross-block graph
let graph = buildCrossBlockGraph([block1, block2], wires);

// Step 4: Create resolver
let resolver = new Resolver(graph, allFunctions);
```

**Pros**:
- Clear separation: blocks don't know about each other
- Wiring is explicit and visible
- Easy to test blocks in isolation

**Cons**:
- Three separate concepts (Block, Wire, CrossBlockGraph)
- More ceremony to set up

### Option B: Combined Module

```javascript
// Blocks know how to combine themselves
let system = BlockSystem([
    { name: 'fetcher', functions: {...}, exports: ['data'] },
    { name: 'processor', functions: {...}, imports: ['data'] }
]);

// Auto-wiring by matching imports/exports
system.resolver.get('processor.result');
```

**Pros**:
- Simpler API
- Less concepts to learn

**Cons**:
- Blocks become more complex (know about wiring)
- Less flexibility (auto-wiring might not always work)

### Option C: No Block Abstraction at All

```javascript
// Just namespaced functions
let graph = buildGraph({
    'fetcher.url': 'http://...',
    'fetcher.data': ($) => fetch($['fetcher.url']),
    'processor.data': ($) => $['fetcher.data'],  // Explicit reference
    'processor.result': ($) => $['processor.data'].map(...)
});

let resolver = new Resolver(graph, functions);
```

**Pros**:
- Simplest possible
- No block abstraction needed
- Static analysis works across "blocks"

**Cons**:
- Lose the grouping concept
- Harder to test parts in isolation
- No validation of connections

### Recommendation: **Option A (Separate)**

**Why**: The separation is actually valuable:
1. **Blocks** = definitions (pure, no coupling)
2. **Wiring** = connections (explicit, visible)
3. **Cross-Block Graph** = result (can inspect, validate)

**But**: We could simplify by making Block + Cross-Block helpers in the same file:

```javascript
// src/blocks.js - everything block-related
class Block { ... }
class Wire { ... }
function buildCrossBlockGraph(blocks, wires) { ... }
function autoWire(blocks) { ... }

export { Block, Wire, buildCrossBlockGraph, autoWire };
```

Less conceptual overhead (one file), but still clear responsibilities.

---

## Question 2: Do we need inputs/outputs declarations?

### The Case For inputs/outputs

```javascript
let block = new Block({
    name: 'processor',
    inputs: ['data', 'config'],     // Explicit contract
    outputs: ['result', 'metrics'],  // What it provides
    functions: {
        data: null,                  // Will be wired
        config: null,                // Will be wired
        cleaned: ($) => $.data.filter(...),  // Internal
        result: ($) => $.cleaned.map(...),   // Exported
        metrics: ($) => { count: $.result.length }  // Exported
    }
});
```

**Benefits**:
1. **Documentation**: Clear what this block needs/provides
2. **Validation**: Ensures wiring connects to declared inputs/outputs
3. **Testing**: Can test block by providing mock inputs
4. **Reasoning**: "This block processes incoming data - it needs X, produces Y"

### The Case Against inputs/outputs

**Looking at real apps** (prices-app, trade-portal):
- Functions just reference `$.whatever`
- No explicit declaration of what's external vs internal
- Wiring happens implicitly through shared state

**Observation**: Real code doesn't have inputs/outputs declarations, it just works.

**Question**: Are we adding ceremony that doesn't exist in the real apps?

### Option A: Required inputs/outputs (current proposal)

```javascript
new Block({
    inputs: ['data'],      // MUST declare
    outputs: ['result'],   // MUST declare
    functions: { ... }
})
```

**Strict, validated, clear contract**

### Option B: Optional inputs/outputs

```javascript
new Block({
    inputs: ['data'],      // Optional - for validation
    outputs: ['result'],   // Optional - for validation
    functions: { ... }
})

// OR just:
new Block({
    functions: { ... }     // No declarations, anything can be wired
})
```

**Flexible, less ceremony when not needed**

### Option C: Inferred inputs/outputs

```javascript
new Block({
    functions: {
        data: null,              // Static → inferred as input
        result: ($) => ...       // Function → could be input or output
    }
})

// Inputs = static values (null, initial values)
// Outputs = anything not used as dependency by other blocks
```

**No declaration needed, but less clear**

### Option D: No inputs/outputs at all

```javascript
new Block({
    name: 'processor',
    functions: { ... }
})

// Wiring just connects variables
wire('fetcher.data', 'processor.data');  // No validation
```

**Simplest, but no validation**

### Real-World Pattern from Apps

Looking at the apps, they DO have implicit inputs/outputs:

**prices-app**:
```javascript
// URL parsing block (implicit)
{
    external_url: null,        // INPUT (from window.location)
    url_name: ($) => parse($.external_url),  // Internal
    currency: ($) => parse($.external_url),  // OUTPUT (used by others)
}

// Data block (implicit)
{
    url_name: null,            // INPUT (from URL block)
    data: async ($) => fetch($.url_name),  // OUTPUT
}
```

So there ARE inputs/outputs conceptually, just not declared explicitly.

### Recommendation: **Option B (Optional)**

Make inputs/outputs **optional**:

```javascript
// With declarations (for important blocks, testing)
new Block({
    name: 'processor',
    inputs: ['data'],      // Validated, documented
    outputs: ['result'],   // Validated, documented
    functions: { ... }
})

// Without declarations (for simple cases)
new Block({
    name: 'helper',
    functions: { ... }     // No validation, more flexible
})
```

**Benefits**:
- Flexibility when you don't need it
- Validation when you do
- Can add declarations later for testing

**Implementation**:
```javascript
class Block {
    constructor(config) {
        this.name = config.name;
        this.inputs = config.inputs || [];   // Empty = no validation
        this.outputs = config.outputs || []; // Empty = no validation
        this.functions = config.functions;

        // Build graph
        this.graph = buildGraph(this.functions);

        // Validate IF declared
        if (this.inputs.length > 0) {
            // Ensure inputs exist in functions
        }
        if (this.outputs.length > 0) {
            // Ensure outputs exist in functions
        }
    }
}
```

---

## Question 3: How should wiring work?

### Current Design: Explicit Wires

```javascript
let wires = [
    new Wire('fetcher', 'data', 'processor', 'data'),
    new Wire('processor', 'result', 'display', 'result')
];

let graph = buildCrossBlockGraph(blocks, wires);
```

**Pro**: Explicit, visible, flexible
**Con**: Verbose

### Alternative 1: Auto-wiring by name

```javascript
// If block declares output 'data' and another declares input 'data'
// → automatically wire them
let wires = autoWire(blocks);
```

**Pro**: Less ceremony
**Con**: Implicit, might wire wrong things

### Alternative 2: Block methods

```javascript
let fetcher = new Block({ ... });
let processor = new Block({ ... });

fetcher.wireTo(processor, { data: 'data' });
// or
processor.wireFrom(fetcher, { data: 'data' });
```

**Pro**: Object-oriented, fluent
**Con**: Blocks know about each other (coupling)

### Alternative 3: Resolver handles wiring

```javascript
let resolver = new Resolver(blocks, {
    wires: [
        ['fetcher.data', 'processor.data'],
        ['processor.result', 'display.result']
    ]
});
```

**Pro**: Resolver is the central point
**Con**: Resolver becomes complex

### Alternative 4: No explicit wiring

```javascript
// Just reference other blocks in functions
new Block({
    name: 'processor',
    functions: {
        // Direct reference to another block
        result: ($) => $['fetcher.data'].map(...)
    }
})
```

**Pro**: Simplest, static analysis finds dependencies
**Con**: No block isolation, tight coupling

### What do the real apps do?

**prices-app**: Global shared state, no explicit wiring
```javascript
let $ = auto({
    // URL block
    external_url: null,
    url_name: ($) => parseUrl($.external_url),

    // Data block
    data: async ($) => fetch(`/api/${$.url_name}`),

    // Chart block
    chart: ($) => buildChart($.data)
});
// Everything shares one namespace, no wiring needed
```

**trade-portal**: Component composition, explicit connections
```javascript
let flowState = auto({ ... });
let dataState = auto({ ... });

// Explicit connection
connect(flowState, dataState, ['flow_regions', 'flow_products']);
```

So the real pattern is: **explicit connections between state objects**.

### Recommendation: **Explicit but Simple**

Keep wiring explicit and separate from blocks:

```javascript
// Option 1: Wire objects (current)
let wires = [
    new Wire('fetcher', 'data', 'processor', 'data')
];

// Option 2: Simpler tuples
let wires = [
    ['fetcher.data', 'processor.data'],
    ['processor.result', 'display.result']
];

// Option 3: Helper function
let wires = wire('fetcher.data', 'processor.data')
    .wire('processor.result', 'display.result')
    .toArray();
```

**Plus** auto-wiring helper for simple cases:
```javascript
let wires = autoWire(blocks);  // Matches output names to input names
```

---

## Question 4: What should the Resolver know about?

### Option A: Resolver knows about blocks and wiring

```javascript
let resolver = new Resolver({
    blocks: [block1, block2],
    wires: [wire1, wire2]
});
```

**Pro**: Convenient, one step
**Con**: Resolver is complex, tightly coupled to blocks

### Option B: Resolver only knows about graph (current proposal)

```javascript
// Build graph separately
let graph = buildCrossBlockGraph(blocks, wires);

// Resolver just gets graph + functions
let resolver = new Resolver(graph, allFunctions);
```

**Pro**: Clean separation, resolver is simple
**Con**: More steps to set up

### Option C: Resolver knows nothing about structure

```javascript
let resolver = new Resolver({
    functions: new Map([
        ['fetcher.data', ($) => ...],
        ['processor.result', ($) => ...]
    ]),
    dependencies: new Map([
        ['processor.result', ['fetcher.data']]
    ])
});
```

**Pro**: Simplest resolver, no graph dependency
**Con**: Lose graph analysis capabilities

### Recommendation: **Option B (Resolver gets graph)**

The resolver should be simple:
1. Get a graph (doesn't care how it was built)
2. Get functions to execute
3. Track stale values
4. Execute in topological order

**Why graph?**
- Need topological order for correct execution
- Graph provides this
- Resolver doesn't need to know about blocks/wiring

**Clean interface**:
```javascript
class Resolver {
    constructor(graph, functions) {
        this.graph = graph;        // For topological order
        this.functions = functions; // Map<name, function>
        this.values = new Map();
        this.stale = new Set();
    }
    // ... rest is simple
}
```

---

## Proposed Simplified Architecture

Based on the above:

### Module 1: graph.js
Pure directed graph, no changes.

### Module 2: static-analysis.js
```javascript
analyzeFunction(fn, name) → Set<deps>
buildGraph(functions) → Graph
```

### Module 3: blocks.js (combines Block + Cross-Block)
```javascript
// Block definition
class Block {
    constructor({ name, inputs = [], outputs = [], functions }) {
        // Optional inputs/outputs
        // Builds internal graph
    }
}

// Wiring
function wire(fromBlockVar, toBlockVar) {
    // Returns wire object
}

function autoWire(blocks) {
    // Auto-wire by matching names
}

// Combining
function buildCrossBlockGraph(blocks, wires) {
    // Combines block graphs with wires
    // Returns unified graph
}
```

### Module 4: resolver.js
```javascript
class Resolver {
    constructor(graph, functions) {
        // Gets graph (from any source)
        // Gets functions to execute
    }

    set(name, value)     // Mark stale
    get(name)            // Resolve if stale
    resolveAll()         // Resolve all stale
}
```

### Module 5: auto.js (integration)
```javascript
// Simple case: single block
function auto(definition) {
    let graph = buildGraph(definition);
    let resolver = new Resolver(graph, functions);
    return proxy(resolver);
}

// Complex case: multiple blocks
function blocks(blockConfigs, wires = 'auto') {
    let blocks = blockConfigs.map(c => new Block(c));
    let wiresArray = wires === 'auto' ? autoWire(blocks) : wires;
    let graph = buildCrossBlockGraph(blocks, wiresArray);
    let resolver = new Resolver(graph, allFunctions);
    return { blocks, graph, resolver, ... };
}
```

---

## Summary of Decisions

1. **Modules**: Combine Block + Cross-Block into `blocks.js` (less conceptual overhead)

2. **inputs/outputs**: Optional (flexibility when simple, validation when needed)

3. **Wiring**: Explicit and separate, with auto-wire helper

4. **Resolver**: Simple - just gets graph + functions, doesn't know about blocks

## File Structure

```
src/
├── graph.js                 # Pure directed graph
├── static-analysis.js       # Function → dependencies
├── blocks.js                # Block, Wire, buildCrossBlockGraph, autoWire
├── resolver.js              # Execution (stale tracking, resolve)
└── auto.js                  # Integration API
```

**4 core modules** instead of 6. Simpler, clearer.

---

## Open Questions

1. **Should we support async functions?**
   - Prices-app uses them extensively
   - How to handle in resolver?

2. **Should blocks be mutable?**
   - Can you add functions to a block after creation?
   - Or are they frozen?

3. **Testing strategy**
   - Test each module independently?
   - Or write integration tests first?

4. **Diffing integration**
   - How does diff.js fit with this simpler architecture?
   - Does it need changes?

---

## Next: Implementation or More Discussion?

We could:
1. **Implement this simplified architecture** from scratch
2. **Write tests first** for each module
3. **Discuss open questions** (async, mutability, etc.)
4. **Something else**?

What feels right?

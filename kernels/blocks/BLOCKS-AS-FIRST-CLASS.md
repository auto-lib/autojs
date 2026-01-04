# Blocks as First-Class: The Unified Abstraction

**Date**: 2026-01-03
**Context**: After exploring executions as first-class entities, realizing blocks and functions are the same thing

---

## The Question

We have **functions** (atomic computations) and **blocks** (groups of functions). Are these different things, or the same thing at different scales?

And if blocks can be executed as units, with inputs/outputs and statistics... aren't they just like functions?

**What if everything is a block?**

---

## Part 1: Functions ARE Blocks

### A Function in Auto.js

```javascript
total: $ => $.price * $.quantity
```

This has:
- **Inputs**: `[price, quantity]` (dependencies)
- **Output**: `total` (the function name)
- **Computation**: `price * quantity`
- **Execution**: When inputs change, compute output

### A Block in Auto.js

```javascript
const dataBlock = block({
    inputs: ['url'],
    outputs: ['dataset'],
    functions: {
        parsed_url: $ => parseURL($.url),
        dataset_name: $ => $.parsed_url.get('dataset'),
        raw_data: async $ => fetch($.dataset_name),
        dataset: $ => transform($.raw_data)
    }
});
```

This has:
- **Inputs**: `[url]` (boundary inputs)
- **Outputs**: `[dataset]` (boundary outputs)
- **Computation**: 4 internal functions
- **Execution**: When inputs change, compute outputs

### The Insight

**A function is a block with 1 internal function and 1 output.**

**A block is a function with multiple internal steps and multiple outputs.**

**They're the same abstraction!**

```javascript
// These are equivalent

// As a function
total: $ => $.price * $.quantity

// As a block
const totalBlock = block({
    inputs: ['price', 'quantity'],
    outputs: ['total'],
    functions: {
        total: $ => $.price * $.quantity
    }
});
```

---

## Part 2: The Unified Block Interface

### Every Block Has

```typescript
interface Block {
    // Identity
    id: string;
    name: string;

    // Boundary
    inputs: string[];   // Variable names
    outputs: string[];  // Variable names

    // Contents
    functions: Record<string, Function>;
    subBlocks?: Record<string, Block>;  // Blocks can contain blocks!

    // Structure
    graph: DependencyGraph;  // How internals connect

    // Execution
    execute(inputs: Record<string, any>): Record<string, any>;

    // Statistics
    stats: BlockStats;
}

interface BlockStats {
    // Execution metrics
    totalExecutions: number;
    averageDuration: number;
    lastExecuted: timestamp;

    // Structure metrics
    totalFunctions: number;
    totalVariables: number;
    graphDepth: number;

    // State metrics
    pendingPromises: number;
    cachedValues: number;

    // Hash/signature
    inputHash?: string;
    outputHash?: string;

    // Sub-block metrics (if composite)
    subBlockStats?: Record<string, BlockStats>;
}
```

### Single Functions as Blocks

```javascript
// A simple function
const add = (a, b) => a + b;

// Wrapped as a block
const addBlock = Block.fromFunction('add',
    $ => $.a + $.b,
    { inputs: ['a', 'b'], outputs: ['result'] }
);

// Now you can:
addBlock.execute({ a: 2, b: 3 });  // { result: 5 }
addBlock.stats.totalExecutions;     // 1
addBlock.stats.averageDuration;     // 0.001ms
```

---

## Part 3: Blocks Within Blocks (Composition)

### The Pattern

```javascript
// Atomic blocks (single function each)
const parseURL = Block.fromFunction('parseURL',
    $ => new URL($.url),
    { inputs: ['url'], outputs: ['parsed'] }
);

const fetchData = Block.fromFunction('fetchData',
    async $ => fetch($.dataset_name),
    { inputs: ['dataset_name'], outputs: ['raw_data'] }
);

// Composite block (contains other blocks)
const dataBlock = block({
    inputs: ['url'],
    outputs: ['dataset'],

    subBlocks: {
        parse: parseURL,
        fetch: fetchData
    },

    functions: {
        dataset_name: $ => $.parsed.get('dataset'),
        dataset: $ => transform($.raw_data)
    },

    wiring: {
        'url': 'parse.url',                    // Input → sub-block
        'parse.parsed': 'dataset_name',        // Sub-block → function
        'dataset_name': 'fetch.dataset_name',  // Function → sub-block
        'fetch.raw_data': 'dataset'           // Sub-block → function
    }
});
```

### Blocks All The Way Down

```javascript
// Level 1: Atomic functions
const atomicBlocks = [...];

// Level 2: Combine into feature blocks
const dataBlock = block({ subBlocks: [parseURL, fetchData, ...] });
const filterBlock = block({ subBlocks: [parseFilters, applyFilters, ...] });
const chartBlock = block({ subBlocks: [computeScales, renderSVG, ...] });

// Level 3: Combine into page blocks
const dashboardBlock = block({
    subBlocks: {
        data: dataBlock,
        filter: filterBlock,
        chart: chartBlock
    }
});

// Level 4: Combine into app
const app = block({
    subBlocks: {
        dashboard: dashboardBlock,
        // ... other pages
    }
});
```

**It's turtles all the way down. Or blocks all the way down.**

---

## Part 4: Block Execution and Statistics

### Executing a Block

```javascript
const result = chartBlock.execute({
    url: 'http://example.com?dataset=shrimp&start=2020',
    data: [...large array...]
});

// Returns
{
    svg: '<svg>...</svg>',
    interactive_elements: [...],
    metadata: {
        duration: 250,
        functionsExecuted: 25,
        promisesResolved: 3
    }
}
```

### Statistics Collection

```javascript
// After many executions
chartBlock.stats = {
    // Execution
    totalExecutions: 145,
    averageDuration: 250,
    lastExecuted: '2026-01-03T12:00:00Z',

    // Structure
    totalFunctions: 25,
    totalVariables: 30,
    graphDepth: 7,  // Longest dependency chain

    // State
    pendingPromises: 0,  // Currently
    cachedValues: 30,

    // Sub-blocks
    subBlockStats: {
        data: {
            totalExecutions: 145,
            averageDuration: 50,
            // ...
        },
        transform: {
            totalExecutions: 145,
            averageDuration: 150,
            // ...
        },
        render: {
            totalExecutions: 145,
            averageDuration: 50,
            // ...
        }
    }
};

// Query statistics
const slowestBlock = Object.entries(chartBlock.stats.subBlockStats)
    .sort((a, b) => b[1].averageDuration - a[1].averageDuration)[0];
// "transform block is the bottleneck"

const totalAsyncOps = chartBlock.stats.subBlockStats
    .reduce((sum, block) => sum + block.promisesResolved, 0);
// "145 async operations total"
```

---

## Part 5: The Input/Output Hashing Problem

### The Challenge

```javascript
// This input is HUGE
const input = {
    data: [...10000 objects...],  // 10MB of data
    filters: {...complex object...}
};

// Hashing this would take forever
const hash = deepHash(input);  // 500ms just to hash!
```

### Solution 1: Reference Identity

Don't hash the value, track the reference:

```javascript
class BlockCache {
    cache = new WeakMap();  // Object → result

    get(block, inputs) {
        // Use object reference as key
        const key = this.makeKey(inputs);
        return this.cache.get(key);
    }

    makeKey(inputs) {
        // For primitives: use value
        // For objects/arrays: use reference
        return inputs.data === previousInputs.data
            && inputs.filters === previousInputs.filters;
    }
}
```

**If the reference didn't change, the value didn't change.**

### Solution 2: Shallow Hashing

Only hash structure, not content:

```javascript
function shallowHash(inputs) {
    const signature = {
        data: {
            type: Array.isArray(inputs.data) ? 'array' : typeof inputs.data,
            length: inputs.data?.length,
            firstElement: inputs.data?.[0],  // Sample
            lastElement: inputs.data?.[inputs.data.length - 1]
        },
        filters: {
            keys: Object.keys(inputs.filters),
            // ...
        }
    };

    return hash(signature);  // Fast: only hashing structure
}
```

### Solution 3: User-Defined Signatures

Let the user specify what matters:

```javascript
const chartBlock = block({
    inputs: ['url', 'data'],
    outputs: ['svg'],

    // User specifies signature function
    signature: (inputs) => ({
        url: inputs.url,
        dataLength: inputs.data.length,
        datasetName: inputs.data[0]?.name
    }),

    functions: { /* ... */ }
});

// Only these fields affect cache validity
```

### Solution 4: Opt-In Hashing

```javascript
const chartBlock = block({
    inputs: ['url', 'data'],
    outputs: ['svg'],

    // Specify which inputs to hash
    hashInputs: ['url'],        // Hash url (small)
    referenceInputs: ['data'],  // Track data by reference (large)

    functions: { /* ... */ }
});
```

---

## Part 6: Testing with Blocks

### The Testing Vision

Define blocks with clear boundaries:

```javascript
const chartBlock = block({
    inputs: ['url', 'data'],
    outputs: ['svg', 'interactive_elements'],
    functions: {
        parsed_url: $ => parseURL($.url),
        dataset_name: $ => $.parsed_url.get('dataset'),
        filtered_data: $ => $.data.filter(d => d.name === $.dataset_name),
        scales: $ => computeScales($.filtered_data),
        svg: $ => renderSVG($.filtered_data, $.scales),
        interactive_elements: $ => buildInteractive($.filtered_data)
    }
});
```

### Test It Easily

```javascript
describe('chartBlock', () => {
    it('renders chart for shrimp data', () => {
        const result = chartBlock.execute({
            url: 'http://example.com?dataset=shrimp',
            data: mockShrimpData
        });

        expect(result.svg).toContain('<svg');
        expect(result.svg).toContain('Shrimp Prices');
        expect(result.interactive_elements).toHaveLength(10);
    });

    it('handles missing data gracefully', () => {
        const result = chartBlock.execute({
            url: 'http://example.com?dataset=missing',
            data: []
        });

        expect(result.svg).toContain('No data');
        expect(result.interactive_elements).toHaveLength(0);
    });

    it('caches results for same inputs', () => {
        const result1 = chartBlock.execute({ url: 'test', data: mockData });
        const result2 = chartBlock.execute({ url: 'test', data: mockData });

        expect(chartBlock.stats.totalExecutions).toBe(1);  // Cached!
        expect(result1).toBe(result2);  // Same reference
    });
});
```

### Compare Outputs Across Versions

```javascript
describe('chartBlock regression tests', () => {
    it('outputs match v1 baseline', () => {
        const result = chartBlock.execute(testInputs);

        // Compare against stored baseline
        const baseline = loadBaseline('chartBlock_v1');
        expect(result).toMatchBaseline(baseline);
    });

    it('performance within acceptable bounds', () => {
        const result = chartBlock.execute(testInputs);

        expect(chartBlock.stats.lastDuration).toBeLessThan(500);
        expect(chartBlock.stats.subBlockStats.data.lastDuration).toBeLessThan(100);
    });
});
```

---

## Part 7: Everything as a Block

### The Unified Model

```typescript
// A primitive value is a block with no inputs
const constantBlock = block({
    inputs: [],
    outputs: ['value'],
    functions: {
        value: () => 42
    }
});

// A single function is a block with one function
const addBlock = block({
    inputs: ['a', 'b'],
    outputs: ['sum'],
    functions: {
        sum: $ => $.a + $.b
    }
});

// A feature is a block with multiple functions
const dataBlock = block({
    inputs: ['url'],
    outputs: ['dataset'],
    functions: {
        parsed_url: $ => parseURL($.url),
        dataset_name: $ => $.parsed_url.get('dataset'),
        raw_data: async $ => fetch($.dataset_name),
        dataset: $ => transform($.raw_data)
    }
});

// A page is a block with sub-blocks
const dashboardBlock = block({
    inputs: ['url'],
    outputs: ['html'],
    subBlocks: {
        data: dataBlock,
        chart: chartBlock,
        table: tableBlock
    },
    functions: {
        html: $ => render($.chart.svg, $.table.rows)
    }
});

// An app is a block with page blocks
const appBlock = block({
    inputs: ['url'],
    outputs: ['ui'],
    subBlocks: {
        dashboard: dashboardBlock,
        settings: settingsBlock
    },
    functions: {
        current_page: $ => router($.url),
        ui: $ => $.current_page === 'dashboard'
            ? $.dashboard.html
            : $.settings.html
    }
});
```

**Every level is the same abstraction: inputs → computation → outputs.**

---

## Part 8: Block Metadata and Profiling

### Rich Block Metadata

```javascript
interface BlockMetadata {
    // Identity
    id: string;
    name: string;
    version: string;

    // Structure
    inputs: InputSpec[];
    outputs: OutputSpec[];
    internalVariables: string[];
    subBlocks: string[];

    // Dependencies
    graph: {
        nodes: string[];
        edges: [string, string][];
        depth: number;
        cycles: string[][];  // If any
    };

    // Execution history
    executions: ExecutionRecord[];

    // Statistics
    stats: {
        totalExecutions: number;
        averageDuration: number;
        minDuration: number;
        maxDuration: number;

        cacheHitRate: number;

        // By sub-component
        functionStats: Record<string, FunctionStats>;
        subBlockStats: Record<string, BlockStats>;

        // Async operations
        totalPromises: number;
        averagePromiseDuration: number;
    };

    // Current state
    state: {
        inputValues: Record<string, any>;
        outputValues: Record<string, any>;
        pendingPromises: number;
        staleFunctions: string[];
    };
}
```

### Profiling API

```javascript
// Get block metadata
const meta = chartBlock.metadata;

console.log(`Chart block has ${meta.stats.totalExecutions} executions`);
console.log(`Average duration: ${meta.stats.averageDuration}ms`);
console.log(`Cache hit rate: ${meta.stats.cacheHitRate}%`);

// Find bottlenecks
const bottleneck = Object.entries(meta.stats.functionStats)
    .sort((a, b) => b[1].averageDuration - a[1].averageDuration)[0];
console.log(`Slowest function: ${bottleneck[0]} (${bottleneck[1].averageDuration}ms)`);

// Visualize execution
chartBlock.visualize();  // Renders graph with execution stats

// Export for analysis
chartBlock.exportStats('./chart-block-stats.json');
```

---

## Part 9: Implementation Architecture

### Block as First-Class Entity

```javascript
class Block {
    constructor(config) {
        this.id = generateId();
        this.name = config.name;
        this.inputs = config.inputs;
        this.outputs = config.outputs;

        // Build internal graph
        this.graph = new DependencyGraph();
        this.functions = config.functions;
        this.subBlocks = config.subBlocks || {};

        // Wire it up
        this.wire(config.wiring);

        // Create resolver
        this.resolver = new Resolver(this.graph, this.getAllFunctions());

        // Initialize stats
        this.stats = new BlockStats();
        this.metadata = new BlockMetadata(this);

        // Track executions
        this.resolver.on('execute', (execution) => {
            this.stats.recordExecution(execution);
            this.metadata.addExecution(execution);
        });
    }

    execute(inputs) {
        const start = performance.now();

        // Set inputs
        for (let [name, value] of Object.entries(inputs)) {
            this.resolver.set(name, value);
        }

        // Get outputs
        const outputs = {};
        for (let name of this.outputs) {
            outputs[name] = this.resolver.get(name);
        }

        const duration = performance.now() - start;
        this.stats.totalExecutions++;
        this.stats.recordDuration(duration);

        return outputs;
    }

    getAllFunctions() {
        // Merge own functions with sub-block functions
        const all = { ...this.functions };

        for (let [name, block] of Object.entries(this.subBlocks)) {
            for (let [fnName, fn] of Object.entries(block.functions)) {
                all[`${name}.${fnName}`] = fn;
            }
        }

        return all;
    }

    wire(wiring) {
        // Connect inputs to internal functions
        // Connect internal functions to outputs
        // Connect sub-blocks
        // ...
    }

    // Inspection API
    inspect() {
        return {
            structure: {
                inputs: this.inputs,
                outputs: this.outputs,
                functions: Object.keys(this.functions),
                subBlocks: Object.keys(this.subBlocks)
            },
            stats: this.stats,
            graph: this.graph.serialize(),
            state: {
                inputValues: this.getInputValues(),
                outputValues: this.getOutputValues(),
                pendingPromises: this.countPendingPromises()
            }
        };
    }
}
```

### Using Blocks

```javascript
// Define a block
const chartBlock = new Block({
    name: 'chart',
    inputs: ['url', 'data'],
    outputs: ['svg', 'interactive'],

    functions: {
        parsed_url: $ => parseURL($.url),
        dataset_name: $ => $.parsed_url.get('dataset'),
        filtered_data: $ => $.data.filter(d => d.name === $.dataset_name),
        svg: $ => renderChart($.filtered_data),
        interactive: $ => buildInteractive($.filtered_data)
    }
});

// Execute it
const result = chartBlock.execute({
    url: 'http://example.com?dataset=shrimp',
    data: shrimpData
});

// Inspect it
console.log(chartBlock.stats);
console.log(chartBlock.metadata.graph.depth);  // How deep is the dependency chain?
console.log(chartBlock.state.pendingPromises);  // Any async in progress?

// Use in larger block
const dashboardBlock = new Block({
    name: 'dashboard',
    inputs: ['url'],
    outputs: ['html'],

    subBlocks: {
        chart: chartBlock  // Compose!
    },

    functions: {
        html: $ => `<div>${$.chart.svg}</div>`
    }
});
```

---

## Part 10: The Vision

### Blocks v2 Architecture

```
Everything is a Block
├── Functions are atomic blocks (1 input → 1 output)
├── Features are composite blocks (N inputs → M outputs)
├── Pages are layout blocks (composing feature blocks)
└── Apps are routing blocks (composing page blocks)

Every Block Has:
├── Clear inputs/outputs (testable boundary)
├── Execution statistics (observable)
├── Dependency graph (visualizable)
├── Cache strategy (optimizable)
└── Metadata (debuggable)

Blocks Compose:
├── Blocks within blocks (recursive)
├── Wiring between blocks (explicit)
├── Statistics aggregate (bottom-up)
└── Testing at any level (compositional)
```

### Benefits

**1. Testability**
- Test any block in isolation
- Clear inputs/outputs
- No global state
- Deterministic

**2. Observability**
- Statistics at every level
- Execution history
- Performance profiling
- State inspection

**3. Composability**
- Blocks compose naturally
- Can reuse across apps
- Can version independently
- Can test independently

**4. Debuggability**
- Inspect any block
- Query execution history
- Visualize dependencies
- Compare versions

**5. Performance**
- Profile at any granularity
- Identify bottlenecks
- Optimize hot paths
- Track over time

---

## Conclusion: The Unified Model

**Everything is a block.**

- A constant is a block with no inputs
- A function is a block with one function
- A feature is a block with multiple functions
- A sub-block is a block within a block
- An app is a block of blocks

**Every block has the same interface:**
- Inputs (boundary)
- Outputs (boundary)
- Execute (behavior)
- Stats (metrics)
- Metadata (introspection)

**This is the next evolution:**

Blocks v1: Graph of functions with resolver
Blocks v2: Hierarchical blocks with statistics, all the way down

**The abstraction is:**
- Simple (one concept: blocks)
- Recursive (blocks in blocks)
- Observable (statistics at every level)
- Testable (clear boundaries)
- Composable (plug blocks together)

This is reactive state management **as a composable component model**.

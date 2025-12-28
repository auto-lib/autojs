# Blocks: Modular Reactivity with Diff-Driven Testing

**Status**: Initial implementation complete - ready for testing and iteration

## Implementation Status

✅ **Core Infrastructure** (from auto4):
- `kernel.js` - Policy-based intent router (immediate, deferred, dispatch, drop)
- `graph.js` - Reactive handlers (get, set, run, define, invalidate, check_circle)
- `block.js` - Block composition with needs/gives interfaces, wiring, autoWire

✅ **Graph Analysis** (from graph-first):
- `directed-graph.js` - Pure directed graph data structure with topological sort, cycle detection, GraphViz export

✅ **New Features** (blocks kernel):
- `diff.js` - Multi-level diffing (values, objects, arrays, graphs, blocks)
- `cross-block-graph.js` - Unified dependency graph across multiple blocks
- `test-framework.js` - URL + data + code + chart test structure with diff-driven analysis

✅ **Examples**:
- `test-basic.js` - Simple verification tests
- `example.js` - Full diff-driven testing workflow with price charting

### Running

```bash
cd kernels/blocks

# Basic tests - verify core functionality
npm run test:basic

# Full example - diff-driven testing with blocks
npm run test:example
```

## Core Insight

Testing reactive systems should mirror how developers think about change: **what inputs changed, what code changed, what outputs changed**. By treating reactive computations as **modular blocks** with explicit inputs/outputs, we can diff at every layer to understand causality.

The fundamental shift: **reactivity as composable transformation pipelines** where each block is independently testable, and cross-block changes are traceable through graph analysis.

## Philosophy

### The Testing Problem

Current auto.js testing validates behavior but provides limited insight into *why* things changed:
- Tests compare final state (`$.msg === "expected"`)
- Hard to debug: which variable change caused which output change?
- No visibility into intermediate steps in complex propagations
- Difficult to isolate which part of code caused a bug

### The Blocks Solution

Treat reactive systems as **visual transformation pipelines**:

```
┌─────┐    ┌──────┐    ┌───────┐
│ URL │───▶│ Data │───▶│ Chart │
└─────┘    └──────┘    └───────┘
                │
                ▼
           ┌────────┐
           │  Code  │
           │(Blocks)│
           └────────┘
```

**Four-Part Test Structure**:
1. **URL** - External data source (API endpoint, file, static data)
2. **Data** - Input values loaded from URL
3. **Code** - Reactive computation (one or more blocks)
4. **Chart** - Output visualization or data structure

**Diff-Driven Workflow**:
```
Test 1: URL + Data → Code → Chart₁
Test 2: URL + Data → Code' → Chart₂   (code changed)
                           ↓
                    Chart₁ ⟷ Chart₂
                           ↓
                    Which blocks changed?
                    Which variables changed?
                    Which dependencies changed?
```

### Key Principles

**1. Graph Invariant**
- Same inputs → same outputs (deterministic)
- Pure reactive transformations
- Enables reliable diffing and replay

**2. Block Composition**
- Code split into modular blocks/boxes
- Each block has clear inputs and outputs
- Blocks can be tested in isolation
- Blocks compose into larger systems

**3. Cross-Block Graphs**
- Dependency graphs span block boundaries
- Variables in one block can depend on variables in another
- Graph topology is explicit and queryable

**4. Signals as Connectors**
- Signals wire blocks together
- Clear data flow between modules
- Alternative to implicit reactive dependencies?

**5. Diff-Driven Debugging**
- Work backwards from chart diffs (which outputs changed?)
- Work forwards through code (which blocks/variables triggered changes?)
- Visual diff at every layer (graph diff, data diff, output diff)

## Architecture

### 1. Block Structure

Each block is a self-contained reactive unit:

```javascript
let block = {
    name: 'data-processor',
    inputs: ['url', 'params'],      // External inputs
    outputs: ['processed', 'count'], // Exported values
    code: {
        raw: ($) => fetch($.url, $.params),
        processed: ($) => JSON.parse($.raw),
        count: ($) => $.processed.length
    }
}
```

### 2. Block Composition

Blocks wire together via signals or explicit connections:

```javascript
// Option A: Signal-based
let pipeline = blocks([
    fetchBlock,        // outputs: { data }
    processBlock,      // inputs: { data }, outputs: { results }
    chartBlock         // inputs: { results }, outputs: { chart }
]);

// Option B: Explicit wiring
let system = {
    fetch: auto(fetchBlock.code),
    process: auto(processBlock.code),
    chart: auto(chartBlock.code)
};

// Wire: fetch.data → process.data
signal(system.fetch, 'data', system.process, 'data');
```

### 3. Cross-Block Graph

The dependency graph spans all blocks:

```javascript
let graph = pipeline.getGraph();
// {
//   nodes: ['fetch.data', 'process.results', 'chart.svg'],
//   edges: [
//     { from: 'fetch.data', to: 'process.results' },
//     { from: 'process.results', to: 'chart.svg' }
//   ],
//   blocks: {
//     'fetch': ['fetch.data'],
//     'process': ['process.results'],
//     'chart': ['chart.svg']
//   }
// }
```

### 4. Diff Analysis

Track changes at multiple levels:

```javascript
// Test structure
let test = {
    url: 'http://api.example.com/data',
    data: null,  // loaded from url
    code: [fetchBlock, processBlock, chartBlock],
    chart: null  // computed output
};

// Run test
let result1 = runTest(test);
let result2 = runTest({ ...test, code: modifiedCode });

// Diff everything
let diff = {
    chart: diffCharts(result1.chart, result2.chart),
    data: diffData(result1.data, result2.data),
    graph: diffGraphs(result1.graph, result2.graph),
    blocks: diffBlocks(result1.blocks, result2.blocks)
};

// Trace causality
diff.trace = traceCausality(diff);
// {
//   chartChange: { svg: { color: 'red' → 'blue' } },
//   causedBy: {
//     block: 'chart',
//     variable: 'color',
//     triggeredBy: ['process.theme']
//   }
// }
```

## Open Questions

### 1. Block Boundaries

**Question**: How to decide what goes in a block?
- By feature? (auth block, data block, UI block)
- By layer? (fetch, transform, render)
- By change frequency? (static config vs dynamic state)

**Exploration needed**:
- Guidelines for splitting code into blocks
- When to use one block vs many
- Performance implications of granularity

### 2. Cross-Block Dependencies

**Question**: How are graphs represented across blocks?
- Flat namespace? (`block1.var` depends on `block2.var`)
- Hierarchical? (`blocks.block1.var`)
- Separate graph per block with inter-block edges?

**Exploration needed**:
- Syntax for cross-block references
- How to prevent circular dependencies across blocks
- How to visualize multi-block graphs

### 3. Signals vs Dependencies

**Question**: What role do signals play?
- Are signals an *alternative* to reactive dependencies?
- Are signals a *transport* layer between blocks?
- Do signals replace the dependency graph or complement it?

**Exploration needed**:
- When to use signals vs reactive deps
- Can signals and reactivity coexist in the same system?
- Performance and clarity tradeoffs

### 4. Testing Granularity

**Question**: What gets tested?
- Individual blocks in isolation?
- Entire pipelines end-to-end?
- Specific dependency paths?

**Exploration needed**:
- Test structure for block-level tests
- How to mock block inputs/outputs
- Integration tests vs unit tests for blocks

### 5. Diff Visualization

**Question**: How to present diffs effectively?
- Text diff of output data?
- Visual diff of charts/graphs?
- Dependency graph diff (which edges changed)?
- Line-by-line code diff?

**Exploration needed**:
- UI/tools for visualizing diffs at each layer
- How to link chart diffs back to code changes
- Automated causality analysis

## Implementation Path

### Phase 1: Block Structure (Design)
- [ ] Define block schema (inputs, outputs, code, metadata)
- [ ] Implement `auto(block)` that creates reactive system from block
- [ ] Test: single block with inputs/outputs

### Phase 2: Block Composition (Integration)
- [ ] Implement block wiring (explicit connections)
- [ ] Cross-block variable references
- [ ] Test: two blocks connected, data flows correctly

### Phase 3: Graph Analysis (Introspection)
- [ ] Build unified graph from multiple blocks
- [ ] Query API: `getBlockFor(variable)`, `getCrossBlockDeps()`
- [ ] Test: verify graph structure matches expectations

### Phase 4: Signals Integration (Optional)
- [ ] Explore signal-based block connections
- [ ] Compare signals vs reactive deps for block wiring
- [ ] Test: same system with signals vs deps

### Phase 5: Diff Infrastructure (Testing)
- [ ] Implement chart diffing
- [ ] Implement graph diffing
- [ ] Implement block diffing (which block's code changed)
- [ ] Test: diff detects expected changes

### Phase 6: Causality Tracing (Debugging)
- [ ] Trace from chart diff back to triggering code change
- [ ] Trace from code change forward to affected outputs
- [ ] Test: causality correctly identifies root cause

### Phase 7: Test Framework (Integration)
- [ ] Define test file format (URL + data + code + expected chart)
- [ ] Implement test runner with diff reporting
- [ ] Test: run suite, generate diff reports

## Benefits

**For Testing**:
- Understand *why* tests fail (which block, which variable)
- Visual diffs show exactly what changed in output
- Replay tests with different data/code to isolate issues

**For Debugging**:
- Trace causality: chart change → variable → block → code
- Test blocks in isolation
- Visualize cross-block dependencies

**For Architecture**:
- Modular code organization (blocks are units of composition)
- Clear interfaces (explicit inputs/outputs)
- Easier refactoring (move logic between blocks)

**For Users**:
- Simpler mental model (pipeline of transformations)
- Better error messages (which block failed?)
- Composable abstractions (reuse blocks across projects)

## Tradeoffs

**Complexity**:
- More structure to define (blocks, inputs, outputs)
- Need to think about block boundaries upfront
- Potentially more boilerplate

**Performance**:
- Cross-block wiring may add overhead
- Graph analysis and diffing has computational cost
- More bookkeeping for multi-block systems

**Learning Curve**:
- Users need to understand blocks concept
- More complex than simple `auto({ ... })`
- When to use blocks vs flat reactive objects?

## Relationship to Other Kernels

**graph-first**: Shares focus on explicit, queryable graphs. Blocks extends this to *modular* graphs spanning multiple units.

**channel**: Shares signal-based communication. Blocks might use signals to wire blocks, but also explores reactive dependencies.

**auto4**: Shares chart-centric philosophy. Blocks makes chart diffing and causality tracing first-class.

## Questions for Exploration

1. **Granularity**: How small should blocks be? One block per feature? Per layer?
2. **Signals**: Do signals replace reactive deps or complement them?
3. **Graph spanning**: How to represent cross-block dependency graphs clearly?
4. **Diff presentation**: What's the most useful way to show diffs (text, visual, graph)?
5. **Testing workflow**: Should every test define URL + data + code + chart? Or simpler for unit tests?
6. **Causality**: Can we automatically trace chart changes back to code changes?
7. **Composition patterns**: What are common patterns for wiring blocks? Best practices?

## Next Steps

1. **Prototype single block** - Implement basic block structure and test it
2. **Prototype block wiring** - Connect two blocks, verify data flows
3. **Build cross-block graph** - Unified graph representation spanning blocks
4. **Implement basic diffing** - Diff charts, show what changed
5. **Trace causality** - Link chart diff to triggering code change
6. **Design test format** - Define structure for URL/data/code/chart tests
7. **Evaluate**: Does this solve real problems? Is it simpler or more complex?

## Files

```
kernels/blocks/
├── README.md                       # This file
├── package.json                    # NPM scripts
├── example.js                      # Full diff-driven testing example
├── test-basic.js                   # Basic verification tests
└── src/
    ├── kernel.js                   # Policy-based intent router (from auto4)
    ├── graph.js                    # Reactive handlers (from auto4)
    ├── block.js                    # Block composition (from auto4)
    ├── directed-graph.js           # Pure graph data structure (from graph-first)
    ├── diff.js                     # Multi-level diffing (NEW)
    ├── cross-block-graph.js        # Unified cross-block graph (NEW)
    └── test-framework.js           # URL/data/code/chart tests (NEW)
```

---

**Key Insight**: Reactive systems are transformation pipelines. By making blocks, graphs, and diffs explicit, we can understand change at every layer and build systems that are easier to test, debug, and reason about.

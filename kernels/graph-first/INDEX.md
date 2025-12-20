# Graph-First Kernel Documentation

Complete documentation for the graph-first architecture exploration.

## Start Here

If you're new to this kernel, read in this order:

1. **[INSIGHT.md](INSIGHT.md)** - Why does Auto.js exist? What is it for?
2. **[README.md](README.md)** - Overview of the graph-first approach
3. **[THREE-LAYERS.md](THREE-LAYERS.md)** - ⭐ **The correct architecture: three independent layers**
4. **[LAYERED-IMPLEMENTATION.md](LAYERED-IMPLEMENTATION.md)** - ⭐ **Complete working implementation**
5. **[docs/MIGRATION-GUIDE.md](docs/MIGRATION-GUIDE.md)** - ⭐ **How to migrate from current Auto.js**
6. **[docs/STRATEGY-GUIDE.md](docs/STRATEGY-GUIDE.md)** - ⭐ **Choosing dependency tracking strategies**
7. **[WHAT-IS-DIFFERENT.md](WHAT-IS-DIFFERENT.md)** - Current Auto.js IS a graph too! So what's different?
8. **[DETAILED-COMPARISON.md](DETAILED-COMPARISON.md)** - Deep dive into how current Auto.js actually works vs graph-first
9. **[docs/SIDE-BY-SIDE.md](docs/SIDE-BY-SIDE.md)** - Same code in both architectures
10. **[COMPARISON.md](COMPARISON.md)** - Side-by-side complexity comparison

## Practical Guides

Once you understand the architecture:

11. **[docs/MIGRATION-GUIDE.md](docs/MIGRATION-GUIDE.md)** - ⭐ **Converting existing Auto.js code**
    - API compatibility guide
    - Step-by-step migration process
    - Common issues and solutions
    - Test conversion examples

12. **[docs/STRATEGY-GUIDE.md](docs/STRATEGY-GUIDE.md)** - ⭐ **Choosing the right strategy**
    - Static Analysis vs Runtime Tracking vs Explicit
    - Decision tree and comparison table
    - Real-world examples
    - Common mistakes to avoid

13. **[docs/SIDE-BY-SIDE.md](docs/SIDE-BY-SIDE.md)** - ⭐ **Direct comparison**
    - Same code in both architectures
    - What happens under the hood
    - Performance characteristics
    - Feature comparison table

## Deep Dive

For technical deep dives:

14. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete technical walkthrough (original version)
   - Core components explained
   - Step-by-step initialization flow
   - Step-by-step update flow
   - Dynamic dependency problem and solutions
   - Alternative graph-centered architectures

15. **[DYNAMIC-DEPENDENCIES.md](DYNAMIC-DEPENDENCIES.md)** - ⭐ **Solving the dynamic dependency problem**
   - **The core question**: If the graph is built once, how do we handle conditional dependencies?
   - **Three strategies** with implementations:
     - Static Analysis (conservative, simple)
     - Runtime Tracking (precise, complex)
     - Explicit Dependencies (manual, exact)
   - **Comparison and recommendation**
   - **[ANSWER.md](ANSWER.md)** - Quick answer version
   - **[QUICKSTART.md](QUICKSTART.md)** - Run the demos
   - Working code examples in `src/`

16. **[VISUAL-GUIDE.md](VISUAL-GUIDE.md)** - Diagrams and visual explanations (original version)
   - Layer diagrams
   - Graph structure visualizations
   - Flow diagrams for initialization and updates
   - Comparison diagrams

## Code

**Three-Layer Implementation (RECOMMENDED):**

17. **[src/layer1-graph.js](src/layer1-graph.js)** - Pure DirectedGraph (~270 lines)
    - Generic graph data structure
    - No Auto.js knowledge
    - Reusable for anything
    - Run demo: `node example-layered.js`

18. **[src/layer2-graph-builder.js](src/layer2-graph-builder.js)** - Graph builders (~230 lines)
    - StaticAnalysisBuilder (parse source)
    - RuntimeTrackingBuilder (proxy tracking)
    - ExplicitBuilder (user declaration)
    - Strategies are swappable

19. **[src/layer3-reactive.js](src/layer3-reactive.js)** - ReactiveSystem (~120 lines)
    - Uses any DirectedGraph
    - Manages values and dirty tracking
    - Decoupled from graph building

20. **[src/auto-layered.js](src/auto-layered.js)** - High-level API (~100 lines)
    - Ties layers together
    - `auto()`, `auto.static()`, `auto.runtime()`, `auto.explicit()`
    - **This is the recommended implementation**

**Original Implementation:**

21. **[src/graph-first.js](src/graph-first.js)** - Original monolithic version (~300 lines)
    - ReactiveGraph class (immutable structure)
    - GraphState class (mutable values)
    - Auto API function (proxy wrapper)

22. **[src/static-analysis.js](src/static-analysis.js)** - Strategy 1: Static dependency discovery
    - Parse function source to find all `$.property` accesses
    - Conservative but correct
    - Run demo: `node src/static-analysis.js`

23. **[src/runtime-tracking.js](src/runtime-tracking.js)** - Strategy 2: Runtime tracking
    - Track actual dependencies during execution
    - Graph becomes mutable but precise
    - Run demo: `node src/runtime-tracking.js`

24. **[src/explicit-deps.js](src/explicit-deps.js)** - Strategy 3: Explicit dependencies
    - User declares dependencies manually
    - Like React's `useEffect` deps array
    - Run demo: `node src/explicit-deps.js`

**Examples and Tests:**

25. **[example-layered.js](example-layered.js)** - ⭐ **Three-layer demo**
    - Shows each layer independently
    - Shows them working together
    - Run with: `node example-layered.js`

26. **[tests/test-layers.js](tests/test-layers.js)** - ⭐ **Three-layer tests**
    - 22 tests covering all layers
    - Tests each layer independently
    - All pass ✓
    - Run with: `node tests/test-layers.js`

27. **[example.js](example.js)** - Original demo
    - Basic usage
    - Graph introspection
    - Visualization

28. **[tests/basic.test.js](tests/basic.test.js)** - Original test suite
    - 15 tests covering core functionality
    - Run with: `node tests/basic.test.js`

29. **[tests/compare-strategies.test.js](tests/compare-strategies.test.js)** - Strategy comparison
    - Side-by-side demonstration of all three approaches
    - Shows trade-offs clearly
    - Run with: `node tests/compare-strategies.test.js`

## Quick Start

### Recommended: Three-Layer Implementation

```bash
# Run the demo
node example-layered.js

# Run tests (22 tests, all pass ✓)
node tests/test-layers.js

# Use in your code
import auto from './src/auto-layered.js';

// Default: static analysis
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => `Got ${$.count} items`
});

$.data = [1, 2, 3];
console.log($.msg);  // "Got 3 items"

// Introspect
console.log($._.deps);        // { count: ['data'], msg: ['count'] }
console.log($._.order);       // ['data', 'count', 'msg']
console.log($.visualize());   // GraphViz DOT

// Use different strategies
import { computed } from './src/auto-layered.js';

const $1 = auto.static(definition);
const $2 = auto.runtime(definition);
const $3 = auto.explicit({
    a: 1,
    b: 2,
    sum: computed(['a', 'b'], ($) => $.a + $.b)
});
```

### Original Implementation

```bash
# Run the example
node example.js

# Run tests
node tests/basic.test.js

# Use in your code
import auto from './src/graph-first.js';
```

## Key Concepts

### The Graph IS the Thing

This kernel inverts the traditional approach:

**Traditional**: Propagation is primary, graph is implicit
**Graph-First**: Graph is primary, propagation uses it

### Three Layers

1. **ReactiveGraph** - Immutable structure (nodes, edges, order)
2. **GraphState** - Mutable values (values, dirty flags)
3. **Auto API** - Familiar $ interface

### Build Once, Use Many

- Graph structure computed at creation
- Never rediscovered or rebuilt
- Updates just walk pre-computed structures

## What Problems Does This Solve?

### Readability
```javascript
// See the whole graph
console.log($._.graph.edges)
$._.graph.getDependents('data')
```

### Testability
```javascript
// Assert on structure
assert.deepEqual($._.order, ['count', 'msg'])
```

### Debuggability
```javascript
// Visualize it
console.log($.visualize())  // GraphViz format
```

### Maintainability
- 300 lines vs 941
- Clean separation of concerns
- Immutable graph = fewer bugs

## The Core Insight

Auto.js is fundamentally about **pure data transformation** for visualization:

- **Static graph** - topology doesn't change
- **Pure functions** - no side effects
- **Declarative** - describe relationships, not procedures

When the graph IS the program, make it first-class!

## Questions This Explores

1. **What if we built Auto.js around the graph instead of propagation?**
   - Result: Simpler, clearer, more maintainable

2. **What if we separated structure from state?**
   - Result: Graph immutable, easy to reason about

3. **What if we made the graph queryable and visualizable?**
   - Result: Debugging becomes inspection

4. **What if we computed graph structure once instead of repeatedly?**
   - Result: Fewer edge cases, less complexity

## Trade-offs

**Current Auto.js:**
- ✓ Perfect dynamic dependency tracking
- ✓ Highly optimized execution
- ✗ Graph structure hidden
- ✗ 941 lines, 50+ variables
- ✗ Complex debugging needed

**Graph-First:**
- ✓ Graph structure explicit
- ✓ ~300 lines, 3 classes
- ✓ Simple debugging
- ✗ Conservative dependency tracking
- ✗ Slightly less optimized

## For Your Use Case (Visualization)

Graph-first is ideal because:
- Graph topology IS static (view transformations)
- Clarity matters more than micro-optimizations
- The graph itself is valuable to inspect
- Pure transformations are easy to recompute

## Next Steps

### To Experiment

1. Try different examples in `example.js`
2. Add tests for your use cases
3. Compare with current Auto.js behavior
4. Explore the graph query methods

### To Extend

1. Add subscription support (see TODOs in code)
2. Implement deep_equal for objects
3. Add static analysis for dependencies
4. Build visualization tools

### To Evaluate

1. Does this make Auto.js easier to understand?
2. Does the graph introspection help debugging?
3. Is conservative dependency tracking acceptable?
4. Should this replace the current implementation?

## Philosophy

**Current Auto.js**: "A reactive library that happens to form a graph"

**Graph-First**: "A graph library that happens to be reactive"

The shift in perspective leads to different architecture.

## Contributing

This is an experimental kernel. Feel free to:
- Modify the implementation
- Add features
- Write more tests
- Try different approaches

The goal is exploration, not production code (yet).

## Files Overview

```
kernels/graph-first/
├── INDEX.md              ← You are here
├── README.md             ← Start here for overview
├── INSIGHT.md            ← Why Auto.js exists
├── COMPARISON.md         ← Current vs graph-first
├── ARCHITECTURE.md       ← Deep technical dive
├── VISUAL-GUIDE.md       ← Diagrams and flows
├── src/
│   └── graph-first.js    ← Implementation
├── tests/
│   └── basic.test.js     ← Test suite
└── example.js            ← Working demo
```

## Further Reading

See also:
- `/docs/ARCHITECTURE.md` - Current Auto.js architecture
- `/kernels/README.md` - Overview of all kernels
- `/tests/` - Full test suite for current Auto.js

## Questions?

The documentation tries to answer:
- How does it work? → **ARCHITECTURE.md**
- Why this approach? → **INSIGHT.md**
- What's different? → **COMPARISON.md**
- How does data flow? → **VISUAL-GUIDE.md**

If you have other questions, they probably point to gaps in documentation or architecture worth exploring!

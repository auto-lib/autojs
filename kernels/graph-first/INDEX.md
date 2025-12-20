# Graph-First Kernel Documentation

Complete documentation for the graph-first architecture exploration.

## Start Here

If you're new to this kernel, read in this order:

1. **[INSIGHT.md](INSIGHT.md)** - Why does Auto.js exist? What is it for?
2. **[README.md](README.md)** - Overview of the graph-first approach
3. **[COMPARISON.md](COMPARISON.md)** - How is this different from current Auto.js?

## Deep Dive

Once you understand the concept:

4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete technical walkthrough
   - Core components explained
   - Step-by-step initialization flow
   - Step-by-step update flow
   - Dynamic dependency problem and solutions
   - Alternative graph-centered architectures

5. **[VISUAL-GUIDE.md](VISUAL-GUIDE.md)** - Diagrams and visual explanations
   - Layer diagrams
   - Graph structure visualizations
   - Flow diagrams for initialization and updates
   - Comparison diagrams

## Code

6. **[src/graph-first.js](src/graph-first.js)** - The implementation (~300 lines)
   - ReactiveGraph class (immutable structure)
   - GraphState class (mutable values)
   - Auto API function (proxy wrapper)

7. **[example.js](example.js)** - Working demonstration
   - Basic usage
   - Graph introspection
   - Visualization

8. **[tests/basic.test.js](tests/basic.test.js)** - Test suite
   - 15 tests covering core functionality
   - Run with: `node tests/basic.test.js`

## Quick Start

```bash
# Run the example
node example.js

# Run tests
node tests/basic.test.js

# Use in your code
import auto from './src/graph-first.js';

let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => `Got ${$.count} items`
});

// Inspect the graph
console.log($._.graph.edges);
console.log($._.order);
console.log($.visualize());
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

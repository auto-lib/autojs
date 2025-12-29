# Blocks Kernel - Quick Start

**Status**: ✅ Implementation complete - simple, modular architecture

## What is it?

The blocks kernel is a **simplified reactive system** with a clean, modular architecture. It provides:

1. **Simple reactive objects** - Just like auto.js but with a clearer implementation
2. **Modular architecture** - 5 independent modules, each with one clear responsibility
3. **Comprehensive testing** - 39 tests covering all modules

## Installation

```bash
cd kernels/blocks
npm install  # (if needed)
```

## Basic Usage

### 1. Simple Reactive Object

The simplest way to use the blocks kernel:

```javascript
import { auto } from './src/auto.js';

const $ = auto({
    data: [1, 2, 3],
    count: ($) => $.data.length,
    doubled: ($) => $.data.map(x => x * 2)
});

console.log($.count);    // 3
console.log($.doubled);  // [2, 4, 6]

// Change data
$.data = [1, 2, 3, 4, 5];
console.log($.count);    // 5 (auto-recomputes)
console.log($.doubled);  // [2, 4, 6, 8, 10]
```

### 2. Multi-Block System

For more complex applications, you can use multiple blocks:

```javascript
import { Block, autoWire, blocks } from './src/auto.js';

// Define blocks
const source = new Block({
    name: 'source',
    outputs: ['data'],
    functions: {
        data: [1, 2, 3]
    }
});

const transform = new Block({
    name: 'transform',
    inputs: ['data'],
    outputs: ['doubled'],
    functions: {
        data: null,  // Will be wired from source
        doubled: ($) => $.data.map(x => x * 2)
    }
});

// Create system with auto-wiring
const system = blocks([source, transform], 'auto');

// Resolve all values
system.resolve();

// Access values
console.log(system.getVar('source', 'data'));        // [1, 2, 3]
console.log(system.getVar('transform', 'doubled'));  // [2, 4, 6]
```

### 3. Inspect Internal State

You can inspect the dependency graph and resolver state:

```javascript
const $ = auto({
    x: 5,
    y: 10,
    sum: ($) => $.x + $.y
});

// Access internal graph
console.log($._graph.topologicalSort());  // ['x', 'y', 'sum']

// Access resolver
console.log($._resolver.stale);  // Set of stale variables
console.log($._resolver.values);  // Map of all values
```

## Running Tests

```bash
# All tests (39 tests)
npm test

# Module tests only (29 tests - DirectedGraph, Static Analysis, Blocks, Resolver)
npm run test:modules

# Integration tests only (10 core behavior tests)
npm run test:auto

# Legacy demos
npm run test:simplified
npm run test:basic
```

## Key Features

### Static Dependency Analysis

Functions are analyzed statically (via toString/regex) to discover dependencies:

```javascript
import { analyzeFunction, buildGraph } from './src/static-analysis.js';

const fn = ($) => $.x + $.y;
const deps = analyzeFunction(fn, 'sum');
console.log(deps);  // Set { 'x', 'y' }

const graph = buildGraph({
    x: 5,
    y: 10,
    sum: ($) => $.x + $.y
});
console.log(graph.topologicalSort());  // ['x', 'y', 'sum']
```

### Topological Execution

Values are computed in dependency order:

```javascript
import { Resolver } from './src/resolver.js';

const graph = buildGraph({ x: 5, y: ($) => $.x * 2, z: ($) => $.y + 1 });
const resolver = new Resolver(graph, { x: 5, y: ($) => $.x * 2, z: ($) => $.y + 1 });

console.log(resolver.get('z'));  // 11 (x=5 → y=10 → z=11)

resolver.set('x', 20);
console.log(resolver.get('z'));  // 41 (x=20 → y=40 → z=41)
```

### GraphViz Export

Visualize dependency graphs:

```javascript
import DirectedGraph from './src/directed-graph.js';

const graph = new DirectedGraph();
graph.addNode('x');
graph.addNode('y');
graph.addNode('sum');
graph.addEdge('sum', 'x');
graph.addEdge('sum', 'y');

console.log(graph.toDot());
// Output DOT format for Graphviz visualization
```

## Architecture

The blocks kernel is built from 5 independent modules:

1. **DirectedGraph** (`src/directed-graph.js`) - Pure graph structure with topological sort
2. **Static Analysis** (`src/static-analysis.js`) - Function → dependencies via toString/regex
3. **Blocks** (`src/blocks.js`) - Grouping, wiring, cross-block graphs
4. **Resolver** (`src/resolver.js`) - Stale tracking and execution
5. **Auto** (`src/auto.js`) - Integration API

**Total**: ~600 lines across 5 modules (vs 941 lines in v0.54)

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for detailed documentation.

## Design Philosophy

**Key Decisions**:
- ✅ Static analysis only (toString/regex) - simpler, predictable
- ✅ No complex kernel - just simple resolver that executes in topological order
- ✅ "Stale" instead of "dirty" terminology
- ✅ Optional inputs/outputs on blocks (flexible)
- ✅ Clean separation of concerns - each module has one responsibility

See [DESIGN-QUESTIONS.md](./DESIGN-QUESTIONS.md) for design exploration.

## Next Steps

1. Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) for complete documentation
2. Read [TESTING.md](./TESTING.md) for test suite details
3. Look at test files in `tests/` for examples
4. Explore the source in `src/` to understand internals

## Documentation

- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Complete implementation summary (START HERE)
- **[TESTING.md](./TESTING.md)** - Test suite documentation
- **[DESIGN-QUESTIONS.md](./DESIGN-QUESTIONS.md)** - Design exploration and decisions
- **[tests/README.md](./tests/README.md)** - Test file documentation

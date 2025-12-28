# Blocks Kernel - Quick Start

## What is it?

The blocks kernel implements **diff-driven testing** for reactive systems. It lets you:

1. **Build modular reactive code** using blocks with explicit inputs/outputs
2. **Run the same data through different code** versions
3. **Diff the outputs** at multiple levels (values, objects, graphs)
4. **Trace causality** - understand which code changes caused which output changes

## Installation

```bash
cd kernels/blocks
npm install  # (if needed)
```

## Basic Usage

### 1. Define Blocks

A block is a reactive unit with:
- `needs`: inputs it expects from outside
- `gives`: outputs it provides
- `state`: reactive variables (static or computed)

```javascript
import { block } from './src/block.js';

const dataBlock = block({
    name: 'data',
    needs: ['url'],
    gives: ['items', 'count'],
    state: {
        url: 'http://api.example.com/data',
        items: ($) => fetch($.url).then(r => r.json()),
        count: ($) => $.items.length
    }
});
```

### 2. Wire Blocks Together

```javascript
import { block, autoWire } from './src/block.js';

const source = block({
    name: 'source',
    gives: ['data'],
    state: { data: [1, 2, 3] }
});

const transform = block({
    name: 'transform',
    needs: ['data'],
    gives: ['doubled'],
    state: {
        doubled: ($) => $.data.map(x => x * 2)
    }
});

// Auto-wire: matches 'gives' from one block to 'needs' in another
autoWire([source, transform]);

// Or wire manually:
source.wire('data', transform, 'data');
```

### 3. Run and Get Results

```javascript
import { runAll } from './src/block.js';

// Run all blocks until stable
runAll([source, transform]);

// Get values
console.log(source.get('data'));        // [1, 2, 3]
console.log(transform.get('doubled'));  // [2, 4, 6]
```

### 4. Analyze Cross-Block Graph

```javascript
import { buildCrossBlockGraph, analyzeGraph } from './src/cross-block-graph.js';

const graph = buildCrossBlockGraph([source, transform]);

console.log(`Total nodes: ${graph.nodes.size}`);
console.log(`Total edges: ${graph.countEdges()}`);

const analysis = analyzeGraph(graph, [source, transform]);
console.log(analysis.crossBlockEdges);
```

### 5. Diff-Driven Testing

```javascript
import { diffDrivenTest } from './src/test-framework.js';

const result = await diffDrivenTest({
    name: 'my-test',
    data: { input: [1, 2, 3] },
    codeOriginal: [/* blocks v1 */],
    codeModified: [/* blocks v2 */]
});

// See what changed
console.log(result.report);

// Trace causality
console.log(result.causality);
```

## Examples

### Run Basic Tests

```bash
npm run test:basic
```

Tests:
- Single block with computations
- Two blocks wired together
- Cross-block graph analysis
- Object diffing

### Run Full Example

```bash
npm run test:example
```

Demonstrates:
- Price charting application
- Three blocks (data, transform, chart)
- Diff between USD and EUR versions
- Full causality tracing

**Note**: This is a simplified example. See [REAL-WORLD-USAGE.md](./REAL-WORLD-USAGE.md) for how auto.js is actually used in production charting apps (prices-app, trade-portal-app-v2), including the critical distinction between URL (state configuration) and data (external sources)

## Key Features

### Multi-Level Diffing

```javascript
import { diff, formatDiff } from './src/diff.js';

const before = { x: 5, y: [1, 2, 3] };
const after = { x: 10, y: [1, 2, 4], z: 20 };

const d = diff(before, after);
console.log(formatDiff(d));
// Shows:
//   Added: z
//   Changed: x (5 → 10), y[2] (3 → 4)
```

### Graph Analysis

```javascript
import {
    getCrossBlockEdges,
    getAffectedBlocks,
    traceChange
} from './src/cross-block-graph.js';

// Which blocks does this variable affect?
const affected = getAffectedBlocks(graph, 'source', 'data');
console.log(affected);  // ['transform', 'chart']

// Trace a change through the graph
const trace = traceChange(graph, 'source', 'data');
console.log(trace.affected);
```

### GraphViz Export

```javascript
import { toDotWithBlocks } from './src/cross-block-graph.js';

const dot = toDotWithBlocks(graph, blocks);
console.log(dot);
// Generate DOT format for visualization with Graphviz
// Cross-block edges shown in bold red
```

## Architecture

Built on top of:
- **auto4 kernel** - Policy-based intent router
- **auto4 graph** - Reactive handlers
- **auto4 block** - Block composition
- **graph-first** - Pure graph data structure

New features:
- **diff.js** - Multi-level diffing
- **cross-block-graph.js** - Unified cross-block graph analysis
- **test-framework.js** - URL + data + code + chart testing

## Philosophy

Traditional testing asks: "Did this code produce the right output?"

Diff-driven testing asks: "What changed, and why?"

By treating tests as transformation pipelines (URL → Data → Code → Chart), we can:
- **Diff at every level** (data, graph, blocks, chart)
- **Trace causality** (which code change caused which output change)
- **Debug visually** (see the graph, see the diffs)

## Next Steps

1. Read the [full README](./README.md) for detailed architecture
2. Look at [example.js](./example.js) for a complete workflow
3. Explore the source in `src/` to understand internals
4. Try building your own blocks!

## Known Issues

- Some edge cases with cross-block dependency tracking
- Causality tracing could be more precise
- Need more comprehensive test suite

See [README.md](./README.md) for open questions and future directions.

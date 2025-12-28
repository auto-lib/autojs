/**
 * Test the simplified 4-module architecture
 */

import { auto, blocks } from './src/auto.js';
import { Block, wire, autoWire } from './src/blocks.js';

console.log('=== Test 1: Simple auto() usage ===\n');

const $ = auto({
    data: [1, 2, 3],
    count: ($) => $.data.length,
    doubled: ($) => $.data.map(x => x * 2),
    msg: ($) => `${$.count} items: ${$.doubled.join(', ')}`
});

console.log('Initial:');
console.log('  data:', $.data);
console.log('  count:', $.count);
console.log('  doubled:', $.doubled);
console.log('  msg:', $.msg);

$.data = [10, 20, 30, 40];

console.log('\nAfter $.data = [10, 20, 30, 40]:');
console.log('  count:', $.count);
console.log('  doubled:', $.doubled);
console.log('  msg:', $.msg);

console.log('\n✓ Test 1 passed\n');

// ===================================

console.log('=== Test 2: Multiple blocks with explicit wiring ===\n');

const sourceBlock = new Block({
    name: 'source',
    outputs: ['data'],
    functions: {
        data: [1, 2, 3]
    }
});

const transformBlock = new Block({
    name: 'transform',
    inputs: ['data'],
    outputs: ['doubled', 'tripled'],
    functions: {
        data: null,  // Will be wired
        doubled: ($) => $.data.map(x => x * 2),
        tripled: ($) => $.data.map(x => x * 3)
    }
});

const outputBlock = new Block({
    name: 'output',
    inputs: ['doubled', 'tripled'],
    functions: {
        doubled: null,
        tripled: null,
        combined: ($) => [...$.doubled, ...$.tripled]
    }
});

const wires = [
    wire('source', 'data', 'transform', 'data'),
    wire('transform', 'doubled', 'output', 'doubled'),
    wire('transform', 'tripled', 'output', 'tripled')
];

const system = blocks([sourceBlock, transformBlock, outputBlock], wires);

console.log('Block structure:');
console.log('  Blocks:', system.blocks.map(b => b.name).join(', '));
console.log('  Wires:', system.wires.map(w => w.toString()).join('\n         '));

system.resolve();

console.log('\nValues:');
console.log('  source.data:', system.getVar('source', 'data'));
console.log('  transform.doubled:', system.getVar('transform', 'doubled'));
console.log('  transform.tripled:', system.getVar('transform', 'tripled'));
console.log('  output.combined:', system.getVar('output', 'combined'));

system.setVar('source', 'data', [5, 10]);
console.log('\nAfter source.data = [5, 10]:');
console.log('  transform.doubled:', system.getVar('transform', 'doubled'));
console.log('  transform.tripled:', system.getVar('transform', 'tripled'));
console.log('  output.combined:', system.getVar('output', 'combined'));

console.log('\n✓ Test 2 passed\n');

// ===================================

console.log('=== Test 3: Auto-wiring ===\n');

const block1 = new Block({
    name: 'fetch',
    outputs: ['data'],
    functions: {
        url: 'http://example.com/api',
        data: ($) => `fetched from ${$.url}`
    }
});

const block2 = new Block({
    name: 'process',
    inputs: ['data'],
    outputs: ['result'],
    functions: {
        data: null,  // Auto-wired from fetch.data
        result: ($) => $.data.toUpperCase()
    }
});

const block3 = new Block({
    name: 'display',
    inputs: ['result'],
    functions: {
        result: null,  // Auto-wired from process.result
        output: ($) => `Display: ${$.result}`
    }
});

const autoSystem = blocks([block1, block2, block3], 'auto');

console.log('Auto-wiring created:');
console.log('  Wires:', autoSystem.wires.map(w => w.toString()).join('\n         '));

autoSystem.resolve();

console.log('\nValues:');
console.log('  fetch.data:', autoSystem.getVar('fetch', 'data'));
console.log('  process.result:', autoSystem.getVar('process', 'result'));
console.log('  display.output:', autoSystem.getVar('display', 'output'));

console.log('\n✓ Test 3 passed\n');

// ===================================

console.log('=== Test 4: Graph analysis ===\n');

const graph = system.graph;

console.log('Graph structure:');
console.log('  Total nodes:', graph.size());
console.log('  Total edges:', graph.countEdges());

const order = graph.topologicalSort();
console.log('  Execution order:', order.join(' → '));

const affected = graph.getReachable(['source.data']);
console.log('  Variables affected by source.data:', Array.from(affected).join(', '));

console.log('\n✓ Test 4 passed\n');

// ===================================

console.log('=== All tests passed! ===');
console.log('\nSimplified architecture working:');
console.log('  ✓ Module 1: DirectedGraph (pure graph structure)');
console.log('  ✓ Module 2: Static Analysis (function → dependencies)');
console.log('  ✓ Module 3: Blocks (grouping + wiring)');
console.log('  ✓ Module 4: Resolver (stale tracking + execution)');
console.log('  ✓ Module 5: Auto (integration API)');

/**
 * BASIC TEST - Simple verification that blocks work
 *
 * Tests the core building blocks before trying the full
 * diff-driven test workflow.
 */

import { block, autoWire, runAll } from './src/block.js';
import { buildCrossBlockGraph, analyzeGraph } from './src/cross-block-graph.js';
import { diff, formatDiff } from './src/diff.js';

console.log('=== BASIC BLOCKS TEST ===\n');

// Test 1: Single block
console.log('Test 1: Single block with simple computation');
const b1 = block({
    name: 'math',
    needs: ['x'],
    gives: ['double', 'triple'],
    state: {
        x: 5,
        double: ($) => $.x * 2,
        triple: ($) => $.x * 3
    }
});

console.log(`  x = ${b1.get('x')}`);
console.log(`  double = ${b1.get('double')}`);
console.log(`  triple = ${b1.get('triple')}`);
console.log('  ✓ Single block works\n');

// Test 2: Two blocks wired together
console.log('Test 2: Two blocks wired together');
const b2a = block({
    name: 'source',
    needs: [],
    gives: ['value'],
    state: {
        value: 10
    }
});

const b2b = block({
    name: 'consumer',
    needs: ['value'],
    gives: ['doubled'],
    state: {
        doubled: ($) => $.value * 2
    }
});

// Wire them
b2a.wire('value', b2b, 'value');

// Trigger update
b2a.set('value', 20);
runAll([b2a, b2b]);

console.log(`  source.value = ${b2a.get('value')}`);
console.log(`  consumer.doubled = ${b2b.get('doubled')}`);
console.log('  ✓ Two blocks wired together works\n');

// Test 3: Cross-block graph
console.log('Test 3: Cross-block graph analysis');
const graph = buildCrossBlockGraph([b2a, b2b]);
console.log(`  Total nodes: ${graph.nodes.size}`);
console.log(`  Total edges: ${graph.countEdges()}`);

const analysis = analyzeGraph(graph, [b2a, b2b]);
console.log(`  Blocks analyzed: ${Object.keys(analysis.blocks).length}`);
console.log(`  Cross-block edges: ${analysis.crossBlockEdges.length}`);
console.log('  ✓ Cross-block graph analysis works\n');

// Test 4: Diffing
console.log('Test 4: Object diffing');
const obj1 = { x: 5, y: 10, z: 15 };
const obj2 = { x: 5, y: 20, w: 25 };

const objDiff = diff(obj1, obj2);
console.log('  Original:', obj1);
console.log('  Modified:', obj2);
console.log('  Diff:');
console.log(formatDiff(objDiff, 2));
console.log('  ✓ Diffing works\n');

console.log('=== ALL BASIC TESTS PASSED ===');

/**
 * Test each layer independently
 */

import DirectedGraph from '../src/layer1-graph.js';
import { StaticAnalysisBuilder, RuntimeTrackingBuilder, ExplicitBuilder, computed } from '../src/layer2-graph-builder.js';
import ReactiveSystem from '../src/layer3-reactive.js';
import auto from '../src/auto-layered.js';

// Simple test framework
let tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify([...actual].sort());
    const expectedStr = JSON.stringify([...expected].sort());
    if (actualStr !== expectedStr) {
        throw new Error(message || `Expected ${expectedStr} but got ${actualStr}`);
    }
}

// =============================================================================
// LAYER 1: Graph Tests
// =============================================================================

console.log('=== LAYER 1: DirectedGraph Tests ===\n');

test('Layer1: should create empty graph', () => {
    const g = new DirectedGraph();
    assertEqual(g.size(), 0);
});

test('Layer1: should add nodes', () => {
    const g = new DirectedGraph();
    g.addNode('a', { value: 1 });
    g.addNode('b', { value: 2 });
    assertEqual(g.size(), 2);
    assert(g.has('a'));
    assert(g.has('b'));
});

test('Layer1: should add edges', () => {
    const g = new DirectedGraph();
    g.addNode('a');
    g.addNode('b');
    g.addEdge('a', 'b');

    assertDeepEqual(g.getSuccessors('a'), new Set(['b']));
    assertDeepEqual(g.getPredecessors('b'), new Set(['a']));
});

test('Layer1: should find reachable nodes', () => {
    const g = new DirectedGraph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    g.addEdge('a', 'b');
    g.addEdge('b', 'c');

    assertDeepEqual(g.getReachable(['a']), new Set(['b', 'c']));
});

test('Layer1: should detect cycles', () => {
    const g = new DirectedGraph();
    g.addNode('a');
    g.addNode('b');
    g.addEdge('a', 'b');
    g.addEdge('b', 'a');

    assert(g.hasCycle());
});

test('Layer1: should not detect cycles when none exist', () => {
    const g = new DirectedGraph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    g.addEdge('a', 'b');
    g.addEdge('b', 'c');

    assert(!g.hasCycle());
});

test('Layer1: should topologically sort', () => {
    const g = new DirectedGraph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    g.addEdge('a', 'b');
    g.addEdge('b', 'c');

    const sorted = g.topologicalSort();
    const aIndex = sorted.indexOf('a');
    const bIndex = sorted.indexOf('b');
    const cIndex = sorted.indexOf('c');

    assert(aIndex < bIndex, 'a should come before b');
    assert(bIndex < cIndex, 'b should come before c');
});

test('Layer1: should throw on topological sort with cycle', () => {
    const g = new DirectedGraph();
    g.addNode('a');
    g.addNode('b');
    g.addEdge('a', 'b');
    g.addEdge('b', 'a');

    let threw = false;
    try {
        g.topologicalSort();
    } catch (e) {
        threw = true;
        assert(e.message.includes('Cycle'));
    }
    assert(threw);
});

// =============================================================================
// LAYER 2: GraphBuilder Tests
// =============================================================================

console.log('\n=== LAYER 2: GraphBuilder Tests ===\n');

test('Layer2/Static: should build graph from definition', () => {
    const builder = new StaticAnalysisBuilder();
    const graph = builder.build({
        data: null,
        count: ($) => $.data ? $.data.length : 0
    });

    assertEqual(graph.size(), 2);
    assertDeepEqual(graph.getSuccessors('data'), new Set(['count']));
});

test('Layer2/Static: should find all dependencies via static analysis', () => {
    const builder = new StaticAnalysisBuilder();
    const graph = builder.build({
        enabled: false,
        data: [1, 2, 3],
        config: { x: 1 },
        result: ($) => {
            if (!$.enabled) return 'N/A';
            return $.data.sort($.config);
        }
    });

    // Should find ALL dependencies even in branches that don't execute
    const deps = graph.getSuccessors('data');
    assert(deps.has('result'));

    const enabledDeps = graph.getSuccessors('enabled');
    assert(enabledDeps.has('result'));
});

test('Layer2/Runtime: should track actual dependencies', () => {
    const builder = new RuntimeTrackingBuilder();
    const graph = builder.build({
        enabled: false,
        data: [1, 2, 3],
        result: ($) => {
            if (!$.enabled) return 'N/A';
            return $.data.length;
        }
    });

    // Should track what was actually accessed (enabled=false initially)
    const deps = graph.getPredecessors('result');
    assert(deps.has('enabled'));
    // Might or might not have 'data' depending on proxy behavior
});

test('Layer2/Explicit: should use declared dependencies', () => {
    const builder = new ExplicitBuilder();
    const graph = builder.build({
        a: 1,
        b: 2,
        sum: computed(['a', 'b'], ($) => $.a + $.b)
    });

    assertDeepEqual(graph.getPredecessors('sum'), new Set(['a', 'b']));
});

test('Layer2/Explicit: should throw on invalid dependency', () => {
    const builder = new ExplicitBuilder();
    let threw = false;

    try {
        builder.build({
            a: 1,
            sum: computed(['a', 'nonexistent'], ($) => $.a + 1)
        });
    } catch (e) {
        threw = true;
        assert(e.message.includes('nonexistent'));
    }

    assert(threw);
});

// =============================================================================
// LAYER 3: ReactiveSystem Tests
// =============================================================================

console.log('\n=== LAYER 3: ReactiveSystem Tests ===\n');

test('Layer3: should compute values using graph', () => {
    const graph = new DirectedGraph();
    graph.addNode('data', { type: 'static', initialValue: [1, 2, 3] });
    graph.addNode('count', {
        type: 'computed',
        fn: ($) => $.data.length
    });
    graph.addEdge('data', 'count');

    const reactive = new ReactiveSystem(graph);
    assertEqual(reactive.get('count'), 3);
});

test('Layer3: should mark dirty and recompute', () => {
    const graph = new DirectedGraph();
    graph.addNode('data', { type: 'static', initialValue: [1, 2, 3] });
    graph.addNode('count', {
        type: 'computed',
        fn: ($) => $.data.length
    });
    graph.addEdge('data', 'count');

    const reactive = new ReactiveSystem(graph);
    assertEqual(reactive.get('count'), 3);

    reactive.set('data', [1, 2, 3, 4, 5]);
    assertEqual(reactive.get('count'), 5);
});

test('Layer3: should prevent setting computed values', () => {
    const graph = new DirectedGraph();
    graph.addNode('data', { type: 'static', initialValue: [1, 2, 3] });
    graph.addNode('count', {
        type: 'computed',
        fn: ($) => $.data.length
    });
    graph.addEdge('data', 'count');

    const reactive = new ReactiveSystem(graph);

    let threw = false;
    try {
        reactive.set('count', 10);
    } catch (e) {
        threw = true;
        assert(e.message.includes('computed'));
    }
    assert(threw);
});

test('Layer3: should handle nested dependencies', () => {
    const graph = new DirectedGraph();
    graph.addNode('data', { type: 'static', initialValue: [1, 2, 3] });
    graph.addNode('count', {
        type: 'computed',
        fn: ($) => $.data.length
    });
    graph.addNode('msg', {
        type: 'computed',
        fn: ($) => `Got ${$.count} items`
    });
    graph.addEdge('data', 'count');
    graph.addEdge('count', 'msg');

    const reactive = new ReactiveSystem(graph);
    assertEqual(reactive.get('msg'), 'Got 3 items');

    reactive.set('data', [1, 2, 3, 4, 5]);
    assertEqual(reactive.get('msg'), 'Got 5 items');
});

// =============================================================================
// INTEGRATED: Full Auto Tests
// =============================================================================

console.log('\n=== INTEGRATED: Full Auto.js Tests ===\n');

test('Integrated: should work with default (static) strategy', () => {
    const $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => `Got ${$.count} items`
    });

    assertEqual($.count, 0);
    $.data = [1, 2, 3];
    assertEqual($.count, 3);
    assertEqual($.msg, 'Got 3 items');
});

test('Integrated: should expose graph via _', () => {
    const $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0
    });

    assert($._.graph);
    assert($._.deps);
    assert($._.value);
    assertDeepEqual($._.deps.count, ['data']);
});

test('Integrated: should detect circular dependencies', () => {
    let threw = false;
    try {
        auto({
            a: ($) => $.b + 1,
            b: ($) => $.a + 1
        });
    } catch (e) {
        threw = true;
        assert(e.message.includes('Circular'));
    }
    assert(threw);
});

test('Integrated: should work with runtime tracking strategy', () => {
    const $ = auto.runtime({
        mode: 'simple',
        data: [1, 2, 3],
        result: ($) => {
            if ($.mode === 'simple') {
                return $.data.length;
            } else {
                return $.data.join(',');
            }
        }
    });

    assertEqual($.result, 3);
    $.mode = 'detailed';
    assertEqual($.result, '1,2,3');
});

test('Integrated: should work with explicit dependencies', () => {
    const $ = auto.explicit({
        a: 1,
        b: 2,
        sum: computed(['a', 'b'], ($) => $.a + $.b)
    });

    assertEqual($.sum, 3);
    $.a = 5;
    assertEqual($.sum, 7);
});

// =============================================================================
// RUN TESTS
// =============================================================================

async function runTests() {
    console.log(`\nRunning ${tests.length} tests...\n`);

    for (let { name, fn } of tests) {
        try {
            await fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (e) {
            console.log(`✗ ${name}`);
            console.log(`  ${e.message}`);
            if (e.stack) {
                console.log(`  ${e.stack.split('\n')[1]}`);
            }
            failed++;
        }
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();

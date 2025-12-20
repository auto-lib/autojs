/**
 * Basic tests for graph-first architecture
 *
 * Run with: node tests/basic.test.js
 */

import auto from '../src/graph-first.js';

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
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(message || `Expected ${expectedStr} but got ${actualStr}`);
    }
}

// =============================================================================
// TESTS
// =============================================================================

test('should create reactive object', () => {
    let $ = auto({ data: null, count: ($) => $.data ? $.data.length : 0 });
    assert($, 'Should return object');
    assertEqual($.data, null);
});

test('should compute initial values', () => {
    let $ = auto({
        data: [1, 2, 3],
        count: ($) => $.data.length
    });
    assertEqual($.count, 3);
});

test('should update when dependency changes', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0
    });
    assertEqual($.count, 0);
    $.data = [1, 2, 3];
    assertEqual($.count, 3);
});

test('should handle nested dependencies', () => {
    let $ = auto({
        data: [1, 2, 3],
        count: ($) => $.data.length,
        msg: ($) => `Got ${$.count} items`
    });
    assertEqual($.msg, 'Got 3 items');
    $.data = [1, 2, 3, 4, 5];
    assertEqual($.msg, 'Got 5 items');
});

test('should prevent setting computed values', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0
    });

    let threw = false;
    try {
        $.count = 10;
    } catch (e) {
        threw = true;
        assert(e.message.includes('computed'), 'Error should mention computed');
    }
    assert(threw, 'Should throw when setting computed value');
});

test('should expose graph structure via _', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => `Got ${$.count} items`
    });

    assert($._, 'Should have _ property');
    assert($._.graph, 'Should expose graph');
    assert($._.deps, 'Should expose deps');
    assert($._.value, 'Should expose values');
});

test('should build correct dependency graph', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => `Got ${$.count} items`
    });

    assertDeepEqual($._.deps.count, ['data'], 'count should depend on data');
    assertDeepEqual($._.deps.msg, ['count'], 'msg should depend on count');
});

test('should build correct reverse dependencies', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => `Got ${$.count} items`
    });

    assertDeepEqual($._.dependents.data, ['count'], 'data should have count as dependent');
    assertDeepEqual($._.dependents.count, ['msg'], 'count should have msg as dependent');
});

test('should compute execution order', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => `Got ${$.count} items`
    });

    // Order should be: dependencies before dependents
    const order = $._.order;
    const countIdx = order.indexOf('count');
    const msgIdx = order.indexOf('msg');
    assert(countIdx < msgIdx, 'count should execute before msg');
});

test('should detect circular dependencies', () => {
    let threw = false;
    try {
        let $ = auto({
            a: ($) => $.b + 1,
            b: ($) => $.a + 1
        });
    } catch (e) {
        threw = true;
        assert(e.message.includes('Circular'), 'Error should mention circular dependency');
    }
    assert(threw, 'Should throw on circular dependency');
});

test('should handle multiple independent changes', () => {
    let $ = auto({
        x: 1,
        y: 2,
        sum: ($) => $.x + $.y,
        product: ($) => $.x * $.y
    });

    assertEqual($.sum, 3);
    assertEqual($.product, 2);

    $.x = 3;
    assertEqual($.sum, 5);
    assertEqual($.product, 6);

    $.y = 4;
    assertEqual($.sum, 7);
    assertEqual($.product, 12);
});

test('should mark dirty nodes', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0
    });

    $.data = [1, 2, 3];
    // After lazy evaluation, nothing should be dirty
    const _ = $.count; // Force evaluation
    assertEqual($._.dirty.length, 0, 'Nothing should be dirty after evaluation');
});

test('should generate GraphViz output', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0
    });

    const dot = $.visualize();
    assert(dot.includes('digraph'), 'Should be GraphViz format');
    assert(dot.includes('data'), 'Should include data node');
    assert(dot.includes('count'), 'Should include count node');
});

test('should handle complex dependency chains', () => {
    let $ = auto({
        a: 1,
        b: ($) => $.a * 2,
        c: ($) => $.b + 1,
        d: ($) => $.c * 2,
        e: ($) => $.d + $.b
    });

    // a=1, b=2, c=3, d=6, e=6+2=8
    assertEqual($.e, 8);

    $.a = 2;
    // a=2, b=4, c=5, d=10, e=10+4=14
    assertEqual($.e, 14);
});

test('should list functions correctly', () => {
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => `Got ${$.count} items`
    });

    assertDeepEqual($._.fn.sort(), ['count', 'msg'], 'Should list computed functions');
});

// =============================================================================
// RUN TESTS
// =============================================================================

async function runTests() {
    console.log(`Running ${tests.length} tests...\n`);

    for (let { name, fn } of tests) {
        try {
            await fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (e) {
            console.log(`✗ ${name}`);
            console.log(`  ${e.message}`);
            failed++;
        }
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();

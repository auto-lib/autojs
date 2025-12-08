/**
 * Tests for tracer.js
 */

import { kernel } from './kernel.js';
import { createReactiveHandlers, createReactiveState } from './graph.js';
import { block, autoWire, runAll } from './block.js';
import { createTracer, hashHandler, hashHandlers } from './tracer.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  PASS: ${name}`);
        passed++;
    } catch (e) {
        console.log(`  FAIL: ${name}`);
        console.log(`        ${e.message}`);
        failed++;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'assertion failed');
}

function assertEquals(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
        throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
    }
}

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('HASHING TESTS');
console.log('='.repeat(50));
// ==========================================

test('hash function is deterministic', () => {
    let fn = ($) => $.x * 2;
    let hash1 = hashHandler(fn);
    let hash2 = hashHandler(fn);
    assertEquals(hash1, hash2);
});

test('different functions have different hashes', () => {
    let fn1 = ($) => $.x * 2;
    let fn2 = ($) => $.x * 3;
    let hash1 = hashHandler(fn1);
    let hash2 = hashHandler(fn2);
    assert(hash1 !== hash2, 'hashes should differ');
});

test('handler object hashing includes policy', () => {
    let handler1 = { policy: 'immediate', handler: ($) => $.x };
    let handler2 = { policy: 'deferred', handler: ($) => $.x };
    let hash1 = hashHandler(handler1);
    let hash2 = hashHandler(handler2);
    assert(hash1 !== hash2, 'different policies should have different hashes');
});

test('hashHandlers hashes all handlers', () => {
    let handlers = {
        get: ($) => $.x,
        set: ($) => $.y,
    };
    let hashes = hashHandlers(handlers);
    assert('get' in hashes, 'should have get hash');
    assert('set' in hashes, 'should have set hash');
    assert(hashes.get !== hashes.set, 'different handlers should have different hashes');
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('SINGLE KERNEL TRACING TESTS');
console.log('='.repeat(50));
// ==========================================

test('tracer records intents', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    tracer.startRun({ test: 'records intents' });

    k.sig('define', { target: 'x', val: 10 });
    k.sig('define', { target: 'doubled', val: ($) => $.x * 2 });
    k.run();

    let run = tracer.endRun(state.cache, handlers);

    assert(run.intents.length > 0, 'should have recorded intents');
    assert(run.intents.some(i => i.name === 'define'), 'should have define intents');
});

test('tracer captures final state', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    tracer.startRun();
    k.sig('define', { target: 'x', val: 42 });
    k.run();
    let run = tracer.endRun(state.cache, handlers);

    assertEquals(run.finalState.x, 42);
});

test('tracer captures handler hashes', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    tracer.startRun();
    k.sig('define', { target: 'x', val: 1 });
    k.run();
    let run = tracer.endRun(state.cache, handlers);

    assert(Object.keys(run.handlerHashes).length > 0, 'should have handler hashes');
    assert('get' in run.handlerHashes, 'should have get handler hash');
    assert('set' in run.handlerHashes, 'should have set handler hash');
});

test('multiple runs are stored separately', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    // Run 1
    tracer.startRun({ run: 1 });
    k.sig('define', { target: 'x', val: 10 });
    k.run();
    tracer.endRun(state.cache, handlers);

    // Run 2
    tracer.startRun({ run: 2 });
    k.sig('set', { target: 'x', val: 20 });
    k.run();
    tracer.endRun(state.cache, handlers);

    let runs = tracer.getRuns();
    assertEquals(runs.length, 2);
    assertEquals(runs[0].metadata.run, 1);
    assertEquals(runs[1].metadata.run, 2);
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('DATA DIFF TESTS');
console.log('='.repeat(50));
// ==========================================

test('diffData detects changed values', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    // Run 1: x = 10
    tracer.startRun();
    k.sig('define', { target: 'x', val: 10 });
    k.run();
    tracer.endRun(state.cache, handlers);

    // Run 2: x = 20
    tracer.startRun();
    k.sig('set', { target: 'x', val: 20 });
    k.run();
    tracer.endRun(state.cache, handlers);

    let diff = tracer.diffData('run-1', 'run-2');

    assert(diff.changed.length === 1, 'should have one changed value');
    assertEquals(diff.changed[0].key, 'x');
    assertEquals(diff.changed[0].from, 10);
    assertEquals(diff.changed[0].to, 20);
});

test('diffData detects added values', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    // Run 1: x = 10
    tracer.startRun();
    k.sig('define', { target: 'x', val: 10 });
    k.run();
    tracer.endRun(state.cache, handlers);

    // Run 2: x = 10, y = 20
    tracer.startRun();
    k.sig('define', { target: 'y', val: 20 });
    k.run();
    tracer.endRun(state.cache, handlers);

    let diff = tracer.diffData('run-1', 'run-2');

    assert(diff.added.length === 1, 'should have one added value');
    assertEquals(diff.added[0].key, 'y');
});

test('diffData detects unchanged values', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    // Run 1
    tracer.startRun();
    k.sig('define', { target: 'x', val: 10 });
    k.sig('define', { target: 'y', val: 20 });
    k.run();
    tracer.endRun(state.cache, handlers);

    // Run 2: only y changes
    tracer.startRun();
    k.sig('set', { target: 'y', val: 30 });
    k.run();
    tracer.endRun(state.cache, handlers);

    let diff = tracer.diffData('run-1', 'run-2');

    assert(diff.unchanged.includes('x'), 'x should be unchanged');
    assert(diff.changed.some(c => c.key === 'y'), 'y should be changed');
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('FLOW DIFF TESTS');
console.log('='.repeat(50));
// ==========================================

test('diffFlow detects same sequence', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    // Run 1
    tracer.startRun();
    k.sig('define', { target: 'x', val: 10 });
    k.run();
    tracer.endRun(state.cache, handlers);

    // Reset and run same thing
    state = createReactiveState();
    k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    // Run 2 - identical
    tracer.startRun();
    k.sig('define', { target: 'x', val: 10 });
    k.run();
    tracer.endRun(state.cache, handlers);

    let diff = tracer.diffFlow('run-1', 'run-2');

    assert(diff.sequenceMatch, 'sequences should match');
    assertEquals(diff.onlyInRun1.length, 0);
    assertEquals(diff.onlyInRun2.length, 0);
});

test('diffFlow detects different sequences', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    // Run 1: define x
    tracer.startRun();
    k.sig('define', { target: 'x', val: 10 });
    k.run();
    tracer.endRun(state.cache, handlers);

    // Run 2: define x and y
    tracer.startRun();
    k.sig('define', { target: 'x', val: 10 });
    k.sig('define', { target: 'y', val: 20 });
    k.run();
    tracer.endRun(state.cache, handlers);

    let diff = tracer.diffFlow('run-1', 'run-2');

    assert(!diff.sequenceMatch, 'sequences should not match');
    assert(diff.onlyInRun2.length > 0, 'run 2 should have extra intents');
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('CODE DIFF TESTS');
console.log('='.repeat(50));
// ==========================================

test('diffCode detects changed handlers', () => {
    let tracer = createTracer();

    // Run 1 with handler v1
    let handlers1 = {
        compute: { policy: 'deferred', handler: ($) => $.x * 2 }
    };
    tracer.startRun();
    tracer.endRun({}, handlers1);

    // Run 2 with handler v2
    let handlers2 = {
        compute: { policy: 'deferred', handler: ($) => $.x * 3 }  // changed!
    };
    tracer.startRun();
    tracer.endRun({}, handlers2);

    let diff = tracer.diffCode('run-1', 'run-2');

    assert(diff.changed.length === 1, 'should have one changed handler');
    assertEquals(diff.changed[0].name, 'compute');
});

test('diffCode detects added handlers', () => {
    let tracer = createTracer();

    // Run 1: just compute
    let handlers1 = {
        compute: ($) => $.x * 2
    };
    tracer.startRun();
    tracer.endRun({}, handlers1);

    // Run 2: compute + validate
    let handlers2 = {
        compute: ($) => $.x * 2,
        validate: ($) => $.x > 0
    };
    tracer.startRun();
    tracer.endRun({}, handlers2);

    let diff = tracer.diffCode('run-1', 'run-2');

    assert(diff.added.length === 1, 'should have one added handler');
    assertEquals(diff.added[0].name, 'validate');
    assert(diff.unchanged.includes('compute'), 'compute should be unchanged');
});

test('diffCode detects removed handlers', () => {
    let tracer = createTracer();

    // Run 1: compute + validate
    let handlers1 = {
        compute: ($) => $.x * 2,
        validate: ($) => $.x > 0
    };
    tracer.startRun();
    tracer.endRun({}, handlers1);

    // Run 2: just compute
    let handlers2 = {
        compute: ($) => $.x * 2
    };
    tracer.startRun();
    tracer.endRun({}, handlers2);

    let diff = tracer.diffCode('run-1', 'run-2');

    assert(diff.removed.length === 1, 'should have one removed handler');
    assertEquals(diff.removed[0].name, 'validate');
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('MULTI-BLOCK TRACING TESTS');
console.log('='.repeat(50));
// ==========================================

test('trace flows through wired blocks', () => {
    // We need to inject tracer into each block's kernel
    // This is a bit manual - in practice we'd have a helper

    let tracer = createTracer();

    // Create blocks with tracer transform injected
    // For now, we'll trace at the system level by wrapping runAll

    let parser = block({
        name: 'parser',
        needs: ['url'],
        gives: ['host'],
        state: {
            host: ($) => $.url ? new URL($.url).host : null
        }
    });

    let fetcher = block({
        name: 'fetcher',
        needs: ['host'],
        gives: ['endpoint'],
        state: {
            endpoint: ($) => $.host ? `https://${$.host}/api` : null
        }
    });

    autoWire([parser, fetcher]);

    // Manual tracing of the overall flow
    tracer.startRun({ input: 'https://example.com/foo' });

    parser.set('url', 'https://example.com/foo');
    runAll([parser, fetcher]);

    // Capture combined state
    let combinedState = {
        'parser.url': parser.get('url'),
        'parser.host': parser.get('host'),
        'fetcher.host': fetcher.get('host'),
        'fetcher.endpoint': fetcher.get('endpoint')
    };

    tracer.endRun(combinedState, {});

    let run = tracer.getRun('run-1');
    assertEquals(run.finalState['parser.host'], 'example.com');
    assertEquals(run.finalState['fetcher.endpoint'], 'https://example.com/api');
});

test('diff multi-block runs with different inputs', () => {
    let tracer = createTracer();

    let parser = block({
        name: 'parser',
        needs: ['url'],
        gives: ['host'],
        state: {
            host: ($) => $.url ? new URL($.url).host : null
        }
    });

    let fetcher = block({
        name: 'fetcher',
        needs: ['host'],
        gives: ['endpoint'],
        state: {
            endpoint: ($) => $.host ? `https://${$.host}/api` : null
        }
    });

    autoWire([parser, fetcher]);

    // Run 1: example.com
    tracer.startRun({ url: 'https://example.com/foo' });
    parser.set('url', 'https://example.com/foo');
    runAll([parser, fetcher]);
    tracer.endRun({
        host: parser.get('host'),
        endpoint: fetcher.get('endpoint')
    }, {});

    // Run 2: different.com
    tracer.startRun({ url: 'https://different.com/bar' });
    parser.set('url', 'https://different.com/bar');
    runAll([parser, fetcher]);
    tracer.endRun({
        host: parser.get('host'),
        endpoint: fetcher.get('endpoint')
    }, {});

    let diff = tracer.diffData('run-1', 'run-2');

    assert(diff.changed.some(c => c.key === 'host'), 'host should have changed');
    assert(diff.changed.some(c => c.key === 'endpoint'), 'endpoint should have changed');

    let hostChange = diff.changed.find(c => c.key === 'host');
    assertEquals(hostChange.from, 'example.com');
    assertEquals(hostChange.to, 'different.com');
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('SUMMARY TESTS');
console.log('='.repeat(50));
// ==========================================

test('summarize provides run overview', () => {
    let tracer = createTracer();
    let state = createReactiveState();
    let handlers = createReactiveHandlers();

    let k = kernel({
        state,
        handlers,
        transforms: [tracer.transform]
    });

    tracer.startRun({ description: 'test run' });
    k.sig('define', { target: 'x', val: 10 });
    k.sig('define', { target: 'y', val: 20 });
    k.sig('set', { target: 'x', val: 15 });
    k.run();
    tracer.endRun(state.cache, handlers);

    let summary = tracer.summarize('run-1');

    assertEquals(summary.id, 'run-1');
    assert(summary.totalIntents > 0, 'should have intents');
    assert('define' in summary.intentCounts, 'should count define intents');
    assert(summary.finalStateKeys.includes('x'), 'should list x in final state');
    assertEquals(summary.metadata.description, 'test run');
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('FULL DIFF TESTS');
console.log('='.repeat(50));
// ==========================================

test('full diff combines all three levels', () => {
    let tracer = createTracer();

    // Run 1
    let handlers1 = { compute: ($) => $.x * 2 };
    tracer.startRun();
    tracer.endRun({ x: 10, result: 20 }, handlers1);

    // Run 2 - different data and code
    let handlers2 = { compute: ($) => $.x * 3, validate: ($) => true };
    tracer.startRun();
    tracer.endRun({ x: 10, result: 30 }, handlers2);

    let diff = tracer.diff('run-1', 'run-2');

    // Data diff
    assert(diff.data.changed.some(c => c.key === 'result'), 'result should be in data diff');

    // Code diff
    assert(diff.code.changed.some(c => c.name === 'compute'), 'compute should be in code diff');
    assert(diff.code.added.some(c => c.name === 'validate'), 'validate should be added');
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
    process.exit(1);
}

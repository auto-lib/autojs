/**
 * Tests for auto3 - kernel-based reactive system
 */

import auto from './auto.js';
import { block, autoWire, runAll } from './block.js';

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
    if (a !== b) throw new Error(msg || `expected ${b}, got ${a}`);
}

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('BASIC REACTIVITY TESTS');
console.log('='.repeat(50));
// ==========================================

test('basic value', () => {
    let $ = auto({ x: 10 });
    assertEquals($.x, 10);
});

test('basic computed', () => {
    let $ = auto({
        x: 10,
        doubled: ($) => $.x * 2
    });
    assertEquals($.doubled, 20);
});

test('dependent computed', () => {
    let $ = auto({
        a: 1,
        b: 2,
        sum: ($) => $.a + $.b,
        doubled: ($) => $.sum * 2
    });
    assertEquals($.sum, 3);
    assertEquals($.doubled, 6);
});

test('set triggers update', () => {
    let $ = auto({
        x: 1,
        doubled: ($) => $.x * 2
    });
    assertEquals($.doubled, 2);
    $.x = 5;
    assertEquals($.doubled, 10);
});

test('chain of updates', () => {
    let $ = auto({
        a: 1,
        b: ($) => $.a + 1,
        c: ($) => $.b + 1,
        d: ($) => $.c + 1
    });
    assertEquals($.d, 4);
    $.a = 10;
    assertEquals($.d, 13);
});

test('no side effects - function cannot set value', () => {
    let $ = auto({
        data: null,
        update: ($) => { $.data = [1,2,3]; return 'done'; }
    });
    assert($._.fatal.msg, 'should have fatal error');
    assert($._.fatal.msg.includes('trying to change'), 'error should mention side effect');
});

test('circular dependency detected', () => {
    let $ = auto({
        a: ($) => $.b + 1,
        b: ($) => $.a + 1
    });
    assert($._.fatal.msg, 'should have fatal error');
    assert($._.fatal.msg.includes('circular'), 'error should mention circular');
});

test('internals exposed via _', () => {
    let $ = auto({
        data: [1,2,3],
        count: ($) => $.data.length
    });
    assert($._.fn.includes('count'), 'should list functions');
    assert('data' in $._.value, 'should have values');
    assertEquals($._.value.count, 3);
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log('BLOCK COMPOSITION TESTS');
console.log('='.repeat(50));
// ==========================================

test('single block with needs/gives', () => {
    let parser = block({
        name: 'parser',
        needs: ['url'],
        gives: ['host', 'path'],
        state: {
            host: ($) => $.url ? new URL($.url).host : null,
            path: ($) => $.url ? new URL($.url).pathname : null
        }
    });

    parser.set('url', 'https://example.com/api/users');

    assertEquals(parser.get('host'), 'example.com');
    assertEquals(parser.get('path'), '/api/users');
});

test('two blocks wired manually', () => {
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

    // Wire parser.host -> fetcher.host
    parser.wire('host', fetcher, 'host');

    // Set url on parser
    parser.set('url', 'https://example.com/foo');

    // Run both until stable
    runAll([parser, fetcher]);

    assertEquals(fetcher.get('endpoint'), 'https://example.com/api');
});

test('auto-wiring by name', () => {
    let parser = block({
        name: 'parser',
        needs: ['url'],
        gives: ['host', 'path'],
        state: {
            host: ($) => $.url ? new URL($.url).host : null,
            path: ($) => $.url ? new URL($.url).pathname : null
        }
    });

    let fetcher = block({
        name: 'fetcher',
        needs: ['host', 'path'],
        gives: ['endpoint'],
        state: {
            endpoint: ($) => ($.host && $.path) ? `https://${$.host}${$.path}` : null
        }
    });

    // Auto-wire based on matching names
    autoWire([parser, fetcher]);

    parser.set('url', 'https://api.example.com/v2/users');
    runAll([parser, fetcher]);

    assertEquals(fetcher.get('endpoint'), 'https://api.example.com/v2/users');
});

test('three blocks in chain', () => {
    let source = block({
        name: 'source',
        needs: ['input'],
        gives: ['data'],
        state: {
            data: ($) => $.input ? $.input.toUpperCase() : null
        }
    });

    let transform = block({
        name: 'transform',
        needs: ['data'],
        gives: ['processed'],
        state: {
            processed: ($) => $.data ? $.data + '!' : null
        }
    });

    let sink = block({
        name: 'sink',
        needs: ['processed'],
        gives: ['output'],
        state: {
            output: ($) => $.processed ? `[${$.processed}]` : null
        }
    });

    autoWire([source, transform, sink]);

    source.set('input', 'hello');
    runAll([source, transform, sink]);

    assertEquals(sink.get('output'), '[HELLO!]');
});

test('diamond dependency', () => {
    // A -> B -> D
    // A -> C -> D

    let a = block({
        name: 'a',
        needs: ['x'],
        gives: ['y'],
        state: {
            y: ($) => $.x ? $.x * 2 : null
        }
    });

    let b = block({
        name: 'b',
        needs: ['y'],
        gives: ['b_out'],
        state: {
            b_out: ($) => $.y ? $.y + 10 : null
        }
    });

    let c = block({
        name: 'c',
        needs: ['y'],
        gives: ['c_out'],
        state: {
            c_out: ($) => $.y ? $.y + 100 : null
        }
    });

    let d = block({
        name: 'd',
        needs: ['b_out', 'c_out'],
        gives: ['result'],
        state: {
            result: ($) => ($.b_out && $.c_out) ? $.b_out + $.c_out : null
        }
    });

    autoWire([a, b, c, d]);

    a.set('x', 5);  // y = 10, b_out = 20, c_out = 110, result = 130
    runAll([a, b, c, d]);

    assertEquals(d.get('result'), 130);
});

// ==========================================
console.log('\n' + '='.repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
    process.exit(1);
}

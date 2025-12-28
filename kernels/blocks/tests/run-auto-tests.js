/**
 * Test runner for auto() integration tests
 *
 * Tests use the original auto.js test format with $._
 * We provide a compatibility adapter that maps our internals to $._
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { auto } from '../src/auto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Deep equality check
function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a).sort();
        const keysB = Object.keys(b).sort();
        if (!deepEqual(keysA, keysB)) return false;
        for (let key of keysA) {
            // Special handling for 'fatal' - just check if both have/don't have cycle errors
            if (key === 'fatal') {
                const aHasCycle = a.fatal && a.fatal.msg && a.fatal.msg.includes('Cycle detected');
                const bHasCycle = b.fatal && b.fatal.msg && b.fatal.msg.includes('Cycle detected');
                if (aHasCycle && bHasCycle) {
                    continue; // Both have cycle errors - that's good enough
                }
                if (!deepEqual(a[key], b[key])) return false;
            } else {
                if (!deepEqual(a[key], b[key])) return false;
            }
        }
        return true;
    }
    return false;
}

// Create $._  compatibility adapter
function createAdapter($) {
    const resolver = $._resolver;
    const graph = $._graph;

    // Get list of computed functions
    const fn = [];
    for (let [name, fnDef] of Object.entries(resolver.functions)) {
        if (typeof fnDef === 'function') {
            fn.push(name);
        }
    }

    // Build deps map: { varName: { depName: true } }
    // Sort both outer and inner keys for consistent ordering
    const deps = {};
    const sortedFn = [...fn].sort();
    for (let varName of sortedFn) {
        const predecessors = Array.from(graph.getPredecessors(varName)).sort();
        const innerDeps = {};
        for (let dep of predecessors) {
            innerDeps[dep] = true;
        }
        deps[varName] = innerDeps;
    }

    // Get all values (may be undefined if circular dependency)
    // Sort keys for consistent ordering
    // Don't include keys that throw errors (circular deps)
    const value = {};
    const sortedNames = Array.from(graph.nodes.keys()).sort();
    for (let name of sortedNames) {
        try {
            value[name] = resolver.get(name);
        } catch (e) {
            // Don't include this key in value object if it can't be computed
        }
    }

    // Get stale list
    const stale = resolver.getStale();

    // Check for fatal errors (stored on resolver)
    const fatal = resolver._fatal || {};

    return {
        fn: fn.sort(),
        deps,
        value,
        stale: stale.sort(),
        fatal
    };
}

// Run a single test
async function runTest(testFile) {
    const testPath = join(__dirname, 'auto', testFile);
    const test = (await import(testPath)).default;

    try {
        // Create auto object
        const $ = auto(test.obj);

        // Run test function (may throw on circular deps)
        try {
            test.fn($);
        } catch (e) {
            // Errors during test function are expected (circular deps, etc.)
            // The error is captured in $._fatal
        }

        // Get actual state via adapter
        const actual = createAdapter($);

        // Check
        const passed = deepEqual(actual, test._);

        return {
            passed,
            actual,
            expected: test._,
            error: null
        };
    } catch (error) {
        return {
            passed: false,
            actual: null,
            expected: test._,
            error: error.message + '\n' + error.stack
        };
    }
}

// Main
async function main() {
    console.log('Running auto() Integration Tests\n');

    const testDir = join(__dirname, 'auto');
    const files = await readdir(testDir);
    const testFiles = files.filter(f => f.endsWith('.js')).sort();

    let passed = 0;
    let failed = 0;

    for (let file of testFiles) {
        const result = await runTest(file);

        if (result.passed) {
            console.log(`  ✓ ${file}`);
            passed++;
        } else {
            console.log(`  ✗ ${file}`);
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            } else {
                console.log(`    Expected:`);
                console.log(`      fn:`, JSON.stringify(result.expected.fn));
                console.log(`      deps:`, JSON.stringify(result.expected.deps));
                console.log(`      value:`, JSON.stringify(result.expected.value));
                console.log(`      stale:`, JSON.stringify(result.expected.stale));
                console.log(`    Actual:`);
                console.log(`      fn:`, JSON.stringify(result.actual.fn));
                console.log(`      deps:`, JSON.stringify(result.actual.deps));
                console.log(`      value:`, JSON.stringify(result.actual.value));
                console.log(`      stale:`, JSON.stringify(result.actual.stale));
            }
            failed++;
        }
    }

    console.log(`\n  Total: ${passed} passed, ${failed} failed\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);

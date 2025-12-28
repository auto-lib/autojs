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
            if (!deepEqual(a[key], b[key])) return false;
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
    const deps = {};
    for (let varName of fn) {
        const predecessors = graph.getPredecessors(varName);
        deps[varName] = {};
        for (let dep of predecessors) {
            deps[varName][dep] = true;
        }
    }

    // Get all values
    const value = {};
    for (let [name] of graph.nodes) {
        value[name] = resolver.get(name);
    }

    // Get stale list
    const stale = resolver.getStale();

    return {
        fn: fn.sort(),
        deps,
        value,
        stale: stale.sort()
    };
}

// Run a single test
async function runTest(testFile) {
    const testPath = join(__dirname, 'auto', testFile);
    const test = (await import(testPath)).default;

    try {
        // Create auto object
        const $ = auto(test.obj);

        // Run test function
        test.fn($);

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

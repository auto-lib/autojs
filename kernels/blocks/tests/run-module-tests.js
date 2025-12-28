/**
 * Test runner for individual module tests
 *
 * Each module has its own test directory with numbered tests
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import modules
import DirectedGraph from '../src/directed-graph.js';
import { analyzeFunction, buildGraph } from '../src/static-analysis.js';
import { Block, Wire, wire, autoWire, buildCrossBlockGraph, getCrossBlockEdges } from '../src/blocks.js';
import { Resolver } from '../src/resolver.js';

// Module configurations
const modules = {
    'graph': {
        name: 'DirectedGraph',
        setup: DirectedGraph
    },
    'static-analysis': {
        name: 'Static Analysis',
        setup: { analyzeFunction, buildGraph }
    },
    'blocks': {
        name: 'Blocks',
        setup: { Block, Wire, wire, autoWire, buildCrossBlockGraph, getCrossBlockEdges }
    },
    'resolver': {
        name: 'Resolver',
        setup: { Resolver, buildGraph }
    }
};

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

// Run a single test
async function runTest(moduleName, testFile, moduleSetup) {
    const testPath = join(__dirname, moduleName, testFile);
    const test = (await import(testPath)).default;

    try {
        // Setup
        const setupResult = test.setup(moduleSetup);

        // Validate
        const actual = test.validate(setupResult, test.expected);

        // Check
        const passed = deepEqual(actual, test.expected);

        return {
            passed,
            actual,
            expected: test.expected,
            error: null
        };
    } catch (error) {
        return {
            passed: false,
            actual: null,
            expected: test.expected,
            error: error.message
        };
    }
}

// Run all tests for a module
async function runModuleTests(moduleName) {
    const moduleConfig = modules[moduleName];
    const testDir = join(__dirname, moduleName);

    console.log(`\n=== ${moduleConfig.name} ===\n`);

    let files;
    try {
        files = await readdir(testDir);
    } catch (e) {
        console.log(`  No tests found (${e.message})`);
        return { passed: 0, failed: 0 };
    }

    const testFiles = files
        .filter(f => f.endsWith('.js'))
        .sort();

    let passed = 0;
    let failed = 0;

    for (let file of testFiles) {
        const result = await runTest(moduleName, file, moduleConfig.setup);

        if (result.passed) {
            console.log(`  ✓ ${file}`);
            passed++;
        } else {
            console.log(`  ✗ ${file}`);
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            } else {
                console.log(`    Expected:`, JSON.stringify(result.expected, null, 2));
                console.log(`    Actual:  `, JSON.stringify(result.actual, null, 2));
            }
            failed++;
        }
    }

    console.log(`\n  Total: ${passed} passed, ${failed} failed`);

    return { passed, failed };
}

// Main
async function main() {
    console.log('Running Module Tests\n');

    const results = {};
    let totalPassed = 0;
    let totalFailed = 0;

    for (let moduleName of Object.keys(modules)) {
        const result = await runModuleTests(moduleName);
        results[moduleName] = result;
        totalPassed += result.passed;
        totalFailed += result.failed;
    }

    console.log('\n=== Summary ===\n');

    for (let [moduleName, result] of Object.entries(results)) {
        const moduleConfig = modules[moduleName];
        const status = result.failed === 0 ? '✓' : '✗';
        console.log(`  ${status} ${moduleConfig.name}: ${result.passed}/${result.passed + result.failed}`);
    }

    console.log(`\n  Total: ${totalPassed} passed, ${totalFailed} failed\n`);

    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);

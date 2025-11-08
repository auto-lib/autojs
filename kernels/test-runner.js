#!/usr/bin/env node

/**
 * Universal Test Runner for Auto.js Kernels
 *
 * Runs the existing test suite against different kernel implementations.
 *
 * Usage:
 *   node test-runner.js channel              # Test channel kernel
 *   node test-runner.js hooks                # Test hooks kernel
 *   node test-runner.js channel 005          # Test single file
 *   node test-runner.js channel --verbose    # Verbose output
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// Test Utilities (from tests/runall.js)
// ============================================================================

function isEqual(obj1, obj2) {
    if (typeof(obj1) != typeof(obj2)) return false;
    if (obj1 == null && obj2 == null) return true;
    if (obj1 == null && obj2 != null) return false;
    if (obj1 != null && obj2 == null) return false;
    if (typeof obj1 === 'number' && isNaN(obj1) && isNaN(obj2)) return true;

    if (typeof(obj1) === 'object') {
        let keys = Object.keys(obj1);
        if (keys.length != Object.keys(obj2).length) return false;
        let equal = true;
        keys.forEach(key => {
            equal = equal && isEqual(obj1[key], obj2[key]);
        });
        return equal;
    }
    else return obj1 == obj2;
}

function assert_global_same(name, should_be, actual) {
    if (!isEqual(should_be, actual)) {
        console.log(name + ": global not equal");
        console.log("  should be:", should_be);
        console.log("  actual:   ", actual);
        return false;
    }
    return true;
}

function assert_internals_same(name, should_be, actual) {
    let diff = [];

    // Check fn (convert to array for comparison)
    let missing_fn = false;
    let fns = [];
    Object.keys(actual.fn).forEach(name => {
        if (should_be.fn.indexOf(name) === -1 && name != '#fatal') missing_fn = true;
        fns.push(name);
    });
    actual.fn = fns;
    if (missing_fn) diff.push('fn');

    // Check subs (convert to array format)
    let subs = {};
    Object.keys(actual.subs).forEach(name => {
        let arr = [];
        Object.keys(actual.subs[name]).forEach(tag => {
            arr.push(tag);
        });
        subs[name] = arr;
    });
    actual.subs = subs;

    let keys = ['subs', 'stack', 'deps', 'value', 'fatal'];
    keys.forEach(key => {
        if (!isEqual(should_be[key], actual[key])) diff.push(key);
    });

    if (diff.length > 0) {
        console.log(name + ": internals not same");
        diff.forEach(key => {
            console.log("  " + key + " should be", should_be[key]);
            console.log("  " + key + " actual   ", actual[key]);
        });
        return false;
    }
    else return true;
}

// ============================================================================
// Test Runner
// ============================================================================

class TestRunner {
    constructor(kernelName, options = {}) {
        this.kernelName = kernelName;
        this.kernelPath = path.join(process.cwd(), kernelName);
        this.verbose = options.verbose || false;
        this.singleTest = options.singleTest || null;

        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            ignored: 0
        };
    }

    async loadKernel() {
        const autoPath = path.join(this.kernelPath, 'auto.js');

        if (!fs.existsSync(autoPath)) {
            throw new Error(`Kernel not found: ${autoPath}`);
        }

        const module = await import(autoPath);
        this.auto = module.default || module;

        console.log(`\n📦 Loaded kernel: ${this.kernelName}`);
        console.log(`   Path: ${autoPath}\n`);
    }

    async loadTests() {
        const testsPath = path.join(process.cwd(), '..', 'tests', 'files');

        if (!fs.existsSync(testsPath)) {
            throw new Error(`Tests directory not found: ${testsPath}`);
        }

        const files = fs.readdirSync(testsPath)
            .filter(name => name.endsWith('.js'))
            .filter(name => parseInt(name.substring(0, 3)) > 0)
            .filter(name => !this.singleTest || name.startsWith(this.singleTest))
            .sort();

        console.log(`📋 Found ${files.length} tests\n`);

        return files;
    }

    async runTest(testFile, testPath) {
        const name = testFile.replace('.js', '');

        this.stats.total++;

        try {
            const module = await import(testPath);
            const test = module.default;

            // Add default #fatal handler
            if (typeof test.obj['#fatal'] !== 'function') {
                test.obj['#fatal'] = () => {};
            }

            // Run test
            let $ = this.auto(test.obj, test.opt);
            let global = {};

            try {
                test.fn($, global);
            } catch (e) {
                console.log(`❌ ${name}: execution error`);
                console.error(e);
                this.stats.failed++;
                return;
            }

            // Flush auto-batch if available
            if (!test.timeout && $.flush) $.flush();

            // Verify results
            const verify = () => {
                let same = assert_internals_same(name, test._, $._);
                if (test.global) {
                    same = assert_global_same(name, test.global, global) && same;
                }

                if (same) {
                    console.log(`✅ ${name}: passed`);
                    this.stats.passed++;
                } else {
                    console.log(`❌ ${name}: failed`);
                    this.stats.failed++;
                }
            };

            if (test.timeout) {
                setTimeout(verify, test.timeout);
            } else {
                verify();
            }

        } catch (e) {
            console.log(`❌ ${name}: load error`);
            console.error(e);
            this.stats.failed++;
        }
    }

    async run() {
        await this.loadKernel();
        const tests = await this.loadTests();

        for (const testFile of tests) {
            const testPath = path.join(process.cwd(), '..', 'tests', 'files', testFile);
            await this.runTest(testFile, testPath);
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary');
        console.log('='.repeat(60));
        console.log(`Total:   ${this.stats.total}`);
        console.log(`Passed:  ${this.stats.passed} ✅`);
        console.log(`Failed:  ${this.stats.failed} ❌`);
        console.log(`Ignored: ${this.stats.ignored} ⚠️`);

        const percentage = ((this.stats.passed / this.stats.total) * 100).toFixed(1);
        console.log(`\nSuccess Rate: ${percentage}%`);

        if (this.stats.failed === 0) {
            console.log('\n🎉 All tests passed!');
        }

        console.log('='.repeat(60) + '\n');
    }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Usage: node test-runner.js <kernel> [test-number] [--verbose]

Examples:
  node test-runner.js channel              # Run all tests for channel kernel
  node test-runner.js hooks                # Run all tests for hooks kernel
  node test-runner.js channel 005          # Run single test (005_*.js)
  node test-runner.js channel --verbose    # Verbose output

Available kernels:
  channel      - Signal-based kernel (working)
  hooks        - Hook-based kernel (proposed)
  middleware   - Middleware-based kernel (proposed)
  graph        - Graph-based kernel (proposed)
        `);
        process.exit(1);
    }

    const kernelName = args[0];
    const options = {
        verbose: args.includes('--verbose'),
        singleTest: args.find(arg => /^\d{3}/.test(arg))
    };

    const runner = new TestRunner(kernelName, options);
    await runner.run();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

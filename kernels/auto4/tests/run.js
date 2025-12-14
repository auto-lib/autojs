/**
 * Test Runner for Auto4 Tests
 *
 * Runs all test-*.js files in this directory.
 * Each test file should export test functions that take (createChart, mockFetcher, assert).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock fetcher for tests
export const mockFetcher = {
    _data: {},

    setData(datasetId, data) {
        this._data[datasetId] = data;
    },

    async fetchDataset(datasetId) {
        if (this._data[datasetId]) {
            return this._data[datasetId];
        }
        // Default mock data
        return {
            id: datasetId,
            currency: 'USD',
            prices: [100, 110, 120, 130, 140],
            dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
        };
    },

    async fetchCurrencyRates(currency) {
        return {
            USD: 1,
            EUR: 0.9,
            GBP: 0.8,
            JPY: 150
        };
    }
};

// Assert helpers
export const assert = {
    ok(value, msg) {
        if (!value) {
            throw new Error(msg || 'Assertion failed: expected truthy value');
        }
    },

    equal(actual, expected, msg) {
        if (actual !== expected) {
            throw new Error(msg || `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    },

    deepEqual(actual, expected, msg) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            throw new Error(msg || `Deep equal failed:\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
        }
    },

    throws(fn, expectedMessage) {
        let threw = false;
        let actualMessage = '';
        try {
            fn();
        } catch (e) {
            threw = true;
            actualMessage = e.message;
        }
        if (!threw) {
            throw new Error('Expected function to throw, but it did not');
        }
        if (expectedMessage && !actualMessage.includes(expectedMessage)) {
            throw new Error(`Expected error message to include "${expectedMessage}", got "${actualMessage}"`);
        }
    },

    doesNotThrow(fn, msg) {
        try {
            fn();
        } catch (e) {
            throw new Error(msg || `Expected function not to throw, but got: ${e.message}`);
        }
    }
};

// Placeholder createChart - to be implemented
function createChart(options) {
    // TODO: Import from ../src/chart.js when implemented
    throw new Error('createChart not yet implemented - implement ../src/chart.js first');
}

async function runTests() {
    const testFiles = fs.readdirSync(__dirname)
        .filter(f => f.startsWith('test-') && f.endsWith('.js'))
        .sort();

    // Allow running specific test
    const specificTest = process.argv[2];
    const filesToRun = specificTest
        ? testFiles.filter(f => f.includes(specificTest))
        : testFiles;

    if (filesToRun.length === 0) {
        console.log('No tests found');
        process.exit(1);
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const failures = [];

    console.log(`Running ${filesToRun.length} test file(s)...\n`);

    for (const file of filesToRun) {
        const filePath = path.join(__dirname, file);
        let module;

        try {
            module = await import(filePath);
        } catch (e) {
            console.log(`SKIP: ${file} (import error: ${e.message})`);
            skipped++;
            continue;
        }

        // Get description
        const description = module.description || file;
        console.log(`\n${file}: ${description}`);

        // Find all exported test functions
        const testFns = Object.entries(module)
            .filter(([name, value]) =>
                (name === 'test' || name.startsWith('test')) &&
                typeof value === 'function'
            );

        if (testFns.length === 0) {
            console.log('  (no test functions found)');
            skipped++;
            continue;
        }

        for (const [name, fn] of testFns) {
            // Reset mock data between tests
            mockFetcher._data = {};

            try {
                await fn(createChart, mockFetcher, assert);
                console.log(`  PASS: ${name}`);
                passed++;
            } catch (e) {
                console.log(`  FAIL: ${name}`);
                console.log(`    ${e.message}`);
                failed++;
                failures.push({
                    file,
                    test: name,
                    error: e.message,
                    stack: e.stack
                });
            }
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

    if (failures.length > 0) {
        console.log('\nFailures:');
        for (const f of failures) {
            console.log(`\n  ${f.file}::${f.test}`);
            console.log(`    ${f.error}`);
        }
    }

    process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
runTests().catch(e => {
    console.error('Test runner error:', e);
    process.exit(1);
});

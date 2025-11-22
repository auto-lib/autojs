// Run all main tests against channel kernel (with error suppression)

import auto from './auto.js';
import fs from 'fs';
import path from 'path';

const TEST_DIR = '../../tests/files/';

// Suppress unhandled errors from async tests
process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

function isEqual(obj1, obj2) {
    if (typeof (obj1) != typeof (obj2)) return false;
    if (obj1 == null && obj2 == null) return true;
    if (obj1 == null && obj2 != null) return false
    if (obj1 != null && obj2 == null) return false;
    if (typeof obj1 === 'number' && isNaN(obj1) && isNaN(obj2)) return true;

    if (typeof (obj1) === 'object') {
        let keys = Object.keys(obj1);
        if (keys.length != Object.keys(obj2).length) return false;
        let equal = true;
        keys.forEach(key => {
            equal = equal && isEqual(obj1[key], obj2[key])
        });
        return equal;
    }
    else return obj1 == obj2;
}

async function runTest(testPath, testName) {
    try {
        const module = await import(testPath);
        const test = module.default;

        if (!test.obj) {
            return { name: testName, status: 'skip', reason: 'no obj' };
        }

        // Create the auto instance
        let $;
        try {
            // Always pass false for verbose to avoid debug output
            $ = auto(test.obj, false);
        } catch (err) {
            return { name: testName, status: 'error', error: `Init error: ${err.message}` };
        }

        // Run the test function if it exists
        let global = {};
        if (test.fn) {
            try {
                if (test.timeout) {
                    // Handle async tests
                    await new Promise((resolve) => {
                        try {
                            test.fn($, global);
                        } catch (err) {
                            // Ignore
                        }
                        setTimeout(() => {
                            try {
                                $.flush && $.flush();
                            } catch (err) {
                                // Ignore
                            }
                            resolve();
                        }, test.timeout + 50);
                    });
                } else {
                    test.fn($, global);
                    $.flush && $.flush();
                }
            } catch (err) {
                return { name: testName, status: 'error', error: `Test fn error: ${err.message}` };
            }
        }

        // Check results
        if (!test._) {
            return { name: testName, status: 'skip', reason: 'no expected state' };
        }

        const actual = $._;
        const expected = test._;

        let errors = [];

        // Check fn
        if (expected.fn !== undefined) {
            const expectedFn = Array.isArray(expected.fn) ? expected.fn.sort() : Object.keys(expected.fn).sort();
            const actualFn = Array.isArray(actual.fn) ? actual.fn.sort() : Object.keys(actual.fn).sort();
            if (!isEqual(expectedFn, actualFn)) {
                errors.push(`fn`);
            }
        }

        // Check deps
        if (expected.deps !== undefined) {
            if (!isEqual(expected.deps, actual.deps)) {
                errors.push(`deps`);
            }
        }

        // Check value
        if (expected.value !== undefined) {
            if (!isEqual(expected.value, actual.value)) {
                errors.push(`value`);
            }
        }

        // Check subs
        if (expected.subs !== undefined) {
            if (!isEqual(expected.subs, actual.subs)) {
                errors.push(`subs`);
            }
        }

        // Check fatal
        if (expected.fatal !== undefined) {
            if (!isEqual(expected.fatal, actual.fatal)) {
                errors.push(`fatal`);
            }
        }

        // Check global
        if (test.global) {
            Object.keys(test.global).forEach(key => {
                if (!isEqual(test.global[key], global[key])) {
                    errors.push(`global.${key}`);
                }
            });
        }

        if (errors.length === 0) {
            return { name: testName, status: 'pass' };
        } else {
            return { name: testName, status: 'fail', errors };
        }

    } catch (err) {
        return { name: testName, status: 'error', error: err.message };
    }
}

// Get all test files
const files = fs.readdirSync(TEST_DIR).filter(f => f.match(/^\d{3}.*\.js$/)).sort();

console.log(`Running ${files.length} tests...\n`);

let results = { pass: 0, fail: 0, error: 0, skip: 0 };
let failures = [];

// Run all tests sequentially
for (const file of files) {
    const testPath = path.join(TEST_DIR, file);
    const testName = file.replace('.js', '');

    const result = await runTest(testPath, testName);

    if (result.status === 'pass') {
        process.stdout.write('.');
        results.pass++;
    } else if (result.status === 'fail') {
        process.stdout.write('F');
        results.fail++;
        failures.push(result);
    } else if (result.status === 'error') {
        process.stdout.write('E');
        results.error++;
        failures.push(result);
    } else {
        process.stdout.write('S');
        results.skip++;
    }
}

console.log('\n');
console.log(`Results: ${results.pass} passed, ${results.fail} failed, ${results.error} errors, ${results.skip} skipped`);
console.log(`Success rate: ${Math.round(results.pass / files.length * 100)}%\n`);

if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => {
        if (f.status === 'fail') {
            console.log(`  ${f.name}: ${f.errors.join(', ')}`);
        } else {
            console.log(`  ${f.name}: ERROR - ${f.error}`);
        }
    });
}

process.exit(0); // Always exit 0 to see results

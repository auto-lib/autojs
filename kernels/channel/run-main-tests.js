// Run the main test suite against the channel kernel

import auto from './auto.js';
import fs from 'fs';
import path from 'path';

const TEST_DIR = '../../tests/files/';

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

function runTest(testFile) {
    const testName = path.basename(testFile, '.js');

    try {
        // Dynamic import the test
        import(testFile).then(module => {
            const test = module.default;

            // Create the auto instance
            let $ = auto(test.obj, test.opt);

            // Run the test function if it exists
            let global = {};
            if (test.fn) {
                test.fn($, global);
            }

            // If test has timeout, wait before checking
            if (test.timeout) {
                setTimeout(() => {
                    $.flush && $.flush();
                    checkResults(testName, test, $, global);
                }, test.timeout);
            } else {
                $.flush && $.flush();
                checkResults(testName, test, $, global);
            }
        }).catch(err => {
            console.error(`[${testName}] ERROR loading test:`, err.message);
        });
    } catch (err) {
        console.error(`[${testName}] ERROR:`, err.message);
    }
}

function checkResults(testName, test, $, global) {
    if (!test._) {
        console.log(`[${testName}] SKIP - no expected state`);
        return;
    }

    const actual = $._;
    const expected = test._;

    let passed = true;
    let errors = [];

    // Check fn
    if (expected.fn) {
        if (!isEqual(expected.fn.sort(), actual.fn.sort())) {
            passed = false;
            errors.push(`fn mismatch: expected ${JSON.stringify(expected.fn)}, got ${JSON.stringify(actual.fn)}`);
        }
    }

    // Check deps
    if (expected.deps) {
        if (!isEqual(expected.deps, actual.deps)) {
            passed = false;
            errors.push(`deps mismatch`);
        }
    }

    // Check value
    if (expected.value) {
        if (!isEqual(expected.value, actual.value)) {
            passed = false;
            errors.push(`value mismatch: expected ${JSON.stringify(expected.value)}, got ${JSON.stringify(actual.value)}`);
        }
    }

    // Check subs
    if (expected.subs) {
        if (!isEqual(expected.subs, actual.subs)) {
            passed = false;
            errors.push(`subs mismatch`);
        }
    }

    // Check fatal
    if (expected.fatal !== undefined) {
        if (!isEqual(expected.fatal, actual.fatal)) {
            passed = false;
            errors.push(`fatal mismatch: expected ${JSON.stringify(expected.fatal)}, got ${JSON.stringify(actual.fatal)}`);
        }
    }

    // Check global
    if (test.global) {
        Object.keys(test.global).forEach(key => {
            if (!isEqual(test.global[key], global[key])) {
                passed = false;
                errors.push(`global.${key} mismatch: expected ${test.global[key]}, got ${global[key]}`);
            }
        });
    }

    if (passed) {
        console.log(`[${testName}] ✓ PASS`);
    } else {
        console.log(`[${testName}] ✗ FAIL`);
        errors.forEach(err => console.log(`  - ${err}`));
        console.log('  Expected:', expected);
        console.log('  Actual:', actual);
    }
}

// Get all test files
const files = fs.readdirSync(TEST_DIR).filter(f => f.match(/^\d{3}.*\.js$/)).sort();

console.log(`Running ${files.length} tests...\n`);

// Run first 5 tests to start
files.slice(0, 5).forEach(file => {
    const testPath = path.join(TEST_DIR, file);
    runTest(testPath);
});

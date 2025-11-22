// Simple test runner for channel kernel against main test suite

import auto from './auto.js';

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
            console.log(`[${testName}] SKIP - no obj`);
            return true;
        }

        // Create the auto instance
        let $ = auto(test.obj, test.opt);

        // Run the test function if it exists
        let global = {};
        if (test.fn) {
            if (test.timeout) {
                // Handle async tests
                await new Promise(resolve => {
                    test.fn($, global);
                    setTimeout(() => {
                        $.flush && $.flush();
                        resolve();
                    }, test.timeout);
                });
            } else {
                test.fn($, global);
                $.flush && $.flush();
            }
        }

        // Check results
        if (!test._) {
            console.log(`[${testName}] SKIP - no expected state`);
            return true;
        }

        const actual = $._;
        const expected = test._;

        let passed = true;
        let errors = [];

        // Check fn
        if (expected.fn) {
            const expectedFn = Array.isArray(expected.fn) ? expected.fn.sort() : Object.keys(expected.fn).sort();
            const actualFn = Array.isArray(actual.fn) ? actual.fn.sort() : Object.keys(actual.fn).sort();
            if (!isEqual(expectedFn, actualFn)) {
                passed = false;
                errors.push(`fn: expected [${expectedFn}], got [${actualFn}]`);
            }
        }

        // Check deps
        if (expected.deps !== undefined) {
            if (!isEqual(expected.deps, actual.deps)) {
                passed = false;
                errors.push(`deps: ${JSON.stringify(actual.deps)} != ${JSON.stringify(expected.deps)}`);
            }
        }

        // Check value
        if (expected.value !== undefined) {
            if (!isEqual(expected.value, actual.value)) {
                passed = false;
                errors.push(`value mismatch`);
                console.log(`    Expected:`, expected.value);
                console.log(`    Got:`, actual.value);
            }
        }

        // Check subs
        if (expected.subs !== undefined) {
            if (!isEqual(expected.subs, actual.subs)) {
                passed = false;
                errors.push(`subs: ${JSON.stringify(actual.subs)} != ${JSON.stringify(expected.subs)}`);
            }
        }

        // Check fatal
        if (expected.fatal !== undefined) {
            if (!isEqual(expected.fatal, actual.fatal)) {
                passed = false;
                errors.push(`fatal: ${JSON.stringify(actual.fatal)} != ${JSON.stringify(expected.fatal)}`);
            }
        }

        // Check global
        if (test.global) {
            Object.keys(test.global).forEach(key => {
                if (!isEqual(test.global[key], global[key])) {
                    passed = false;
                    errors.push(`global.${key}: ${global[key]} != ${test.global[key]}`);
                }
            });
        }

        if (passed) {
            console.log(`[${testName}] ✓`);
        } else {
            console.log(`[${testName}] ✗`);
            errors.forEach(err => console.log(`    ${err}`));
        }

        return passed;

    } catch (err) {
        console.log(`[${testName}] ERROR: ${err.message}`);
        console.error(err.stack);
        return false;
    }
}

// Run a specific test
const testName = process.argv[2] || '001_empty';
const testPath = `../../tests/files/${testName}.js`;

console.log(`Testing channel kernel with: ${testName}\n`);

runTest(testPath, testName).then(passed => {
    console.log(passed ? '\n✓ Test passed' : '\n✗ Test failed');
    process.exit(passed ? 0 : 1);
});

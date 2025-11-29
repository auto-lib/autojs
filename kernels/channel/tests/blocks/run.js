// Test runner for blocks tests

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// deep equality check
function isEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (let key of keysA) {
        if (!isEqual(a[key], b[key])) return false;
    }
    return true;
}

function diff(expected, actual, ignore = []) {
    let diffs = [];
    let allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);

    for (let key of allKeys) {
        if (ignore.includes(key)) continue;
        if (!isEqual(expected[key], actual[key])) {
            diffs.push({
                key,
                expected: expected[key],
                actual: actual[key]
            });
        }
    }
    return diffs;
}

async function runTest(name, test) {
    let global = {};
    let system;

    try {
        // build system based on what's provided
        if (test.vm) {
            const vm = (await import('./vm.js')).default;
            system = vm(
                test.vm.name || 'test',
                test.vm.delayed || test.vm.handlers || {},
                test.vm.immediate || {}
            );
        }
        // future: else if (test.block) { ... }
        // future: else if (test.blocks) { ... }

        // run the test function
        if (test.fn) {
            test.fn(system, global);
        }

        // check results
        let passed = true;
        let failures = [];

        // check internal state
        if (test._) {
            let actual = system._();
            let d = diff(test._, actual, test.ignore || []);
            if (d.length > 0) {
                passed = false;
                failures.push({ type: '_', diffs: d });
            }
        }

        // check output (boundary)
        if (test.output) {
            let actual = system.output ? system.output() : {};
            let d = diff(test.output, actual, test.ignore || []);
            if (d.length > 0) {
                passed = false;
                failures.push({ type: 'output', diffs: d });
            }
        }

        // check global (side effects)
        if (test.global) {
            let d = diff(test.global, global, test.ignore || []);
            if (d.length > 0) {
                passed = false;
                failures.push({ type: 'global', diffs: d });
            }
        }

        return { name, passed, failures };

    } catch (e) {
        return { name, passed: false, error: e.message, stack: e.stack };
    }
}

function report(result) {
    if (result.passed) {
        console.log(`✓ ${result.name}`);
    } else {
        console.log(`✗ ${result.name}`);
        if (result.error) {
            console.log(`  error: ${result.error}`);
        }
        if (result.failures) {
            for (let f of result.failures) {
                console.log(`  ${f.type}:`);
                for (let d of f.diffs) {
                    console.log(`    ${d.key}:`);
                    console.log(`      expected:`, d.expected);
                    console.log(`      actual:  `, d.actual);
                }
            }
        }
    }
}

async function main() {
    let script = process.argv[2]; // optional: run single test
    let vmDir = path.join(__dirname, 'vm');

    let files = fs.readdirSync(vmDir)
        .filter(f => f.endsWith('.js') && /^\d{3}/.test(f))
        .sort();

    if (script) {
        files = files.filter(f => f.includes(script));
    }

    let passed = 0;
    let failed = 0;

    for (let file of files) {
        let test = (await import(`./vm/${file}`)).default;
        let name = file.replace('.js', '');
        let result = await runTest(name, test);
        report(result);
        if (result.passed) passed++;
        else failed++;
    }

    console.log(`\n${passed} passed, ${failed} failed`);
}

main();

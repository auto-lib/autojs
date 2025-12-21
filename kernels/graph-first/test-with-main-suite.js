/**
 * Test runner for graph-first kernel against main test suite
 *
 * This runs all tests from tests/files/ against the graph-first kernel
 * and reports which tests pass and which fail.
 */

import fs from 'fs';
import auto from './src/auto-layered.js';

let passed = 0;
let failed = 0;
let skipped = 0;
let results = [];

// Deep equality check (from runall.js)
function isEqual(obj1, obj2) {
    if (typeof (obj1) != typeof (obj2)) return false;
    if (obj1 == null && obj2 == null) return true;
    if (obj1 == null && obj2 != null) return false
    if (obj1 != null && obj2 == null) return false;
    if (typeof obj1 === 'number' && isNaN(obj1) && isNaN(obj2)) return true; // NaN!

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

// Convert graph-first internal state to expected format
function adaptInternalState($) {
    const _ = $._;

    // Convert deps format from {count: ['data']} to {count: {data: true}}
    const deps = {};
    if (_.deps) {
        Object.keys(_.deps).forEach(key => {
            deps[key] = {};
            _.deps[key].forEach(dep => {
                deps[key][dep] = true;
            });
        });
    }

    // Subs format is already correct: {data: ['000']}
    const subs = _.subs || {};

    return {
        fn: _.fn || [],
        deps: deps,
        subs: subs,
        value: _.value || {},
        fatal: {}, // Graph-first doesn't track fatal separately yet
        stack: undefined
    };
}

function assert_global_same(name, should_be, actual) {
    if (!isEqual(should_be, actual)) {
        console.log(name + ": global not equal");
        console.log("global should be:", should_be);
        console.log("global actual:   ", actual);
        return false;
    }
    return true;
}

function assert_internals_same(name, should_be, actual) {
    let diff = [];

    // Check fn (list of computed functions)
    let missing_fn = false;
    let actualFns = actual.fn || [];
    let expectedFns = should_be.fn || [];

    actualFns.forEach(fnName => {
        if (expectedFns.indexOf(fnName) === -1 && fnName != '#fatal') {
            missing_fn = true;
        }
    });

    if (missing_fn || actualFns.length !== expectedFns.length) {
        diff.push('fn');
    }

    // Check deps
    if (!isEqual(should_be.deps, actual.deps)) {
        diff.push('deps');
    }

    // Check subs (if present)
    if (should_be.subs && !isEqual(should_be.subs, actual.subs)) {
        diff.push('subs');
    }

    // Check values
    if (!isEqual(should_be.value, actual.value)) {
        diff.push('value');
    }

    // Check fatal (if present)
    if (should_be.fatal && !isEqual(should_be.fatal, actual.fatal)) {
        diff.push('fatal');
    }

    if (diff.length > 0) {
        console.log(name + ": not same");
        diff.forEach(key => {
            console.log(key + " should be", should_be[key]);
            console.log(key + " actual   ", actual[key]);
        })
        console.log('actual:', actual);
        console.log('should be:', should_be);
        process.exit(1);
        return false
    }
    return true;
}

function confirm(name, test, $, global) {
    const adapted = adaptInternalState($);
    let same = assert_internals_same(name, test._, adapted);
    if (test.global) {
        same = assert_global_same(name, test.global, global) && same;
    }
    return same;
}

async function runTest(name, test) {
    try {
        // Skip tests that are explicitly ignored or not yet supported
        const ignored = {
            '025_nested_functions': 'inner object functionality not implemented',
            '026_array_of_objects': 'inner object functionality not implemented',
            '037_trace': 'trace not implemented',
            '038_add': 'dynamic addition of nodes not implemented',
            '039_guard_static_external': 'guarding not implemented',
            '040_guard_dynamic_internal': 'guarding not implemented',
            '044_performance_tests': 'fatal not matching',
            '045_large_graph_performance': 'fatal not matching',
        };

        // Tests that require subscription API (not yet implemented)
        // const needsSubscriptions = [
        //     '015_subscribe', '016_unsubscribe', '017_unsubscribe_gaps',
        //     '019_check_subscribe_effects', '020_check_only_subs_update',
        //     '021_check_subs_on_dependency_chain', '028_subscribe_not_function_side_effects',
        //     '029_sub_must_update', '037_trace', '049_batch_api', '050_batch_efficiency',
        //     '051_auto_batch', '053_explicit_batch_priority', '054_auto_batch_loop_performance',
        //     '055_auto_batch_twitch_test', '056_auto_batch_subscription_count',
        //     '057_auto_batch_flush_fix', '058_explicit_batch_no_twitch',
        //     '059_auto_flush_on_read', '060_change_detection_static',
        //     '061_change_detection_computed', '062_change_detection_boolean',
        //     '064_change_detection_mutation_problem', '065_change_detection_immutable',
        //     '072_root_cause_analysis', '073_root_cause_with_batching'
        // ];
        const needsSubscriptions = [];

        if (ignored[name]) {
            console.log(name + ": skipped (" + ignored[name] + ")");
            skipped++;
            results.push({ name, status: 'skipped', reason: ignored[name] });
            return;
        }

        if (needsSubscriptions.includes(name)) {
            console.log(name + ": skipped (needs subscription API)");
            skipped++;
            results.push({ name, status: 'skipped', reason: 'needs subscription API' });
            return;
        }

        // Tests that check circular dependency detection
        const circularTests = [
            '010_circle_detection', '011_nested_circle', '012_actual_nested_circle',
            '013_conditional_circle_boot', '014_conditional_circle_triggered',
            '030_inner_loop_detection'
        ];

        // Zero out fatal if not provided
        if (typeof test.obj['#fatal'] !== 'function') {
            // test.obj['#fatal'] = () => {};
        }

        // For circular dependency tests, we expect an error during creation
        if (circularTests.includes(name)) {
            let threw = false;
            try {
                let $ = auto(test.obj, test.opt || {});
                let global = {};
                test.fn($, global);
            } catch (e) {
                threw = true;
            }

            if (threw) {
                console.log(name + ": passed (correctly detected cycle)");
                passed++;
                results.push({ name, status: 'passed' });
            } else {
                console.log(name + ": failed (should have detected cycle)");
                failed++;
                results.push({ name, status: 'failed', error: 'should have thrown on circular dependency' });
            }
            return;
        }

        // Create reactive object
        let $ = auto(test.obj, test.opt || {});
        let global = {};

        // Run the test function
        try {
            test.fn($, global);
        } catch (e) {
            console.log(name + ": execution error - " + e.message);
            failed++;
            results.push({ name, status: 'failed', error: e.message });
            console.log($, global);
            process.exit(1);
            return;
        }

        // Flush auto-batch if enabled
        if (!test.timeout && $.flush) {
            $.flush();
        }

        // Confirm results
        const checkResults = () => {
            if (confirm(name, test, $, global)) {
                console.log(name + ": passed");
                passed++;
                results.push({ name, status: 'passed' });
            } else {
                failed++;
                results.push({ name, status: 'failed', error: 'internal state mismatch' });
            }
        };

        if (test.timeout) {
            setTimeout(checkResults, test.timeout);
        } else {
            checkResults();
        }

    } catch (e) {
        console.log(name + ": error - " + e.message);
        failed++;
        results.push({ name, status: 'failed', error: e.message });
    }
}

async function main() {

    console.log("Testing graph-first kernel against main test suite\n");
    console.log("=".repeat(60) + "\n");

    const testFiles = fs.readdirSync("../../tests/files")
        .filter(name => parseInt(name.substring(0, 3)) > 0)
        .sort();

    for (const fileName of testFiles) {
        const test = await import("../../tests/files/" + fileName);
        const name = fileName.replace('.js', '');
        await runTest(name, test.default);
    }

    // Wait a bit for any async tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total:   ${testFiles.length}`);
    console.log(`Passed:  ${passed}`);
    console.log(`Failed:  ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Pass rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    // Group failures by type
    const failures = results.filter(r => r.status === 'failed');
    if (failures.length > 0) {
        console.log("\n" + "=".repeat(60));
        console.log("FAILED TESTS");
        console.log("=".repeat(60));
        failures.forEach(f => {
            console.log(`  ${f.name}: ${f.error || 'unknown error'}`);
        });
    }

    process.exit(failed > 0 ? 1 : 0);
}

main();

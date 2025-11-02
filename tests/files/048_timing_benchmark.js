// Timing benchmark: Measure actual performance with realistic workload
// Creates a wide graph with many branches to show O(affected) vs O(n) difference

export default {
    obj: {
        // Create 20 independent branches
        // Only changing branch_0 should be fast (not checking all 20 branches)

        branch_0: 0,
        derived_0a: ($) => $.branch_0 * 2,
        derived_0b: ($) => $.derived_0a * 2,

        branch_1: 1,
        derived_1a: ($) => $.branch_1 * 2,
        derived_1b: ($) => $.derived_1a * 2,

        branch_2: 2,
        derived_2a: ($) => $.branch_2 * 2,
        derived_2b: ($) => $.derived_2a * 2,

        branch_3: 3,
        derived_3a: ($) => $.branch_3 * 2,
        derived_3b: ($) => $.derived_3a * 2,

        branch_4: 4,
        derived_4a: ($) => $.branch_4 * 2,
        derived_4b: ($) => $.derived_4a * 2,

        branch_5: 5,
        derived_5a: ($) => $.branch_5 * 2,
        derived_5b: ($) => $.derived_5a * 2,

        branch_6: 6,
        derived_6a: ($) => $.branch_6 * 2,
        derived_6b: ($) => $.derived_6a * 2,

        branch_7: 7,
        derived_7a: ($) => $.branch_7 * 2,
        derived_7b: ($) => $.derived_7a * 2,

        branch_8: 8,
        derived_8a: ($) => $.branch_8 * 2,
        derived_8b: ($) => $.derived_8a * 2,

        branch_9: 9,
        derived_9a: ($) => $.branch_9 * 2,
        derived_9b: ($) => $.derived_9a * 2,

        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Change only branch_0 multiple times
        // With O(affected) optimization, this should be fast
        // (only checking 2 dependents, not all 30 functions)

        let iterations = 100;
        let start = performance.now();

        for (let i = 0; i < iterations; i++) {
            $.branch_0 = i;
        }

        let end = performance.now();
        let elapsed = end - start;

        global.iterations = iterations;
        global.fast_enough = (elapsed / iterations) < 1.0;

        // Print timing for informational purposes (not checked by test)
        if (elapsed / iterations < 1.0) {
            console.log(`[PERF] 048_timing_benchmark: ${iterations} updates in ${elapsed.toFixed(2)}ms (avg: ${(elapsed/iterations).toFixed(4)}ms per update)`);
        }
    },
    _: {
        fn: [
            'derived_0a', 'derived_0b',
            'derived_1a', 'derived_1b',
            'derived_2a', 'derived_2b',
            'derived_3a', 'derived_3b',
            'derived_4a', 'derived_4b',
            'derived_5a', 'derived_5b',
            'derived_6a', 'derived_6b',
            'derived_7a', 'derived_7b',
            'derived_8a', 'derived_8b',
            'derived_9a', 'derived_9b'
        ],
        deps: {
            derived_0a: { branch_0: true },
            derived_0b: { derived_0a: true },
            derived_1a: { branch_1: true },
            derived_1b: { derived_1a: true },
            derived_2a: { branch_2: true },
            derived_2b: { derived_2a: true },
            derived_3a: { branch_3: true },
            derived_3b: { derived_3a: true },
            derived_4a: { branch_4: true },
            derived_4b: { derived_4a: true },
            derived_5a: { branch_5: true },
            derived_5b: { derived_5a: true },
            derived_6a: { branch_6: true },
            derived_6b: { derived_6a: true },
            derived_7a: { branch_7: true },
            derived_7b: { derived_7a: true },
            derived_8a: { branch_8: true },
            derived_8b: { derived_8a: true },
            derived_9a: { branch_9: true },
            derived_9b: { derived_9a: true }
        },
        subs: {},
        value: {
            branch_0: 99,
            derived_0a: 198,
            derived_0b: 396,
            branch_1: 1,
            derived_1a: 2,
            derived_1b: 4,
            branch_2: 2,
            derived_2a: 4,
            derived_2b: 8,
            branch_3: 3,
            derived_3a: 6,
            derived_3b: 12,
            branch_4: 4,
            derived_4a: 8,
            derived_4b: 16,
            branch_5: 5,
            derived_5a: 10,
            derived_5b: 20,
            branch_6: 6,
            derived_6a: 12,
            derived_6b: 24,
            branch_7: 7,
            derived_7a: 14,
            derived_7b: 28,
            branch_8: 8,
            derived_8a: 16,
            derived_8b: 32,
            branch_9: 9,
            derived_9a: 18,
            derived_9b: 36
        },
        fatal: {}
    },
    global: {
        iterations: 100,
        fast_enough: true
    }
}

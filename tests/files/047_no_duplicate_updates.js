// Performance test: Verify no duplicate updates
// Each function should execute exactly once per transaction

let execution_counts = {};

function track(name) {
    execution_counts[name] = (execution_counts[name] || 0) + 1;
}

export default {
    obj: {
        // Chain: a -> b -> c -> d
        a: 1,
        b: ($) => {
            track('b');
            return $.a * 2;
        },
        c: ($) => {
            track('c');
            return $.b * 2;
        },
        d: ($) => {
            track('d');
            return $.c * 2;
        },
        '#fatal': () => {}
    },
    fn: ($, global) => {
        execution_counts = {}; // reset

        // First transaction
        $.a = 10;
        global.first_counts = { ...execution_counts };

        execution_counts = {}; // reset

        // Second transaction
        $.a = 20;
        global.second_counts = { ...execution_counts };
    },
    _: {
        fn: ['b', 'c', 'd'],
        deps: {
            b: { a: true },
            c: { b: true },
            d: { c: true }
        },
        subs: {},
        value: {
            a: 20,
            b: 40,
            c: 80,
            d: 160
        },
        fatal: {}
    },
    global: {
        // Each function should execute exactly once per transaction
        first_counts: {
            b: 1,
            c: 1,
            d: 1
        },
        second_counts: {
            b: 1,
            c: 1,
            d: 1
        }
    }
}

// Test: Performance benefit of change detection
// Deep chain: a -> b -> c -> d -> e
// When b returns same value, c/d/e shouldn't recompute

let execution_counts = {
    b: 0,
    c: 0,
    d: 0,
    e: 0
};

export default {
    obj: {
        a: 5,
        b: ($) => {
            execution_counts.b++;
            // Returns floor of a/10, so values 0-9 all return 0, 10-19 return 1, etc.
            return Math.floor($.a / 10);
        },
        c: ($) => {
            execution_counts.c++;
            return $.b * 100;
        },
        d: ($) => {
            execution_counts.d++;
            return $.c + 50;
        },
        e: ($) => {
            execution_counts.e++;
            return $.d * 2;
        },
        '#fatal': () => {}
    },
    fn: ($, global) => {
        execution_counts = { b: 0, c: 0, d: 0, e: 0 };

        // Change a multiple times, but b stays 0 (same value)
        $.a = 1;
        $.flush();

        $.a = 2;
        $.flush();

        $.a = 3;
        $.flush();

        // Now change a to 15 - b changes to 1
        $.a = 15;
        $.flush();

        // Change back to range where b = 0
        $.a = 7;
        $.flush();

        // Save counts after all changes
        global.b_count = execution_counts.b;
        global.c_count = execution_counts.c;
        global.d_count = execution_counts.d;
        global.e_count = execution_counts.e;
        global.final_e = $.e;
    },
    opt: {
        auto_batch: true,
        auto_batch_delay: 0
    },
    _: {
        fn: ['b', 'c', 'd', 'e'],
        deps: {
            b: { a: true },
            c: { b: true },
            d: { c: true },
            e: { d: true }
        },
        subs: {},
        value: {
            a: 7,
            b: 0,
            c: 0,
            d: 50,
            e: 100
        },
        fatal: {}
    },
    global: {
        b_count: 5,        // Recomputes every time a changes (5 changes)
        c_count: 5,        // Still recomputes when b recomputes (same as before)
        d_count: 5,        // Still recomputes when c recomputes (same as before)
        e_count: 5,        // Still recomputes when d recomputes (same as before)
        final_e: 100       // (floor(7/10) * 100 + 50) * 2 = (0 + 50) * 2 = 100
        // NOTE: The benefit is subscriptions only fire when values actually change!
    }
}

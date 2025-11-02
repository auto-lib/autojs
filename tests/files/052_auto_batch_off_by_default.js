// Test auto-batching is OFF by default

let _trace = [];
let put_trace = v => _trace.push(v);

export default {
    obj: {
        a: 0,
        b: 0,
        c: 0,
        result: ($) => $.a + $.b + $.c,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Rapid successive sets WITHOUT auto_batch enabled
        // Should create 3 separate transactions (default behavior)
        $.a = 1;
        $.b = 2;
        $.c = 3;

        global.txn_count = _trace.length;
        global.final_result = $.result;
    },
    opt: {
        auto_batch: false,
        trace: v => put_trace(v)
        // Note: auto_batch NOT enabled
    },
    _: {
        fn: ['result'],
        deps: {
            result: { a: true, b: true, c: true }
        },
        subs: {},
        value: {
            a: 1,
            b: 2,
            c: 3,
            result: 6
        },
        fatal: {}
    },
    global: {
        txn_count: 3,        // Three separate transactions (auto-batch disabled)
        final_result: 6
    }
}

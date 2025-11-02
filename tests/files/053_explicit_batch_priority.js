// Test explicit batch() takes priority over auto-batch

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
        // Even with auto-batch enabled, explicit batch() should work
        $.batch(() => {
            $.a = 1;
            $.b = 2;
            $.c = 3;
        });

        // Explicit batch should propagate immediately (synchronously)
        // Not wait for timer
        global.txn_count = _trace.length;
        global.trigger_count = _trace[0].triggers.length;
        global.final_result = $.result;
    },
    opt: {
        trace: v => put_trace(v),
        auto_batch: true,          // Auto-batch enabled
        auto_batch_delay: 0
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
        txn_count: 1,              // ONE transaction (explicit batch)
        trigger_count: 3,          // Three triggers
        final_result: 6            // Already available (synchronous)
    }
}

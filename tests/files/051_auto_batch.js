// Test auto-batching - rapid successive sets automatically batched

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
        // Rapid successive sets - should be auto-batched into ONE transaction
        $.a = 1;
        $.b = 2;
        $.c = 3;

        // Wait for auto-batch to flush (need to wait for next tick)
        setTimeout(() => {
            global.txn_count = _trace.length;
            global.trigger_count = _trace[0].triggers.length;
            global.trigger_names = _trace[0].triggers.map(t => t.name).sort();
            global.final_result = $.result;
            global.done = true;
        }, 10); // 10ms should be enough for 0ms delay
    },
    opt: {
        trace: v => put_trace(v),
        auto_batch: true,          // Enable auto-batching
        auto_batch_delay: 0        // 0ms = next tick
    },
    timeout: 50,  // Test needs to wait for auto-batch
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
        txn_count: 1,                      // ONE transaction (auto-batched)
        trigger_count: 3,                  // But 3 triggers in it
        trigger_names: ['a', 'b', 'c'],   // All three sets
        final_result: 6,
        done: true
    }
}

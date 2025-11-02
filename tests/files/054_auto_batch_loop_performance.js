// Real-world example: setting values in a loop with auto-batch

let _trace = [];
let put_trace = v => _trace.push(v);

export default {
    obj: {
        items: [],
        count: ($) => $.items.length,
        doubled: ($) => $.count * 2,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Loop setting items 10 times
        // With auto-batch enabled, all 10 sets accumulate
        // Then ONE transaction fires after the loop
        for (let i = 0; i < 10; i++) {
            $.items = Array(i + 1).fill('item');
        }

        // Wait for auto-batch to flush
        setTimeout(() => {
            global.txn_count = _trace.length;
            global.trigger_count = _trace[0].triggers.length;
            global.final_count = $.count;
            global.done = true;

            // Print performance info
            if (_trace.length === 1) {
                console.log('[PERF] 054: Loop of 10 sets created 1 transaction (auto-batched)');
            }
        }, 10);
    },
    opt: {
        trace: v => put_trace(v),
        auto_batch: true,
        auto_batch_delay: 0
    },
    timeout: 50,
    _: {
        fn: ['count', 'doubled'],
        deps: {
            count: { items: true },
            doubled: { count: true }
        },
        subs: {},
        value: {
            items: Array(10).fill('item'),
            count: 10,
            doubled: 20
        },
        fatal: {}
    },
    global: {
        txn_count: 1,         // ONE transaction (all 10 sets auto-batched)
        trigger_count: 10,    // But 10 triggers in it
        final_count: 10,
        done: true
    }
}

// Test: Using explicit batch() instead of auto-batch to prevent twitching
// Explicit batch is synchronous, so no stale reads

let read_log = [];
let sub_fires = [];

export default {
    obj: {
        a: 0,
        b: 0,
        result: ($) => $.a + $.b,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        read_log = [];
        sub_fires = [];

        // Subscribe to track updates
        let unsub = $['#'].result.subscribe(v => {
            sub_fires.push(v);
        });

        // SOLUTION: Use explicit batch() for synchronous updates
        $.batch(() => {
            $.a = 1;
            $.b = 2;
        });

        // Read immediately after batch - will be up-to-date
        read_log.push($.result);

        unsub();

        global.result_value = read_log[0];
        global.sub_fire_count = sub_fires.length;
        global.sub_values = sub_fires;
    },
    opt: {
        auto_batch: true,  // Even with auto-batch on, explicit batch() is synchronous
        auto_batch_delay: 0
    },
    _: {
        fn: ['result'],
        deps: {
            result: { a: true, b: true }
        },
        subs: {
            result: []
        },
        value: {
            a: 1,
            b: 2,
            result: 3
        },
        fatal: {}
    },
    global: {
        result_value: 3,                  // Correct value (synchronous!)
        sub_fire_count: 2,                // Initial (0) + after batch (3)
        sub_values: [0, 3]                // Initial and updated
    }
}

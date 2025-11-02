// Test: Auto-flush on read - no more twitching!
// When you read a value, pending auto-batch changes are automatically flushed

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

        // Set values (will be auto-batched)
        $.a = 1;
        $.b = 2;

        // Read immediately - should auto-flush and return correct value!
        // No need to call .flush() manually anymore
        read_log.push($.result);

        unsub();

        global.result_value = read_log[0];
        global.sub_fire_count = sub_fires.length;
        global.sub_values = sub_fires;
    },
    opt: {
        auto_batch: true,
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
        result_value: 3,                  // Correct value (auto-flushed!)
        sub_fire_count: 2,                // Initial (0) + after auto-flush (3)
        sub_values: [0, 3]                // Initial and updated - only fires once!
    }
}

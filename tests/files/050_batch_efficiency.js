// Test batch efficiency - batching should reduce subscription count

let sub_count = 0;
let batch_sub_count = 0;

export default {
    obj: {
        a: 0,
        b: 0,
        c: 0,

        // This depends on all three inputs
        result: ($) => $.a + $.b + $.c,

        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Subscribe to result
        $['#'].result.subscribe(() => {
            sub_count += 1;
        });

        // Test 1: Three separate sets without batch
        // Result subscription should fire 3 times (once per set)
        $.a = 1;
        $.b = 2;
        $.c = 3;

        global.without_batch_subs = sub_count - 1; // -1 for initial call

        // Reset and subscribe again
        batch_sub_count = 0;
        $['#'].result.subscribe(() => {
            batch_sub_count += 1;
        });

        // Test 2: Batch the three sets
        // Result subscription should fire only 1 time (for whole batch)
        $.batch(() => {
            $.a = 10;
            $.b = 20;
            $.c = 30;
        });

        global.with_batch_subs = batch_sub_count - 1; // -1 for initial call
        global.final_result = $.result;
    },
    _: {
        fn: ['result'],
        deps: {
            result: { a: true, b: true, c: true }
        },
        subs: {
            result: ['000', '001']  // two subscriptions
        },
        value: {
            a: 10,
            b: 20,
            c: 30,
            result: 60
        },
        fatal: {}
    },
    global: {
        without_batch_subs: 3,  // result subscription fired 3 times (once per set)
        with_batch_subs: 1,      // result subscription fired 1 time (once for whole batch)
        final_result: 60
    }
}

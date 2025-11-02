// Test subscription firing with auto-batch and immediate reads
// This checks if reading a value before auto-batch completes causes extra subscription fires

let sub_fires = [];

export default {
    obj: {
        a: 0,
        b: 0,
        result: ($) => $.a + $.b,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        sub_fires = [];

        // Subscribe to result changes
        let unsub = $['#'].result.subscribe(v => {
            sub_fires.push({ value: v, time: Date.now() });
        });

        // Simulate UI code: set values
        $.a = 1;
        $.b = 2;

        // UI immediately reads result (this might trigger extra update?)
        let immediate = $.result;

        // Wait for auto-batch
        setTimeout(() => {
            unsub();

            global.sub_fire_count = sub_fires.length;
            global.sub_values = sub_fires.map(f => f.value);
            global.immediate_read = immediate;
            global.done = true;
        }, 10);
    },
    opt: {
        auto_batch: true,
        auto_batch_delay: 0
    },
    timeout: 50,
    _: {
        fn: ['result'],
        deps: {
            result: { a: true, b: true }
        },
        subs: {
            result: []  // subscription was unsubscribed
        },
        value: {
            a: 1,
            b: 2,
            result: 3
        },
        fatal: {}
    },
    global: {
        sub_fire_count: 2,                // Initial (0) + after auto-flush (3)
        sub_values: [0, 3],               // Initial value, then updated value
        immediate_read: 3,                // FIXED: Auto-flush gives correct value!
        done: true
    }
}

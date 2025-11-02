// Test for UI "twitching" - reading values before auto-batch completes
// This simulates what happens when a UI framework reads values immediately after setting them

let read_log = [];

export default {
    obj: {
        a: 0,
        b: 0,
        result: ($) => $.a + $.b,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        read_log = [];

        // Simulate UI code: set values then immediately read result
        $.a = 1;
        $.b = 2;

        // UI reads result immediately (before timer fires)
        read_log.push({ when: 'immediately', result: $.result });

        // Wait for auto-batch to complete
        setTimeout(() => {
            // UI reads result after propagation
            read_log.push({ when: 'after_batch', result: $.result });

            global.immediate_result = read_log[0].result;
            global.after_batch_result = read_log[1].result;
            global.values_match = read_log[0].result === read_log[1].result;
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
        subs: {},
        value: {
            a: 1,
            b: 2,
            result: 3
        },
        fatal: {}
    },
    global: {
        immediate_result: 3,      // FIXED: Auto-flush means no more stale reads!
        after_batch_result: 3,    // NEW value (correct)
        values_match: true,       // They match - no twitching!
        done: true
    }
}

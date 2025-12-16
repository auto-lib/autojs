// Test that excessive function calls are detected and backed off
// If a function is called more than N times per second, it logs a warning
// and stops updating that function temporarily (backoff period)
// The rest of the system continues working normally

export default {
    obj: {
        counter: 0,
        result: ($) => $.counter * 2,
        '#fatal': () => {}
    },
    opt: {
        auto_batch: false,          // disable auto-batching so each set propagates immediately
        max_calls_per_second: 10,  // threshold: more than 10 calls/sec triggers backoff
        call_rate_window: 1000,     // check over 1 second window
        call_rate_backoff: 5000     // backoff for 5 seconds
    },
    fn: ($, global) => {
        // Trigger rapid updates that will exceed the threshold
        // After 11th call, result stops updating (in backoff)
        for (let i = 0; i < 15; i++) {
            $.counter = i;
        }
    },
    _: {
        fn: ['result'],
        deps: {
            result: { counter: true }
        },
        subs: {},
        value: {
            counter: 14,    // counter keeps updating
            result: 20      // result stops at the 11th update (10 * 2)
        },
        fatal: {}           // no fatal error - system continues working
    }
}

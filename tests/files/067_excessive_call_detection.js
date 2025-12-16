// Test that excessive function calls are detected
// If a function is called more than N times per second, it should fail
// and show the call stack to help debug why

export default {
    obj: {
        counter: 0,
        result: ($) => $.counter * 2,
        '#fatal': () => {}
    },
    opt: {
        auto_batch: false,          // disable auto-batching so each set propagates immediately
        max_calls_per_second: 10,  // threshold: more than 10 calls/sec triggers fatal
        call_rate_window: 1000     // check over 1 second window
    },
    fn: ($, global) => {
        // Trigger rapid updates that will exceed the threshold
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
            counter: 10
        },
        fatal: {
            msg: 'excessive calls detected',
            stack: ['result'],
            details: {
                function: 'result',
                calls: 11,
                window_ms: 1000,
                threshold: 10
            }
        }
    }
}

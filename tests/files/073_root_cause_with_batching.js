export default {
    obj: {
        counter: 0,
        doubled: ($) => $.counter * 2,
        tripled: ($) => $.counter * 3
    },
    opt: {
        max_calls_per_second: 10,
        excessive_calls_collection_period: 2000,
        call_rate_backoff: 1000,
        auto_batch: true  // Keep batching enabled
    },
    fn: ($, global) => {
        // Trigger excessive calls by setting rapidly with small delays
        // This will create separate transactions even with auto_batch
        let i = 0;
        let interval = setInterval(() => {
            $.counter = i++;
            if (i > 15) {
                clearInterval(interval);
                global.done = true;
            }
        }, 50); // 50ms between sets = 20 sets/second, exceeds threshold
    },
    timeout: 5000, // 15*50ms for sets + 2s collection + 1s backoff + 1s buffer
    _: {
        fn: ['doubled', 'tripled'],
        subs: [],
        deps: {
            doubled: { counter: true },
            tripled: { counter: true }
        },
        // During backoff, functions stop updating around counter=10
        // They remain at backed-off values (20, 30) even after counter reaches 15
        value: { counter: 15, doubled: 20, tripled: 30 },
        fatal: {}
    },
    global: {
        done: true
    }
}

export default {
    obj: {
        data: null,
        lines: ($) => $.data ? $.data.map(d => d * 2) : [],
        count: ($) => $.lines ? $.lines.length : 0,
        doubled_count: ($) => $.count * 2
    },
    fn: ($, global) => {
        // Set data multiple times rapidly to trigger excessive calls
        for (let i = 0; i < 15; i++) {
            $.data = [i, i+1, i+2];
        }

        // Wait for collection and backoff
        global.test_done = true;
    },
    timeout: 8000, // 2s collection + 5s backoff + 1s buffer
    _: {
        fn: ['lines', 'count', 'doubled_count'],
        subs: [],
        deps: {
            lines: { data: true },
            count: { lines: true },
            doubled_count: { count: true }
        },
        value: { data: [14, 15, 16], lines: [28, 30, 32], count: 3, doubled_count: 6 },
        fatal: {}
    },
    global: {
        test_done: true
    }
}

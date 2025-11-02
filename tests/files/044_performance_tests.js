// Performance tests to verify optimizations in 045

// Test 1: Verify subscriptions run exactly once per transaction
// (not once in setter + once in update)

let sub_counts = {};
let update_counts = {};

export default {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        doubled: ($) => $.count * 2,
        msg: ($) => `Count: ${$.count}, Doubled: ${$.doubled}`,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Subscribe to all values
        $['#'].data.subscribe(() => { sub_counts.data = (sub_counts.data || 0) + 1; });
        $['#'].count.subscribe(() => { sub_counts.count = (sub_counts.count || 0) + 1; });
        $['#'].doubled.subscribe(() => { sub_counts.doubled = (sub_counts.doubled || 0) + 1; });
        $['#'].msg.subscribe(() => { sub_counts.msg = (sub_counts.msg || 0) + 1; });

        // Set data - should trigger one propagation
        $.data = [1, 2, 3];

        // Store counts
        global.sub_counts = sub_counts;
        global.update_counts = update_counts;
    },
    opt: {
        count: true
    },
    _: {
        fn: ['count', 'doubled', 'msg'],
        deps: {
            count: { data: true },
            doubled: { count: true },
            msg: { count: true, doubled: true }
        },
        subs: {
            data: ['000'],
            count: ['000'],
            doubled: ['000'],
            msg: ['000']
        },
        value: { data: [1, 2, 3], count: 3, doubled: 6, msg: 'Count: 3, Doubled: 6' },
        fatal: {}
    },
    global: {
        // Each subscription should run exactly once per transaction
        // data: initial call (null) + set to [1,2,3] = 2 times
        // count, doubled, msg: initial call + recomputed = 2 times each
        sub_counts: {
            data: 2,      // subscribe initial + setter
            count: 2,     // subscribe initial + update
            doubled: 2,   // subscribe initial + update
            msg: 2        // subscribe initial + update
        },
        update_counts: {}
    }
}

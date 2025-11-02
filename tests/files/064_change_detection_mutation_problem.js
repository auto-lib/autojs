// Test: Hybrid change detection handles mutations correctly
// Arrays/objects always propagate, so mutations are detected

let sub_fires = [];

export default {
    obj: {
        items: [1, 2, 3],
        count: ($) => $.items.length,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        sub_fires = [];

        // Subscribe to count
        let unsub = $['#'].count.subscribe(v => {
            sub_fires.push(v);
        });

        // MUTABLE PATTERN: Mutate array in place, then set to same reference
        $.items.push(4);  // Mutates [1,2,3] to [1,2,3,4]
        $.items = $.items;  // Same reference, but it's an array so always propagates!

        $.flush();

        unsub();

        global.sub_fire_count = sub_fires.length;
        global.sub_values = sub_fires;
        global.final_count = $.count;
        global.final_items = $.items;
    },
    opt: {
        auto_batch: true,
        auto_batch_delay: 0
    },
    _: {
        fn: ['count'],
        deps: {
            count: { items: true }
        },
        subs: {
            count: []
        },
        value: {
            items: [1, 2, 3, 4],
            count: 4
        },
        fatal: {}
    },
    global: {
        sub_fire_count: 2,           // FIXED: Initial (3) + update (4)
        sub_values: [3, 4],          // FIXED: Sees both values!
        final_count: 4,              // Value is updated
        final_items: [1, 2, 3, 4]    // Array is mutated
    }
}

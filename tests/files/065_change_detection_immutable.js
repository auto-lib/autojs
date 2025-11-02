// Test: Hybrid change detection with immutable patterns
// New array/object references always propagate (as expected)

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

        // IMMUTABLE PATTERN: Create new array
        $.items = [...$.items, 4];  // New reference!

        $.flush();

        // Set to new array with same length (different reference)
        $.items = [5, 6, 7, 8];  // Same length, different items

        $.flush();

        unsub();

        global.sub_fire_count = sub_fires.length;
        global.sub_values = sub_fires;
        global.final_count = $.count;
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
            items: [5, 6, 7, 8],
            count: 4
        },
        fatal: {}
    },
    global: {
        sub_fire_count: 2,           // Initial (3) + first change (4) - second is also 4 so no fire!
        sub_values: [3, 4],          // Hybrid: arrays propagate, but count is primitive so only fires when changed
        final_count: 4               // This is the beauty of hybrid - smart subscriptions!
    }
}

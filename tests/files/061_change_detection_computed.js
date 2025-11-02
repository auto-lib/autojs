// Test: Change detection for computed values
// When a computed value returns the same result, don't propagate to dependents

let filter_count = 0;
let derived_count = 0;
let sub_fires = [];

export default {
    obj: {
        items: [1, 2, 3, 4, 5],
        min: 3,
        filtered: ($) => {
            filter_count++;
            return $.items.filter(x => x >= $.min);
        },
        derived: ($) => {
            derived_count++;
            return $.filtered.length;
        },
        '#fatal': () => {}
    },
    fn: ($, global) => {
        filter_count = 0;
        derived_count = 0;
        sub_fires = [];

        // Subscribe to derived
        let unsub = $['#'].derived.subscribe(v => {
            sub_fires.push(v);
        });

        // Change min to 2 - filtered becomes [2,3,4,5] (length 4)
        $.min = 2;
        $.flush();

        // Change items but filtered result stays [2,3,4,5] (length still 4)
        $.items = [2, 3, 4, 5];
        $.flush();

        // Change min to 5 - filtered becomes [5] (length 1)
        $.min = 5;
        $.flush();

        unsub();

        global.sub_fire_count = sub_fires.length;
        global.sub_values = sub_fires;
        global.filter_count = filter_count;
        global.derived_count = derived_count;
    },
    opt: {
        auto_batch: true,
        auto_batch_delay: 0
    },
    _: {
        fn: ['filtered', 'derived'],
        deps: {
            filtered: { items: true, min: true },
            derived: { filtered: true }
        },
        subs: {
            // Note: filtered has no subscription (it's unsubscribed in the test)
            derived: []
        },
        value: {
            items: [2, 3, 4, 5],
            min: 5,
            filtered: [5],
            derived: 1
        },
        fatal: {}
    },
    global: {
        sub_fire_count: 3,              // Initial (3) + first change (4) + third change (1)
        sub_values: [3, 4, 1],          // Correct values
        filter_count: 3,                // Recomputes 3 times (not 4 - change detection skips redundant sets)
        derived_count: 3                // Arrays use reference equality, so new arrays always count as changed
    }
}

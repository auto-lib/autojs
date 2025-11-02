// Test: Change detection for static values
// Setting a value to the same value should not trigger propagation

let sub_fires = [];
let update_count = 0;

export default {
    obj: {
        input: 5,
        doubled: ($) => {
            update_count++;
            return $.input * 2;
        },
        '#fatal': () => {}
    },
    fn: ($, global) => {
        sub_fires = [];
        update_count = 0;

        // Subscribe to doubled
        let unsub = $['#'].doubled.subscribe(v => {
            sub_fires.push(v);
        });

        // Set input to 10 - should trigger update
        $.input = 10;
        $.flush();

        // Set input to 10 again - should NOT trigger update (no change)
        $.input = 10;
        $.flush();

        // Set input to 20 - should trigger update
        $.input = 20;
        $.flush();

        unsub();

        global.sub_fire_count = sub_fires.length;
        global.sub_values = sub_fires;
        global.update_count = update_count;
        global.final_doubled = $.doubled;
    },
    opt: {
        auto_batch: true,
        auto_batch_delay: 0
    },
    _: {
        fn: ['doubled'],
        deps: {
            doubled: { input: true }
        },
        subs: {
            doubled: []
        },
        value: {
            input: 20,
            doubled: 40
        },
        fatal: {}
    },
    global: {
        sub_fire_count: 3,           // Initial (10) + first change (20) + second change (40)
        sub_values: [10, 20, 40],    // Only fires when value actually changes
        update_count: 2,              // Only 2 updates: 5->10, 10->20 (skips 10->10)
        final_doubled: 40
    }
}

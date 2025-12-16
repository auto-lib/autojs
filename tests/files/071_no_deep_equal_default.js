// Test that without deep_equal (default), objects always trigger updates
// This is the original behavior - objects/arrays always count as changed

export default {
    obj: {
        data: [1, 2, 3],
        // Returns a NEW array with the same contents each time
        normalized: ($) => $.data.slice(),
        // Depends on normalized - SHOULD update even if contents are the same
        count: ($) => $.normalized.length,
        tracker: ($) => $.count * 100,
        '#fatal': () => {}
    },
    opt: {
        // deep_equal is false by default
        auto_batch: false,
        count: true
    },
    fn: ($, global) => {
        // Save initial tracker value
        global.tracker_before = $.tracker;

        // Trigger an update - data gets a NEW array instance with SAME contents
        $.data = [1, 2, 3];

        // WITHOUT deep_equal, normalized returns a new array instance which counts as changed
        // So count and tracker SHOULD update even though values are the same
        global.tracker_after = $.tracker;
    },
    _: {
        fn: ['normalized', 'count', 'tracker'],
        deps: {
            normalized: { data: true },
            count: { normalized: true },
            tracker: { count: true }
        },
        subs: {},
        value: {
            data: [1, 2, 3],
            normalized: [1, 2, 3],
            count: 3,
            tracker: 300
        },
        fatal: {}
    },
    global: {
        tracker_before: 300,
        tracker_after: 300  // tracker gets recomputed (new value) even though result is same
    }
}

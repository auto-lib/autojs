// Test deep equality for arrays
// When deep_equal is enabled, returning a new array with the same contents
// should NOT trigger updates to dependent functions

export default {
    obj: {
        data: [1, 2, 3],
        // Returns a NEW array with the same contents each time
        normalized: ($) => $.data.slice(),
        // Depends on normalized - should not update if normalized hasn't changed by value
        count: ($) => $.normalized.length,
        tracker: ($) => $.count * 100,  // Just to track if count updated
        '#fatal': () => {}
    },
    opt: {
        deep_equal: true,
        auto_batch: false,
        count: true  // Track update counts
    },
    fn: ($, global) => {
        // Trigger an update - data gets a NEW array instance but SAME contents
        $.data = [1, 2, 3];

        // With deep_equal, normalized should return [1,2,3] which equals old value
        // So count and tracker should NOT update
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
    }
}

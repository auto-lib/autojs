// Test: Change detection with booleans
// Common case: setting a boolean to its current value

let check_count = 0;
let message_count = 0;
let sub_fires = [];

export default {
    obj: {
        isActive: false,
        count: 0,
        shouldShow: ($) => {
            check_count++;
            return $.isActive && $.count > 0;
        },
        message: ($) => {
            message_count++;
            return $.shouldShow ? 'Active' : 'Inactive';
        },
        '#fatal': () => {}
    },
    fn: ($, global) => {
        check_count = 0;
        message_count = 0;
        sub_fires = [];

        // Subscribe to message
        let unsub = $['#'].message.subscribe(v => {
            sub_fires.push(v);
        });

        // Set isActive to false (already false - no change)
        $.isActive = false;
        $.flush();

        // Set count to 5 (shouldShow still false because isActive is false)
        $.count = 5;
        $.flush();

        // Set isActive to true (shouldShow becomes true)
        $.isActive = true;
        $.flush();

        // Set isActive to true again (no change)
        $.isActive = true;
        $.flush();

        // Set count to 10 (shouldShow still true)
        $.count = 10;
        $.flush();

        unsub();

        global.sub_fire_count = sub_fires.length;
        global.sub_values = sub_fires;
        global.check_count = check_count;
        global.message_count = message_count;
    },
    opt: {
        auto_batch: true,
        auto_batch_delay: 0
    },
    _: {
        fn: ['shouldShow', 'message'],
        deps: {
            shouldShow: { isActive: true, count: true },
            message: { shouldShow: true }
        },
        subs: {
            // Note: shouldShow has no subscription (not subscribed in test)
            message: []
        },
        value: {
            isActive: true,
            count: 10,
            shouldShow: true,
            message: 'Active'
        },
        fatal: {}
    },
    global: {
        sub_fire_count: 2,                    // Initial (Inactive) + when shouldShow changes (Active)
        sub_values: ['Inactive', 'Active'],   // Only two distinct values - subscriptions only fire on change!
        check_count: 2,                       // Recomputes when inputs change (but not redundant sets)
        message_count: 2                      // Recomputes when shouldShow recomputes (but sub only fires on change)
    }
}

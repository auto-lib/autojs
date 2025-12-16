// Test deep equality for objects
// When deep_equal is enabled, returning a new object with the same contents
// should NOT trigger updates to dependent functions

export default {
    obj: {
        user: { name: 'Alice', age: 30 },
        // Returns a NEW object with the same contents each time
        profile: ($) => ({ name: $.user.name, age: $.user.age }),
        // Depends on profile - should not update if profile hasn't changed by value
        display: ($) => `${$.profile.name} (${$.profile.age})`,
        '#fatal': () => {}
    },
    opt: {
        deep_equal: true,
        auto_batch: false
    },
    fn: ($, global) => {
        // Trigger an update - user gets a NEW object instance but SAME contents
        $.user = { name: 'Alice', age: 30 };

        // With deep_equal, profile should return {name: 'Alice', age: 30} which equals old value
        // So display should NOT update
    },
    _: {
        fn: ['profile', 'display'],
        deps: {
            profile: { user: true },
            display: { profile: true }
        },
        subs: {},
        value: {
            user: { name: 'Alice', age: 30 },
            profile: { name: 'Alice', age: 30 },
            display: 'Alice (30)'
        },
        fatal: {}
    }
}

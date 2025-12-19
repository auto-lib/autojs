// Test that deep_equal handles circular references without stack overflow
// This prevents "RangeError: Maximum call stack size exceeded"

export default {
    obj: {
        // Objects with circular references
        obj1: { name: 'circle', child: null },
        obj2: { name: 'circle', child: null },

        // Computed function that returns the objects
        result: ($) => {
            // Create circular references
            if (!$.obj1.child) $.obj1.child = $.obj1;
            if (!$.obj2.child) $.obj2.child = $.obj2;

            // This comparison should NOT stack overflow
            // Both objects have the same structure (circular reference to self)
            return 'ok';
        },

        '#fatal': () => {}
    },
    opt: {
        deep_equal: true,
        auto_batch: false
    },
    fn: ($, global) => {
        // Trigger update - set obj1 to a new object with same structure
        // This should use deep_equal and not crash
        let newObj = { name: 'circle', child: null };
        newObj.child = newObj; // circular reference
        $.obj1 = newObj;

        // Should complete without error
    },
    _: {
        fn: ['result'],
        deps: {
            result: { obj1: true, obj2: true }
        },
        subs: {},
        value: {
            obj1: (v) => v && v.name === 'circle' && v.child === v,
            obj2: (v) => v && v.name === 'circle' && v.child === v,
            result: 'ok'
        },
        fatal: {}
    }
}

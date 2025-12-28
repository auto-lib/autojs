// Test: Single computed function

export default {
    obj: {
        func: ($) => 'val'
    },
    fn: ($) => {},
    _: {
        fn: ['func'],
        deps: { func: {} },
        value: { func: 'val' },
        stale: [],
        fatal: {}
    }
};

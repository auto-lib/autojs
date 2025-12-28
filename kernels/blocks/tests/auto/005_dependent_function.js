// Test: Function depends on another function

export default {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0
    },
    fn: ($) => {},
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        value: { count: 0, data: null },
        stale: [],
        fatal: {}
    }
};

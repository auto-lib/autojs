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
        value: { data: null, count: 0 },
        stale: []
    }
};

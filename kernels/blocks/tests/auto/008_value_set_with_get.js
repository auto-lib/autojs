// Test: Setting value and reading computed value

export default {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0
    },
    fn: ($) => {
        $.data = [1, 2, 3];
        let x = $.count;  // Force evaluation
    },
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        value: { count: 3, data: [1, 2, 3] },
        stale: [],
        fatal: {}
    }
};

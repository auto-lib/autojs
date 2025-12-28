// Test: Setting value triggers dependent function

export default {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0
    },
    fn: ($) => {
        $.data = [1, 2, 3];
    },
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        value: { data: [1, 2, 3], count: 3 },
        stale: []
    }
};

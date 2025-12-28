// Test: Conditional dependency is itself a function

export default {
    obj: {
        data1: null,
        func1: ($) => $.data1 ? $.data1.length : null,
        func2: ($) => $.func1 ? $.func1.length : ($.data2 ? $.data2.length : 0),
        data2: null
    },
    fn: ($) => {},
    _: {
        fn: ['func1', 'func2'],
        deps: {
            func1: { data1: true },
            func2: { data2: true, func1: true }
        },
        value: { data1: null, data2: null, func1: null, func2: 0 },
        stale: [],
        fatal: {}
    }
};

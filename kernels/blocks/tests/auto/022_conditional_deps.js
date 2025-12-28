// Test: Dependencies change conditionally

export default {
    obj: {
        enabled: true,
        data: [1, 2, 3],
        fallback: [],
        result: ($) => $.enabled ? $.data : $.fallback
    },
    fn: ($) => {},
    _: {
        fn: ['result'],
        deps: {
            result: { enabled: true, data: true, fallback: true }  // Static analysis finds all
        },
        value: { enabled: true, data: [1, 2, 3], fallback: [], result: [1, 2, 3] },
        stale: []
    }
};

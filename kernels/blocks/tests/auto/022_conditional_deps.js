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
            result: { data: true, enabled: true, fallback: true }  // Static analysis finds all
        },
        value: { data: [1, 2, 3], enabled: true, fallback: [], result: [1, 2, 3] },
        stale: [],
        fatal: {}
    }
};

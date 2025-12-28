// Test: Conditional dependencies (static analysis finds ALL branches)

export default {
    setup: ({ analyzeFunction }) => {
        const fn = ($) => $.enabled ? $.data : $.fallback;
        return analyzeFunction(fn, 'result');
    },
    expected: {
        deps: ['data', 'enabled', 'fallback']  // All branches
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

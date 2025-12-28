// Test: Self-references are excluded from dependencies

export default {
    setup: ({ analyzeFunction }) => {
        const fn = ($) => $.count + 1;
        return analyzeFunction(fn, 'count');  // 'count' should be excluded
    },
    expected: {
        deps: []  // $.count is excluded because name='count'
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

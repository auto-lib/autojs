// Test: Function with multiple dependencies

export default {
    setup: ({ analyzeFunction }) => {
        const fn = (_) => _.x + _.y + _.z;
        return analyzeFunction(fn, 'sum');
    },
    expected: {
        deps: ['x', 'y', 'z']
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

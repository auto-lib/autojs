// Test: Function with no dependencies

export default {
    setup: ({ analyzeFunction }) => {
        const fn = ($) => 5;
        return analyzeFunction(fn, 'value');
    },
    expected: {
        deps: []
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

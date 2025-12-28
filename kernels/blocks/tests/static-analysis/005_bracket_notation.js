// Test: Bracket notation $["property"]

export default {
    setup: ({ analyzeFunction }) => {
        const fn = ($) => $["data"] + $['count'];
        return analyzeFunction(fn, 'result');
    },
    expected: {
        deps: ['count', 'data']
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

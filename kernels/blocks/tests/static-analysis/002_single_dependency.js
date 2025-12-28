// Test: Function with single dependency ($.x)

export default {
    setup: ({ analyzeFunction }) => {
        const fn = ($) => $.x;
        return analyzeFunction(fn, 'result');
    },
    expected: {
        deps: ['x']
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

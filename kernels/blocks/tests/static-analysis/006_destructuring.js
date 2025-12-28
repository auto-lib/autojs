// Test: Destructuring const { x, y } = $

export default {
    setup: ({ analyzeFunction }) => {
        const fn = ($) => {
            const { x, y } = $;
            return x + y;
        };
        return analyzeFunction(fn, 'sum');
    },
    expected: {
        deps: ['x', 'y']
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

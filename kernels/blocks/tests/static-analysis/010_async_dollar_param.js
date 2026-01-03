/**
 * Test: Async function with $ parameter
 *
 * This test catches the bug where the regex failed to match $ in async functions.
 * The pattern /^\s*(?:async\s+)?\(?\s*(\w+)/ would match "async" instead of "$"
 * because \w doesn't include $.
 *
 * Fixed by using: /^\s*(?:async\s+)?\(?\s*([a-zA-Z_$][\w$]*)/
 */

export default {
    setup: ({ analyzeFunction }) => {
        // Test async arrow function with $ parameter
        const fn = async $ => {
            if ($.data && $.name && $.data.length > 0) {
                const dataset = $.data.find(d => d.nickname === $.name);
                return await $.fetchDataset(dataset);
            }
            return null;
        };
        return analyzeFunction(fn, 'pre_dataset');
    },
    expected: {
        deps: ['data', 'fetchDataset', 'name']
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};

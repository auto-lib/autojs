// Test: Resolve all stale values at once

export default {
    setup: ({ Resolver, buildGraph }) => {
        const functions = {
            a: 1,
            b: ($) => $.a + 1,
            c: ($) => $.b + 1,
            d: ($) => $.c + 1
        };
        const graph = buildGraph(functions);
        return new Resolver(graph, functions);
    },
    expected: {
        staleBefore: ['b', 'c', 'd'],
        staleAfter: [],
        values: { a: 1, b: 2, c: 3, d: 4 }
    },
    validate: (resolver, expected) => {
        const staleBefore = resolver.getStale().sort();

        resolver.resolveAll();

        const staleAfter = resolver.getStale().sort();

        return {
            staleBefore,
            staleAfter,
            values: {
                a: resolver.get('a'),
                b: resolver.get('b'),
                c: resolver.get('c'),
                d: resolver.get('d')
            }
        };
    }
};

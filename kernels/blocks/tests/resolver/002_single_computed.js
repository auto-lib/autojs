// Test: Resolver with single computed value

export default {
    setup: ({ Resolver, buildGraph }) => {
        const functions = {
            x: 5,
            doubled: ($) => $.x * 2
        };
        const graph = buildGraph(functions);
        return new Resolver(graph, functions);
    },
    expected: {
        x: 5,
        doubled: 10,
        staleBeforeGet: ['doubled'],
        staleAfterGet: []
    },
    validate: (resolver, expected) => {
        const staleBeforeGet = resolver.getStale().sort();
        const doubled = resolver.get('doubled');
        const staleAfterGet = resolver.getStale().sort();

        return {
            x: resolver.get('x'),
            doubled,
            staleBeforeGet,
            staleAfterGet
        };
    }
};

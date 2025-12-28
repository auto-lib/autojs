// Test: Setting a value marks dependents as stale

export default {
    setup: ({ Resolver, buildGraph }) => {
        const functions = {
            x: 5,
            doubled: ($) => $.x * 2,
            tripled: ($) => $.x * 3
        };
        const graph = buildGraph(functions);
        const resolver = new Resolver(graph, functions);

        // Clear initial stale
        resolver.resolveAll();

        return { resolver, graph, functions };
    },
    expected: {
        initialStale: [],
        doubledBefore: 10,
        staleAfterSet: ['doubled', 'tripled'],
        doubledAfter: 20,
        tripledAfter: 30
    },
    validate: ({ resolver }, expected) => {
        const initialStale = resolver.getStale().sort();
        const doubledBefore = resolver.get('doubled');

        // Set x to 10
        resolver.set('x', 10);

        const staleAfterSet = resolver.getStale().sort();
        const doubledAfter = resolver.get('doubled');
        const tripledAfter = resolver.get('tripled');

        return {
            initialStale,
            doubledBefore,
            staleAfterSet,
            doubledAfter,
            tripledAfter
        };
    }
};

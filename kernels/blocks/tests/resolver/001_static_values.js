// Test: Resolver with static values only

export default {
    setup: ({ Resolver, buildGraph }) => {
        const functions = { x: 5, y: 10 };
        const graph = buildGraph(functions);
        return new Resolver(graph, functions);
    },
    expected: {
        x: 5,
        y: 10,
        stale: []
    },
    validate: (resolver, expected) => {
        return {
            x: resolver.get('x'),
            y: resolver.get('y'),
            stale: resolver.getStale().sort()
        };
    }
};

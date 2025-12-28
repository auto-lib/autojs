// Test: Chained dependencies resolve in order

export default {
    setup: ({ Resolver, buildGraph }) => {
        const functions = {
            x: 1,
            y: ($) => $.x + 1,
            z: ($) => $.y + 1
        };
        const graph = buildGraph(functions);
        return new Resolver(graph, functions);
    },
    expected: {
        x: 1,
        y: 2,
        z: 3
    },
    validate: (resolver, expected) => {
        return {
            x: resolver.get('x'),
            y: resolver.get('y'),
            z: resolver.get('z')
        };
    }
};

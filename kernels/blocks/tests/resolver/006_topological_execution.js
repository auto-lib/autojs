// Test: Functions execute in topological order (dependencies first)

export default {
    setup: ({ Resolver, buildGraph }) => {
        const executionOrder = [];

        const functions = {
            a: 1,
            b: ($) => { executionOrder.push('b'); return $.a + 1; },
            c: ($) => { executionOrder.push('c'); return $.b + 1; },
            d: ($) => { executionOrder.push('d'); return $.c + 1; }
        };

        const graph = buildGraph(functions);
        const resolver = new Resolver(graph, functions);

        return { resolver, executionOrder };
    },
    expected: {
        // b must execute before c, c before d
        executionOrder: ['b', 'c', 'd'],
        values: { a: 1, b: 2, c: 3, d: 4 }
    },
    validate: ({ resolver, executionOrder }, expected) => {
        resolver.resolveAll();

        return {
            executionOrder,
            values: {
                a: resolver.get('a'),
                b: resolver.get('b'),
                c: resolver.get('c'),
                d: resolver.get('d')
            }
        };
    }
};

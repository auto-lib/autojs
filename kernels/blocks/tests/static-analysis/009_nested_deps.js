// Test: Build graph with nested dependencies
// a depends on b, b depends on c

export default {
    setup: ({ buildGraph }) => {
        const functions = {
            c: 1,
            b: ($) => $.c * 2,
            a: ($) => $.b + 10
        };
        return buildGraph(functions);
    },
    expected: {
        nodes: ['a', 'b', 'c'],
        // Topological order: c, b, a
        order: ['c', 'b', 'a'],
        aPredecessors: ['b'],
        bPredecessors: ['c'],
        cPredecessors: []
    },
    validate: (graph, expected) => {
        return {
            nodes: Array.from(graph.nodes.keys()).sort(),
            order: graph.topologicalSort(),
            aPredecessors: Array.from(graph.getPredecessors('a')).sort(),
            bPredecessors: Array.from(graph.getPredecessors('b')).sort(),
            cPredecessors: Array.from(graph.getPredecessors('c')).sort()
        };
    }
};

// Test: Single node with no edges

export default {
    setup: (DirectedGraph) => {
        const graph = new DirectedGraph();
        graph.addNode('a');
        return graph;
    },
    expected: {
        nodes: ['a'],
        edges: [['a', []]],
        size: 1,
        edgeCount: 0,
        hasA: true,
        hasB: false
    },
    validate: (graph, expected) => {
        return {
            nodes: Array.from(graph.nodes.keys()),
            edges: Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)]),
            size: graph.size(),
            edgeCount: graph.countEdges(),
            hasA: graph.has('a'),
            hasB: graph.has('b')
        };
    }
};

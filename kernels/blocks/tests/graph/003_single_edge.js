// Test: Two nodes with single edge

export default {
    setup: (DirectedGraph) => {
        const graph = new DirectedGraph();
        graph.addNode('a');
        graph.addNode('b');
        graph.addEdge('a', 'b');  // a -> b
        return graph;
    },
    expected: {
        nodes: ['a', 'b'],
        edges: [['a', ['b']], ['b', []]],
        size: 2,
        edgeCount: 1,
        successorsA: ['b'],
        successorsB: [],
        predecessorsA: [],
        predecessorsB: ['a']
    },
    validate: (graph, expected) => {
        return {
            nodes: Array.from(graph.nodes.keys()),
            edges: Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)]),
            size: graph.size(),
            edgeCount: graph.countEdges(),
            successorsA: Array.from(graph.getSuccessors('a')),
            successorsB: Array.from(graph.getSuccessors('b')),
            predecessorsA: Array.from(graph.getPredecessors('a')),
            predecessorsB: Array.from(graph.getPredecessors('b'))
        };
    }
};

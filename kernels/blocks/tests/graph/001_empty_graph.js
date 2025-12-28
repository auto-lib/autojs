// Test: Empty graph has no nodes or edges

export default {
    setup: (DirectedGraph) => {
        return new DirectedGraph();
    },
    expected: {
        nodes: [],
        edges: [],
        size: 0,
        edgeCount: 0
    },
    validate: (graph, expected) => {
        return {
            nodes: Array.from(graph.nodes.keys()),
            edges: Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)]),
            size: graph.size(),
            edgeCount: graph.countEdges()
        };
    }
};

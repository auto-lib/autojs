// Test: Diamond dependency pattern
//     a
//    / \
//   b   c
//    \ /
//     d

export default {
    setup: (DirectedGraph) => {
        const graph = new DirectedGraph();
        graph.addNode('a');
        graph.addNode('b');
        graph.addNode('c');
        graph.addNode('d');
        graph.addEdge('a', 'b');
        graph.addEdge('a', 'c');
        graph.addEdge('b', 'd');
        graph.addEdge('c', 'd');
        return graph;
    },
    expected: {
        size: 4,
        edgeCount: 4,
        hasCycle: false,
        // a must come first, d must come last
        orderFirstLast: ['a', 'd']
    },
    validate: (graph, expected) => {
        const order = graph.topologicalSort();
        return {
            size: graph.size(),
            edgeCount: graph.countEdges(),
            hasCycle: graph.hasCycle(),
            orderFirstLast: [order[0], order[order.length - 1]]
        };
    }
};

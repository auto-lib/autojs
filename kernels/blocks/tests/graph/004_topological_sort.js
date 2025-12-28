// Test: Topological sort - dependencies before dependents

export default {
    setup: (DirectedGraph) => {
        const graph = new DirectedGraph();
        graph.addNode('a');
        graph.addNode('b');
        graph.addNode('c');
        graph.addEdge('a', 'b');  // a -> b
        graph.addEdge('b', 'c');  // b -> c
        return graph;
    },
    expected: {
        // a must come before b, b must come before c
        order: ['a', 'b', 'c'],
        hasCycle: false
    },
    validate: (graph, expected) => {
        return {
            order: graph.topologicalSort(),
            hasCycle: graph.hasCycle()
        };
    }
};

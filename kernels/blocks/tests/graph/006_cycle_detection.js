// Test: Cycle detection - a -> b -> a

export default {
    setup: (DirectedGraph) => {
        const graph = new DirectedGraph();
        graph.addNode('a');
        graph.addNode('b');
        graph.addEdge('a', 'b');
        graph.addEdge('b', 'a');  // Creates cycle
        return graph;
    },
    expected: {
        hasCycle: true,
        throwsOnSort: true
    },
    validate: (graph, expected) => {
        let throwsOnSort = false;
        try {
            graph.topologicalSort();
        } catch (e) {
            throwsOnSort = e.message.includes('Cycle detected');
        }

        return {
            hasCycle: graph.hasCycle(),
            throwsOnSort
        };
    }
};

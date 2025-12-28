// Test: Get all nodes reachable from a starting node
// a -> b -> c -> d

export default {
    setup: (DirectedGraph) => {
        const graph = new DirectedGraph();
        graph.addNode('a');
        graph.addNode('b');
        graph.addNode('c');
        graph.addNode('d');
        graph.addEdge('a', 'b');
        graph.addEdge('b', 'c');
        graph.addEdge('c', 'd');
        return graph;
    },
    expected: {
        reachableFromA: ['b', 'c', 'd'],
        reachableFromB: ['c', 'd'],
        reachableFromC: ['d'],
        reachableFromD: []
    },
    validate: (graph, expected) => {
        return {
            reachableFromA: Array.from(graph.getReachable(['a'])).sort(),
            reachableFromB: Array.from(graph.getReachable(['b'])).sort(),
            reachableFromC: Array.from(graph.getReachable(['c'])).sort(),
            reachableFromD: Array.from(graph.getReachable(['d'])).sort()
        };
    }
};

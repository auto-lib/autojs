// Test: Get all nodes that can reach a target node
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
        ancestorsA: [],
        ancestorsB: ['a'],
        ancestorsC: ['a', 'b'],
        ancestorsD: ['a', 'b', 'c']
    },
    validate: (graph, expected) => {
        return {
            ancestorsA: Array.from(graph.getAncestors(['a'])).sort(),
            ancestorsB: Array.from(graph.getAncestors(['b'])).sort(),
            ancestorsC: Array.from(graph.getAncestors(['c'])).sort(),
            ancestorsD: Array.from(graph.getAncestors(['d'])).sort()
        };
    }
};

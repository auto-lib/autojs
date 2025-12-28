// Test: Build graph from functions object

export default {
    setup: ({ buildGraph }) => {
        const functions = {
            x: 5,
            y: 10,
            sum: ($) => $.x + $.y
        };
        return buildGraph(functions);
    },
    expected: {
        nodes: ['sum', 'x', 'y'],
        nodeTypes: {
            x: 'static',
            y: 'static',
            sum: 'computed'
        },
        // Edges: x->sum, y->sum
        sumPredecessors: ['x', 'y'],
        xSuccessors: ['sum'],
        ySuccessors: ['sum']
    },
    validate: (graph, expected) => {
        const nodeTypes = {};
        for (let [name, metadata] of graph.nodes) {
            nodeTypes[name] = metadata.type;
        }

        return {
            nodes: Array.from(graph.nodes.keys()).sort(),
            nodeTypes,
            sumPredecessors: Array.from(graph.getPredecessors('sum')).sort(),
            xSuccessors: Array.from(graph.getSuccessors('x')).sort(),
            ySuccessors: Array.from(graph.getSuccessors('y')).sort()
        };
    }
};

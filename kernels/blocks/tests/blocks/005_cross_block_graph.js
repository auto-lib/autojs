// Test: Build cross-block graph from multiple blocks

export default {
    setup: ({ Block, wire, buildCrossBlockGraph }) => {
        const b1 = new Block({
            name: 'source',
            functions: { data: [1, 2, 3] }
        });

        const b2 = new Block({
            name: 'processor',
            functions: {
                data: null,
                result: ($) => $.data.length
            }
        });

        const wires = [wire('source', 'data', 'processor', 'data')];

        return buildCrossBlockGraph([b1, b2], wires);
    },
    expected: {
        nodes: ['processor.data', 'processor.result', 'source.data'],
        nodeCount: 3,
        // source.data -> processor.data -> processor.result
        processorDataPredecessors: ['source.data'],
        processorResultPredecessors: ['processor.data']
    },
    validate: (graph, expected) => {
        return {
            nodes: Array.from(graph.nodes.keys()).sort(),
            nodeCount: graph.size(),
            processorDataPredecessors: Array.from(graph.getPredecessors('processor.data')).sort(),
            processorResultPredecessors: Array.from(graph.getPredecessors('processor.result')).sort()
        };
    }
};

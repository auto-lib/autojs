// Test: Identify cross-block edges

export default {
    setup: ({ Block, wire, buildCrossBlockGraph, getCrossBlockEdges }) => {
        const b1 = new Block({
            name: 'a',
            functions: { x: 1, y: ($) => $.x + 1 }
        });

        const b2 = new Block({
            name: 'b',
            functions: { x: null, z: ($) => $.x * 2 }
        });

        const wires = [wire('a', 'y', 'b', 'x')];
        const graph = buildCrossBlockGraph([b1, b2], wires);

        return getCrossBlockEdges(graph);
    },
    expected: {
        crossBlockCount: 1,
        edge0From: 'a.y',
        edge0To: 'b.x'
    },
    validate: (edges, expected) => {
        return {
            crossBlockCount: edges.length,
            edge0From: edges[0]?.from,
            edge0To: edges[0]?.to
        };
    }
};

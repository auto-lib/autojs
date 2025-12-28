// Test: Create wire between blocks

export default {
    setup: ({ Wire }) => {
        return new Wire('source', 'data', 'target', 'data');
    },
    expected: {
        fromBlock: 'source',
        fromVar: 'data',
        toBlock: 'target',
        toVar: 'data',
        toString: 'source.data -> target.data'
    },
    validate: (wire, expected) => {
        return {
            fromBlock: wire.fromBlock,
            fromVar: wire.fromVar,
            toBlock: wire.toBlock,
            toVar: wire.toVar,
            toString: wire.toString()
        };
    }
};

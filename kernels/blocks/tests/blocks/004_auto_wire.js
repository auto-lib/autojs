// Test: Auto-wire blocks by matching inputs/outputs

export default {
    setup: ({ Block, autoWire }) => {
        const b1 = new Block({
            name: 'source',
            outputs: ['data'],
            functions: { data: [1, 2, 3] }
        });

        const b2 = new Block({
            name: 'processor',
            inputs: ['data'],
            outputs: ['result'],
            functions: {
                data: null,
                result: ($) => $.data.length
            }
        });

        return autoWire([b1, b2]);
    },
    expected: {
        wireCount: 1,
        wire0: {
            fromBlock: 'source',
            fromVar: 'data',
            toBlock: 'processor',
            toVar: 'data'
        }
    },
    validate: (wires, expected) => {
        const w0 = wires[0];
        return {
            wireCount: wires.length,
            wire0: w0 ? {
                fromBlock: w0.fromBlock,
                fromVar: w0.fromVar,
                toBlock: w0.toBlock,
                toVar: w0.toVar
            } : null
        };
    }
};
